# Work-In-Progress nothing works yet

Virtual DOM vs SDOM aproach:
```ts
type Model = { text: string; active: boolean };

// The whole tree is recomputed on each render
const virtualdom = (model: Model) => h.div({ class: model.active ? 'active' : '' },
  h.span(model.text)
);

// Only the props and the text nodes are recomputed
const sdom = h.div({ class: model => model.active ? 'active' : '' },
  h.span(model => model.text)
);
```

## Explanation
`SDOM` stands for Static DOM, like VirtualDOM this is a technique used
to declaratively describe GUIs. SDOM solves performance problems in
VirtualDOM by sacrificing some expressiveness. Basically, only the
attributes and content of the `Text` nodes can change over time, the
shape of DOM tree remains constant, thus `Static DOM`. The idea is by
[Phil Freeman](https://github.com/paf31) see his
[post](https://blog.functorial.com/posts/2018-03-12-You-Might-Not-Need-The-Virtual-DOM.html)
and purescript
[implementation](https://github.com/paf31/purescript-sdom).

## Simplest app
```ts
const view = h.div(
  { style: `text-align: center` },
  h.h1('Local time', { style: d => `color: ` + colors[d.getSeconds() % 6] }),
  h.p(h.text(d => d.toString()))
);

const colors = ['#F44336', '#03A9F4', '#4CAF50', '#3F51B5', '#607D8B', '#FF5722'];
let model = new Date();
const el = view(null, model);
document.body.appendChild(el);
setInterval(tick, 1000);

function tick() {
  const prev = { input: model, output: el }, next = new Date();
  view(prev, next);
  model = next;
}

```

## Representation 
Simplified definitions of the main data types:
```ts
type SDOM<Model, Action> = Derivative<Model, HTMLElement>;
type Derivative<Input, Output> = (prev: Prev<Input, Output>|null, next: Input|null) => Output;
type Prev<Input, Output> = { input: Input, output: Output };
```

```ts
const 
const el = view(null, model); // Create new output
const newEl = view({ input: model, output: el }, newModel); // Update output
view({ input: model, output: el }, null); // Free resources
```

Input is immutable and `Output` can be changed in-place. `SDOM` is
defined in terms of `Derivative` and it simply a `Derivative` from
application Model to DOM nodes.

## Examples

<table>
  <tbody>
    <tr>
      <td>TodoMVC</td>
      <td>
	    <a href="https://github.com/lagunoff/typescript-sdom/blob/master/examples/todomvc/src/index.ts" target="_blank">source</a> |
		<a href="https://lagunoff.github.io/typescript-sdom/todomvc/" target="_blank">demo<a>
	  </td>
    </tr>
  </tbody>
</table>

## Links
- [https://github.com/paf31/purescript-sdom](https://github.com/paf31/purescript-sdom)
- [https://blog.functorial.com/posts/2018-03-12-You-Might-Not-Need-The-Virtual-DOM.html](https://blog.functorial.com/posts/2018-03-12-You-Might-Not-Need-The-Virtual-DOM.html)

## API reference
<%= TS_NODE_TRANSPILE_ONLY=true ts-node scripts/gendocs.ts src/sdom.ts %>
