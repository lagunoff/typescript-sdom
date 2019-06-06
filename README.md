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
import create from 'typescript-sdom';
const h = create<Date, never>();

const view = h.div(
  { style: `text-align: center` },
  h.h1({ style: date => `color: ` + colors[date.getSeconds() % 6] }, 'Local time'),
  h.p(date => date.toString()),
);

const colors = ['#F44336', '#03A9F4', '#4CAF50', '#3F51B5', '#607D8B', '#FF5722'];
let model = new Date();
const el = view.create(model);
document.body.appendChild(el);
setInterval(tick, 1000);

function tick() {
  const next = new Date();
  view.update(el, model, next);
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
	    <a href=https://github.com/lagunoff/typescript-sdom/blob/master/examples/todomvc/src/index.ts target=_blank>source</a> |
		<a href=https://lagunoff.github.io/typescript-sdom/todomvc/ target=_blank>demo<a>
	  </td>
    </tr>
  </tbody>
</table>

## Links
- [https://github.com/paf31/purescript-sdom](https://github.com/paf31/purescript-sdom)
- [https://blog.functorial.com/posts/2018-03-12-You-Might-Not-Need-The-Virtual-DOM.html](https://blog.functorial.com/posts/2018-03-12-You-Might-Not-Need-The-Virtual-DOM.html)

## API reference
#### attach

`function attach<Model, Action>(view: SDOM<Model, Action, Node>, rootEl: HTMLElement, model: Model, sink?: (a: Action) => void): SDOMInstance<Model, Action>;`

Start the application and attach it to `rootEl`

```ts
const view = h.div(h.h1('Hello world!', { id: 'greeting' }));
const inst = attach(view, document.body, {});
assert.equal(document.getElementById('greeting').textContent, 'Hello world!');
```

#### elem

`function elem<Model, Action>(name: string, ...rest: Array<string | number | Props<Model, Action, HTMLElement> | SDOM<Model, Action, Node> | ((m: Model) => string)>): SDOM<Model, Action, HTMLElement>;`

Create an html node

```ts
const view = elem('a', { href: '#link' });
const el = view.create({});
assert.instanceOf(el, HTMLAnchorElement);
assert.equal(el.hash, '#link');
```

#### text

`function text<Model, Action>(value: string | number | ((m: Model) => string | number)): SDOM<Model, Action, Text>;`

Create Text node

```ts
const view = text(n => `You have ${n} unread messages`);
let model = 0;
const el = view.create(model);
assert.instanceOf(el, Text);
assert.equal(el.nodeValue, 'You have 0 unread messages');
view.update(el, model, 5);
assert.equal(el.nodeValue, 'You have 5 unread messages');
```

#### array

`function array<Model, Action>(name: string, props?: Props<Model, Action, HTMLElement>): <T extends Array<any>>(selector: (m: Model) => T, child: (h: H<Nested<Model, T[number]>, (idx: number) => Action>) => SDOM<Nested<Model, T[number]>, (idx: number) => Action, Node>) => SDOM<Model, Action, HTMLElement>;`

Create an html node which content is a dynamic list of child nodes

```ts
const view = h.array('ul', { class: 'list' })(
  m => m.list,
  h => h.li(m => m.here),
);
const list = ['One', 'Two', 'Three', 'Four'];
const el = view.create({ list });
assert.instanceOf(el, HTMLUListElement);
assert.equal(el.childNodes[3].innerHTML, 'Four');
```

#### dimap

`function dimap<M1, M2, A1, A2>(coproj: (m: M2) => M1, proj: (m: A1) => A2): (s: SDOM<M1, A1, Node>) => SDOM<M2, A2, Node>;`

Change both type parameters inside `SDOM<Model, Action>`.

#### discriminate

`function discriminate<Model, Action, K extends string>(discriminator: (m: Model) => K, options: Record<K, SDOM<Model, Action, Node>>): SDOM<Model, Action, Node>;`

Generic way to create `SDOM` which content depends on some
condition on `Model`. First parameter checks this condition and
returns a key which points to the current `SDOM` inside `options`
