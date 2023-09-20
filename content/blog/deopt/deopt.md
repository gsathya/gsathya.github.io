---
title: "Side effecting a deopt"
author: "[Sathya Gunasekaran](https://twitter.com/_gsathya)"
date: 2023-09-19 13:33:37
tags:
  - v8
description: "This article explains how a deoptimisation can occur as a side effect in Javascript, especially in v8."
imageUrl: "deopt-snippet.png"
---

{%- css %}{% include "public/css/message-box.css" %}{% endcss %}

All popular JavaScript engines ship with optimising compilers (often, several
optimising compilers). As a consequence of _speculatively_ optimising a
JavaScript function, some of these speculations might get invalidated causing a
JavaScript function to be de-optimised back to (potentially) slower code.

I had an interesting chat with a [colleague](https://twitter.com/zmofei) about the curious case of functions
deoptimising _without_ being invoked. While prepping for a [talk](https://www.reactindia.io/speakers/sathya-gunasekaran), I got sidetracked and wrote this post.

## The playground

Let's look at a simple `load` function that loads a known property from an object and returns it.

```javascript
const x = { foo: 1 };

function load() {
	return x.foo;
}
```

Now, let's run this `load` in a loop to trigger our friendly optimising compilers.

```javascript
function bench() {
	let sum = 0;
	for (let i = 0; i < 10e6; i++) {
		sum += load();
	}
	return sum;
}

bench(); // optimise `load`
```

Sure enough, v8 spews logging to confirm.

```bash
❯ ~/.jsvu/v8-debug --trace-opt test.js | grep load
[marking <JSFunction load for optimization to MAGLEV]
[compiling method <JSFunction load> (target MAGLEV)]
[completed compiling <JSFunction load> (target MAGLEV)]
```

<div class="message-box">
	<p>v8 has <a href="https://blog.chromium.org/2023/06/how-chrome-achieved-high-scores-on.html">several tiers of optimising compilers</a>, we're only looking at Maglev code here as Turbofan simply inlines <code>load</code> into <code>bench</code>, which isn't very interesting for our purposes.</p>
</div>

## Side effecting a deopt

Now that we've got our playground setup, let's try to side effect a deopt by updating the value of `foo`:

```javascript
bench(); // optimise `load`

x.foo = 5; // update value of 'foo'
```

Does this cause a deopt?

```bash
❯ ~/.jsvu/v8-debug --trace-deopt test.js | grep load
[marking dependent code <load> for deoptimization, reason: code dependencies]
```

Yes!

There's a fair amount of information online on how [hidden classes transitions](https://mathiasbynens.be/notes/shapes-ics) cause inline caches to become polymorphic, but this is different. We haven't changed the hidden class of `x` -- we've only updated the value of an existing property.

Let's dig into the generated code to see what's happening here.

```armasm
...
0x280008150   130  d2800040       movz x0, #0x2
...
```

Looks like v8 has completely inlined the property load, and replaced it with the value of the property!

<div class="message-box">
	<p>The value is <code>0x2</code>, and not <code>0x1</code> because it's been <a href="https://en.wikipedia.org/wiki/Tagged_pointer">tagged</a>.</p>
</div>

Alright, the deopt is starting to make sense because the optimised code simply returns the old value, not the new one. To protect against incorrect code, v8 has installed a dependency on the value of the `foo` property and triggers a deopt when the dependency is invalidated.

Wouldn't it be better if v8 just loaded the property at runtime, rather than inlining the value of the property?

Let's ask v8 to re-optimise `load`, after changing the value of `foo`.

```javascript
bench(); // optimise load

x.foo = 5;
console.log("re-optimising load");
bench();
```

The optimised code looks different now!

```armasm
...
0x28001bfbc    fc  580008e0       ldr x0, pc+284 (addr 0x000000028001c0d8)
--   8: LoadTaggedField(0xc, decompressed)
...
```

v8 has learnt that this value isn't a constant, and it's not a good idea to
inline the value directly. Of course, inlining the value is strictly better
because it's faster, but only when value doesn't change. Otherwise we're going
to be stuck in a loop deoptimising and re-optimising.

To double check, let's change the value once again.

```javascript
bench(); // optimise `load`

x.foo = 5; // causes a deopt
console.log("re-optimising load");
bench();

x.foo = 6; // another deopt?
```

Does this deopt now?

```bash
❯ ~/.jsvu/v8-debug --trace-deopt test.js | grep load
deoptimising load
[marking dependent code <load> for deoptimization, reason: code dependencies]
re-optimising load
```

No! v8 simply loads the property at runtime.

## Expandos considered harmful

The general JS performance tip is to not change the shape of an object after it's constructed. This is pretty good advice, and it's mostly given in the context of not [polluting inline caches leading to poly/megamorphic caches](https://mrale.ph/blog/2015/01/11/whats-up-with-monomorphism.html).

There's another reason that's often overlooked. Changing a hidden class can cause deopts.

Let's go back to our playground.

```javascript
bench(); // optimise `load`

x.__expando = 2; // hidden class transition
```

Notice how after adding the [expando](https://developer.mozilla.org/en-US/docs/Glossary/Expando), we haven't invoked `load` nor have we changed the value of `foo`. Does this still cause a deopt?

```bash
❯ ~/.jsvu/v8-debug --trace-deopt test.js | grep load
[marking dependent code <load> for deoptimization, reason: code dependencies]
```

Sure enough. This is because we've not only got a dependency on the value of the property, but also on the hidden class of the object.

Let's look at slightly more ~~terrifying~~ baffling example.

```javascript
bench(); // optimise `load`

const y = { foo: 1 };
y.__expando = 4;
```

We've created a new object `y` that does not share anything with `x` (other than the builtin object prototype). We're not changing anything in the prototype of `y` or `x`, not updating `x`, and not calling `load`. There can't be any hidden class transitions in `x`, so this shouldn't deopt, right?

```bash
❯ ~/.jsvu/v8-debug --trace-deopt test.js | grep load
[marking dependent code <load> for deoptimization, reason: code dependencies]
```

This still deopts!

I _lied_ when I said `x` and `y` don't share anything -- they share the same
[hidden class](https://v8.dev/docs/hidden-classes)! Adding an expando on `y`
causes the shared hidden class to become unstable. The optimised code not only
depends on the value of the property and the hidden class, but also on the
_stability_ of the hidden class.

But, why does the stability matter? The answer to any question in the v8 codebase is
simply -- _performance_ -- stable maps help generate better, more optimised
code. Seth goes into more detail about stable maps
[here](https://www.mail-archive.com/v8-dev@googlegroups.com/msg160069.html), if
you're curious.

## Takeaways

There's a whole slew of [other
reasons](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/compiler/compilation-dependencies.cc;l=22-41;drc=a6bdc8f2993883fc55eb9cb0945694299b056675)
that could side effect a deopt. v8 calls
this category of deopts as _lazy_ deopts (as opposed to _eager deopts_).

I don't think this is necessarily a reason to entirely stop using expandos and
switch to using WeakMaps -- WeakMaps come with other tradeoffs.

The best JS performance tip is to write code that expresses intent clearly and let the engine optimise it.
