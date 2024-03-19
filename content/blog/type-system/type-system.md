---
title: "Type system of the React compiler"
author: "[சத்யா குணசேகரன் (Sathya Gunasekaran)](https://twitter.com/_gsathya)"
date: 2024-03-19 16:45:37
tags:
  - Forget
  - React
  - Compiler
description: "The post describes how the type system of the React compiler is implemented and used"
---

{%- css %}{% include "public/css/message-box.css" %}{% endcss %}

<div class="message-box">
	<p><em>If you're wondering what the React compiler is, I recommend reading our recent <a href="https://react.dev/blog/2024/02/15/react-labs-what-we-have-been-working-on-february-2024#react-compiler">update post</a> for some background. This post is for anyone curious about the compiler theory behind it. Don't feel pressured to understand everything in this post to use the compiler. </em></p>
</div>

## Memo the props

In React, a component wrapped in [React.memo](https://react.dev/reference/react/memo) only re-renders if its props change.

```js
const Greeting = memo(function Greeting({ user }) {
  return (
    <h1>
      Hello, {user.firstName} {user.lastName}!
    </h1>
  );
});
```

`Greeting` re-renders whenever its prop, `user` _changes_. React uses [shallow comparison](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is) to determine if the props have changed.

In JavaScript, objects must maintain their identity to make the shallow comparison work, which is why [memoization can be cruical](https://react.dev/reference/react/memo#minimizing-props-changes). On the other hand, primitive values don't have any identity associated with them and can simply be compared directly.

```js
Object.is({}, {}); // false
Object.is(3, 3); // true
```

Consider a simple component that calculates a total based on props:

```js
function Price({ items, state }) {
  const subTotal = calculateSubTotal(items);
  const tax = calculateTax(subTotal, state);
  const total = subTotal + tax;
  return <Text text={total} />;
}
```

One naive way to prevent `Text` from re-rendering unnecessarily would be memoize everything like this:

```js
function Price({ items, state }) {
  const subTotal = useMemo(() => calculateSubTotal(items), [items]);
  const tax = useMemo(() => calculateTax(subTotal, state), [subTotal, state]);
  const total = useMemo(() => subTotal + tax, [subTotal, tax]);
  return <Text text={total} />;
}
```

However, we don't really need to memoize primitives for shallow comparison. The memoization here is wasteful from both a memory and a bundle size perspective.

Can we teach the React compiler that these are primitive values? The React compiler could perform whole program analysis by compiling _all_ the files, including the files containing `calculateSubTotal` and `calculateTax` to understand that they return a number. But, single file analysis has a bunch of really nice advantages like better performance, incremental rollout and lower compiler complexity.

Can the compiler _infer_ that these are numbers from the way they are used?

## Type inference

One of the most classical type systems is the [Hindley Milner type system](https://en.wikipedia.org/wiki/Hindley%E2%80%93Milner_type_system) that's typically used in functional languages. The type inference in the React compiler is inspired by the [Algorithm W](https://en.wikipedia.org/wiki/Hindley%E2%80%93Milner_type_system#Algorithm_W) of this type system, but it's much simpler because JavaScript is too dynamic for sound typing. I'll briefly describe the various steps as implemented by the React compiler.

### Initializing the type variables

During the initial lowering from JavaScript source to the compiler's intermediate representation, every identifier gets an associated `Type` variable to store the type. A `Type` variable is just like any other variable but instead of storing values, we store types in them.

```ts
type Type = { kind: "type"; id: number } | { kind: "Primitive" };
// { kind: "Type", id: number } represents a type variable
// { kind: "Primitive" } represents a primitive type

let total; // identifier: { name: 'total', type: { kind: "Type", id: 0 } }
```

`{ kind: "Type", id: 0 }` is the Type variable associated with the identifier `total`.

### Generating the type equations

Rather than specifying the type system in scary and not so accessible formal notation, I'll try to explain one of the typing rules using our earlier example.

```js
const total = subTotal + tax;
```

The above statement can be typed by saying that the operands of a `BinaryExpression` with an `Arithmetic` operator are primitives and the resulting value is also a primitive. In our example, `subTotal` and `tax` are the operands, the operator is `+` and the return value is `total`.

```js
const total = subTotal + tax;
// subTotal -> primitive
// tax      -> primitive
// total    -> primitive
```

<div class="message-box">
	<p><em>It's possible to use non-primitives as operands of a <code>BinaryExpression</code> in JavaScript but this has been a safe assumption in practice.</em></p>
</div>

The first step of the type inference pass is to generate type equations based on the typing rules defined by the compiler. A type equation is simply a statement of equality between two types, like a mathematical equation. A simple type equation can be of the form "`left = right`", where `left` and `right` are types.

In code, it can be as simple as an object with two fields representing the left hand side and right hand side of the equation, like this:

```ts
type TypeEquation = {
  left: Type;
  right: Type;
};
```

And concretely, the typing rule we defined above can be generated like this:

```js
function* generateTypeEquationsForBinaryExpression(instruction) {
  const { operands, lvalue } = instruction;

  yield { left: operand[0].type, right: { kind: "Primitive" } };
  // subTotal -> primitive

  yield { left: operand[1].type, right: { kind: "Primitive" } };
  // tax -> primitive

  yield { left: { lvalue.type }, right: { kind: "Primitive" } };
  // total -> primitive
}
```

Similarly type equations can be generated for other constructs in JavaScript
like function application (ie, function call), and if-statements.

### Solving the equations

The process of solving these type equations is called
[unification](<https://en.wikipedia.org/wiki/Unification_(computer_science)>).
The unification process attempts to find a substitution of type variables that
makes all the type equations true.

Solving the type equations for our example are pretty straightforward. The type variables for `subTotal`, `tax` and `total` can directly be substituted by the primitive type.

But consider the earlier statement that defines and initializes `subTotal`:

```js
const subTotal = calculateSubTotal(items);
```

At the point of defining `subTotal`, we don't know its type. Only after we look
at the usage of `subTotal` have we inferred that this is a primitive.

But in this type inference, the types flow back to the definition as well. We go back to the definition and notice that the return type of the function `calculateSubTotal` must be the same type as `subTotal`. And by solving this, we've now inferred that the return type of `calculateSubTotal` must be a primitive.

This is an example of how incredibly powerful type inference can be! We've inferred the return type of a function that exists in a separate compilation unit without having looked at it's implementation. Type systems often use this inference to boostrap and quickly start expanding inference across an untyped codebase.

But it does come with a significant downside -- if the inference is incorrect,
it results in a surprising “action-at-a-distance” behaviors. This is why
[Flow](https://flow.org/) moved to [local type
inference](https://medium.com/flow-type/local-type-inference-for-flow-aaa65d071347),
trading more explicit type annotations for better errors.

<div class="message-box">
	<p><em> We could've made the compiler use the type information from Typescript or Flow, but we wanted to make sure it worked well for untyped JavaScript too. We do plan to add support for these type systems in the future for more optimal memoization.</em></p>
</div>

## (Don't) Memo the props

Now, going back to our original example of the `Price` component, the compiler can
infer that all the values are primitives and there's actually no need to memoize
`total`, `subTotal` or `tax` in this `Price` component, saving bundle size and
memory!

```js
function Price(t0) {
  const $ = useMemoCache(2);
  const { items, state } = t0;
  const subTotal = calculateSubTotal(items);
  const tax = calculateTax(subTotal, state);
  const total = subTotal + tax;
  let t1;

  if ($[0] !== total) {
    t1 = <Text text={total} />;
    $[0] = total;
    $[1] = t1;
  } else {
    t1 = $[1];
  }

  return t1;
}
```

## Typing React

Once we had the type system, it quickly became clear that we could use it as a platform to do various other analysis too.

Adding validations for certain rules of react became as easy as adding a few typing rules to our type system. For example, rather than building separate validations for each React API, just adding the typing rules for `useState` hook gives us this validation:

```js
  1 | const [state, setState] = useState({ foo: { bar: {} } });
  2 | const foo = state.foo;
> 3 | foo.bar = 1;
    | ^^^ InvalidReact: Mutating a value returned from 'useState()',
          which should not be mutated. Use the setter function to
          update instead.
```

Note how even interior mutability is caught here -- not just simply a modification to `state`, but a modification to `state.foo` through an aliased variable (`foo`).

## Further reading

If you're curious to learn more about type systems, the original Hindley Milner
type system papers and the more recent [Local Type
Inference](https://arxiv.org/abs/1306.6032) paper are great places to start.

If you're curious to read more about compiler theory in the React compiler, take
a look at the [other tagged posts](/tags/forget/).
