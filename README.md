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
import * as sdom from '../../src';
const h = sdom.create<Date, never>();

const view = h.div(
  { style: `text-align: center` },
  h.h1({ style: date => `color: ` + colors[date.getSeconds() % 6] }, 'Local time'),
  h.p(date => date.toString()),
);

const colors = ['#F44336', '#03A9F4', '#4CAF50', '#3F51B5', '#607D8B', '#FF5722'];
const model = sdom.observable.valueOf(new Date());
const el = view.create(sdom.observable.create(model), sdom.noop);
document.body.appendChild(el);
setInterval(tick, 1000);

function tick() {
  sdom.observable.step(model, new Date());
}
```

## Representation 
Simplified definitions of the main data types:
```ts
export type SDOM<Model, Msg, El> = {
  create(o: Observable<Model>, sink: Sink<Msg>): El;
};
export type Sink<T> = (x: T) => void;
export type Observable<T> = { subscribe: Subscribe<{ prev: T; next: T; }>>; getValue(): T; }; 
export type Subscribe<T> = (onNext: (x: T) => void, onComplete: () => void) => Unlisten;
export type Unlisten = () => void;
export type Subscription<T> = { onNext: (x: T) => void; onComplete: () => void; };
export type ObservableValue<T> = { value: T; subscriptions?: Subscription<{ prev: T; next: T }>>[]; };
```

`SDOM<Model, Msg, El>` describes a piece of UI that consumes data of
type `Model` and produces events of type `Msg` also value of type `El`
is the end-product of running `SDOM` component, in case of browser
apps `El` is a subset of type `Node` (could be Text, HTMLDivElement
etc), but the definition of `SDOM` is supposed to work in other setups
as well by changing `El` parameter to the relevant type. This library
has module `src/observable.ts` that implements minimal
subscription-based functionality for delaing with values that can
change over time. `Observable<T>` and `ObservableValue<T>` are the
most important definitions from that module. `ObservableValue<T>` is
the source that contains changing value and `Observable<T>` provides
interface for querying that value and also to setup notifications for
future changes.

## Examples

<table>
  <tbody>
    <tr>
      <td>Simple app</td>
      <td>
	    <a href=./examples/simple/index.ts target=_blank>source</a> |
		<a href=https://lagunoff.github.io/typescript-sdom/simple/ target=_blank>demo<a>
	  </td>
    </tr>
    <tr>
      <td>Variants</td>
      <td>
	    <a href=./examples/variants/index.ts target=_blank>source</a> |
		<a href=https://lagunoff.github.io/typescript-sdom/variants/ target=_blank>demo<a>
	  </td>
    </tr>
    <tr>
      <td>TodoMVC</td>
      <td>
	    <a href=./examples/todomvc/src/index.ts target=_blank>source</a> |
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

`function attach<Model, Msg, Elem extends Node>(view: SUI<Model, Msg, Elem>, rootEl: HTMLElement, init: Model, sink?: (a: Msg) => void): SDOMInstance<Model, Msg, Elem>;`

Start the application and attach it to `rootEl`

```ts
const view = h.div(h.h1('Hello world!', { id: 'greeting' }));
const inst = sdom.attach(view, document.body, {});
assert.equal(document.getElementById('greeting').textContent, 'Hello world!');
```

#### elem

`function elem<Model, Msg>(name: string, ...rest: Array<string | number | Props<Model, Msg, HTMLElement> | SUI<Model, Msg, Node> | ((m: Model) => string)>): SUI<Model, Msg, HTMLElement>;`

Create an html node

```ts
const view = sdom.elem('a', { href: '#link' });
const el = view.create(sdom.observable.of({}), sdom.noop);
assert.instanceOf(el, HTMLAnchorElement);
assert.equal(el.hash, '#link');
```

#### text

`function text<Model, Msg>(value: string | number | ((m: Model) => string | number)): SUI<Model, Msg, Text>;`

Create Text node

```ts
const view = sdom.text(n => `You have ${n} unread messages`);
const model = sdom.observable.valueOf(0);
const el = view.create(sdom.observable.create(model), sdom.noop);
assert.instanceOf(el, Text);
assert.equal(el.nodeValue, 'You have 0 unread messages');
sdom.observable.step(model, 5);
assert.equal(el.nodeValue, 'You have 5 unread messages');
```

#### array

`function array<Model, Msg>(name: string, props?: Props<Model, Msg, HTMLElement>): <T extends Array<any>>(selector: (m: Model) => T, child: (h: H<Nested<Model, T[number]>, (idx: number) => Msg>) => SUI<Nested<Model, T[number]>, (idx: number) => Msg, Node>) => SUI<Model, Msg, HTMLElement>;`

Create an html node which content is a dynamic list of child nodes

```ts
const view = h.array('ul', { class: 'list' })(
  m => m.list,
  h => h.li(m => m.here),
);
const list = ['One', 'Two', 'Three', 'Four'];
const el = view.create(sdom.observable.of({ list }), sdom.noop);
assert.instanceOf(el, HTMLUListElement);
assert.equal(el.childNodes[3].innerHTML, 'Four');
```

#### dimap

`function dimap<M1, M2, A1, A2>(coproj: (m: M2) => M1, proj: (m: A1) => A2): <UI>(s: SUI<M1, A1, UI>) => SUI<M2, A2, UI>;`

Change both type parameters inside `SDOM<Model, Msg>`.

```ts
 type Model1 = { btnTitle: string };
 type Msg1 = { tag: 'Clicked' };
 type Model2 = string;
 type Msg2 = 'Clicked';
 let latestMsg: any = void 0;
 const view01 = sdom.elem<Model2, Msg2>('button', (m: Model2) => m, { onclick: () => 'Clicked'});
 const view02 = sdom.dimap<Model1, Msg1, Model2, Msg2>(m => m.btnTitle, msg2 => ({ tag: 'Clicked' }))(view01);
 const el = view02.create(sdom.observable.of({ btnTitle: 'Click on me' }), msg => (latestMsg = msg));
 el.click();
 assert.instanceOf(el, HTMLButtonElement);
 assert.equal(el.textContent, 'Click on me');
 assert.deepEqual(latestMsg, { tag: 'Clicked' });
```

#### discriminate

`function discriminate<Model, Msg, El extends Node, K extends string>(discriminator: (m: Model) => K, options: Record<K, SUI<Model, Msg, El>>): SUI<Model, Msg, El>;`

Generic way to create `SDOM` which content depends on some
condition on `Model`. First parameter checks this condition and
returns a key which points to the current `SDOM` inside `options`

```ts
 type Tab = { tag: 'Details', info: string } | { tag: 'Comments', comments: string[] };
 type Model = { tab: Tab };
 const view = h.div(sdom.discriminate(m => m.tab.tag, {
     Details: h.p({ id: 'details' }, m => m.tab.info),
     Comments: h.p({ id: 'comments' }, m => m.tab.comments.join(', ')),
 }));
 const model = sdom.observable.valueOf({ tab: { tag: 'Details', info: 'This product is awesome' } });
 const el = view.create(sdom.observable.create(model), sdom.noop);
 assert.equal(el.childNodes[0].id, 'details'); 
 assert.equal(el.childNodes[0].textContent, 'This product is awesome');
 sdom.observable.step(model, { tab: { tag: 'Comments', comments: [] } });
 assert.equal(el.childNodes[0].id, 'comments');
```
