---
title: "Alias analysis in React Compiler"
author: "[சத்யா குணசேகரன் (Sathya Gunasekaran)](https://twitter.com/_gsathya)"
date: 2024-01-22 11:45:30
tags:
  - Forget
  - React
  - Compiler
description: "The post describes the complexities of alias analysis in the React Compiler"
---

{%- css %}{% include "public/css/message-box.css" %}{% endcss %}

<div class="message-box">
	<p><em>This post was originally published as a comment on the <a href="https://www.reddit.com/r/reactjs/">r/reactjs</a> subreddit.</em></p>
</div>

Forget supports almost all of the JavaScript language including all of it's idiosyncrasies. Forget is backwards compatible, so we have to work with existing code and not introduce new constraints -- this makes it a lot harder.

<div class="message-box">
	<p><em><a href="https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023#react-optimizing-compiler">Forget</a> was the code name for the React Compiler.</em></p>
</div>

One concrete example that looks simple enough but is actually really tricky to get right is aliasing, consider this example:

```js
function Component({ a, b }) {
	const x = [];
	x.push(a);

	return <Foo x={x} />;
}
```

This seems simple enough to memoize with a compiler, the output should be something like this:

```js
function Component({ a, b }) {
	const x = useMemo(() => {
		const x = [];
		x.push(a);
		return x;
	}, [a]);

	return <Foo x={x} />;
}
```

The entire computation of `x` is wrapped in a `useMemo` and cached. Simple enough.

What happens if you alias `x` to some other variable?

```js
function Component({ a, b }) {
	const x = [];
	x.push(a);

	const y = x;
	y.push(b);

	return <Foo x={x} />;
}
```

Now, it's no longer enough to simply memoize the computation of x separately like we did previously:

```js
// incorrect
function Component({ a, b }) {
	const x = useMemo(() => {
		const x = [];
		x.push(a);
		return x;
	}, [a]);

	const y = useMemo(() => {
		const y = x;
		y.push(b);
		return y;
	}, [x, b]);

	return <Foo x={x} />;
}
```

### Memoization must be correct

Note that the second example with the two memos is incorrect not because it's
suboptimal, but because it is logically incorrect. If you re-render the component with the same `a` but different `b`, then `x` will be `[a,b,b]` not `[a, b]` as you might expect, leading to bugs.

This is why it's all or nothing -- either we compile this correctly or skip compiling this component entirely.

If there are too many bailouts then Forget is not very useful, so it's a careful balance that we're trying to get right by experimenting internally at Meta with various projects.

The correct way to memoize this is to group the computation together:

```js
function Component({ a, b }) {
	const x = useMemo(() => {
		const x = [];
		x.push(a);

		const y = x;
		y.push(b);
		return y;
	}, [a, b]);

	return <Foo x={x} />;
}
```

This is already bit trickier than without aliasing, but this is still just straight line code. Imagine if we had control flow in between, or if this escapes to an object or some random function call? It gets much trickier. Forget can't simply bail out and refuse to compile this case as we want to be backwards compatible.

[Alias analysis](https://en.wikipedia.org/wiki/Alias_analysis) on it's own is a
huge topic in compiler analysis. There's several other bits of compiler analysis
like this in Forget to make it work with vanilla JavaScript.
