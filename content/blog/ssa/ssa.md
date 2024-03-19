---
title: "Compiler Theory and Reactivity"
author: "[சத்யா குணசேகரன் (Sathya Gunasekaran)](https://twitter.com/_gsathya)"
date: 2024-02-22 16:45:37
tags:
  - Forget
  - React
  - Compiler
description: "The post describes how the React Compiler uses SSA form for fine grained reactivity"
---

{%- css %}{% include "public/css/message-box.css" %}{% endcss %}

<div class="message-box">
	<p><em>If you're wondering what the React compiler is, I recommend reading our recent <a href="https://react.dev/blog/2024/02/15/react-labs-what-we-have-been-working-on-february-2024#react-compiler">update post</a> for some background. You don't need to understand everything in this post to use the compiler. So, don't worry if some parts are unclear.</em></p>
</div>

The React compiler implements numerous traditional compiler transformations,
that are generally not accessible without having some background in compiler
theory. In this post, I'll try to provide a more accessible explanation of a compiler pass called Static Single
Assignment form (SSA) using examples.

Consider this simple React component:

```js
function Component({ colours }) {
	let styles = { colours };
	return <Item styles={styles} />;
}
```

We can easily memoize it like this:

```js
function Component(props) {
	const $ = useMemoCache(2);
	const { colours } = props;
	let t0;

	if ($[0] !== colours) {
		t0 = { colours };

		$[0] = colours;
		$[1] = t0;
	} else {
		t0 = $[1];
	}

	const styles = t0;
	return <Item styles={styles} />;
}
```

The compiler can track the `styles` object being created and passed down as props.

<div class="message-box">
	<p><em>Don't worry too much about the useMemoCache hook, it's an internal API used by the compiler to cache values. Think of `$` as an array.</em></p>

  <p><em>The React Compiler can memoize JSX too, but I'm leaving it out in this post for brevity.</em></p>
</div>

Now, let's say you want to refactor the styles based on a condition.

```js
function Component({ colours, hover, hoverColours }) {
	let styles;
	if (!hover) {
		styles = { colours };
	} else {
		styles = { colours: hoverColours };
	}
	return <Item styles={styles} />;
}
```

Memoizing the ` styles` object becomes a bit more challenging for the compiler
because it's no longer a single statement. It's spread across several
statements, and there's control flow involved -- styles is created in both the
`if` and `else` block.

The compiler can still track styles creation across both blocks and memoize it like this:

```js
function Component(props) {
	const $ = useMemoCache(4);
	const { hover, colours, hoverColours } = props;
	let styles;

	if ($[0] !== hover || $[1] !== colours || $[2] !== hoverColours) {
		if (!hover) {
			styles = { colours };
		} else {
			styles = { colours: hoverColours };
		}

		$[0] = hover;
		$[1] = colours;
		$[2] = hoverColours;
		$[3] = styles;
	} else {
		styles = $[3];
	}

	return <Item styles={styles} />;
}
```

This works, but it's not ideal because we'd invalidate the memoized value if any of `hover`, `colours` or `hoverColours` changes. It's too _coarse grained_. Can we do better?

### Track values, not variables

One core intuition is that we'd memoize the values in the `if` block separately from the `else` block. They are separate _values_ (separate _objects_), just being referenced by the same variable identifier (`styles`).

Consider our previously example, but slightly modified to track the value separately by giving them different identifiers:

```js
let styles;
if (!hover) {
  t0 = { colours };              // <-- separate value
} else {
  t1 = { colours: hoverColours}; // <-- separate value
}
styles = choose(t0 or t1);
```

Now, it's pretty clear that we can memoize `t0` and `t1` separately. You've also realized that we need to choose between `t0` and `t1` and assign it correctly to `styles`, but let's ignore that for now.

The compiler can memoize the values in their respective blocks:

```js
if (!hover) {
	if ($[0] !== colours) {
		t0 = {
			colours,
		};
		$[0] = colours;
		$[1] = t0;
	} else {
		t0 = $[1];
	}
} else {
	if ($[2] !== hoverColours) {
		t1 = {
			colours: hoverColours,
		};
		$[2] = hoverColours;
		$[3] = t1;
	} else {
		t1 = $[3];
	}
}
styles = choose(t0 or t1)
```

This is more _fine grained_ than the previous example.

### Where's the complexity?

But, wait, we're just memoizing a value in the scope it was created, what's so hard about it?

Well, let's consider another example:

```js
function Component({ colours, hover, hoverColours }) {
	let styles;
	if (!hover) {
		styles = { colours };
	} else {
		styles = { colours: hoverColours };
	}
	styles.height = "large"; // <-- modifying styles object
	return <Item styles={styles} />;
}
```

In the above example, we modify the `styles` object after the `if-else` block by
adding a new property named `height`. It's no longer safe to memoize the values
inside the `if`-block and `else`-block separately.

We can't modify a value after it's memoized. Not because it's sub-optimal performance-wise, but because it leads to incorrect behavior during re-rendering. Take a minute to think about how this behavior can manifest in practice.

We need a way to track the values as they _flow_, not just simply memoize it in the scope they are created.

<div class="message-box">
 <p><em>One could argue that you shouldn't be writing code like this. But, local mutations are very natural in JavaScript and there's plenty of React code written like this that we need to compile efficiently.</em></p>
</div>

### Track the flow

Remember the "`choose`" function, we ignored earlier? This lets the compiler track the values as they flow across if-else block!

```js
if (!hover) {
  t0 = { colours };
} else {
  t1 = { colours: hoverColours};
}
styles = choose(t0 or t1); // <-- tracks values after control flow
styles.height = 'large';
```

Now, the code (or to be precise, the compiler's [intermediate representation](https://en.wikipedia.org/wiki/Intermediate_representation)) tells the compiler that `styles` is either `t0` or `t1` and modifying `styles` is equivalent to modifying the values `t0` and `t1`.

The compiler can now infer that the `styles` can only be memoized at a coarser level like this:

```js
if ($[0] !== hover || $[1] !== colours || $[2] !== hoverColours) {
	if (!hover) {
		styles = {
			colours,
		};
	} else {
		styles = {
			colours: hoverColours,
		};
	}

	styles.height = "large";
	$[0] = hover;
	$[1] = colours;
	$[2] = hoverColours;
	$[3] = styles;
} else {
	styles = $[3];
}
```

### Compiler theory

To recap, we've talked about tracking values separately with temporary identifiers and tracking the values across control flow with a "choose" function.

Interestingly, a classical compiler transformation called [Static single-assignment form](https://en.wikipedia.org/wiki/Static_single-assignment_form) (SSA) does exactly this! Tracking new values and re-assignments by creating a new temporary value is the core part of the SSA transform. The "_choose_" function we talked about earlier is simply the "_phi_" (Φ) function defined in the SSA form.

The exact SSA transformation that the React compiler uses is from the excellent [Simple and Efficient Construction of Static Single
Assignment Form](https://c9x.me/compile/bib/braun13cc.pdf) paper.

If you're curious to read more about compiler theory in the React compiler, take
a look at the [other tagged posts](/tags/forget/).
