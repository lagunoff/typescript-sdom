[![Generic badge](https://img.shields.io/badge/status-experimental-red.svg)](https://shields.io/)
## Explanation
SDOM stands for Static DOM, just like VirtualDOM, SDOM is a
declarative way of describing GUIs. SDOM solves performance problems
in VirtualDOM by sacrificing some expressiveness. Basically, only the
attributes and the contents of `Text` nodes can change over time, the
    overall shape of DOM tree remains constant, thus Static DOM. The
idea is by [Phil Freeman](https://github.com/paf31) see his
[post](https://blog.functorial.com/posts/2018-03-12-You-Might-Not-Need-The-Virtual-DOM.html)
and purescript
[implementation](https://github.com/paf31/purescript-sdom).

Here is a pseudocode emphasising the difference between VirtualDOM and SDOM approach
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

## Installation
```sh
$ yarn add typescript-sdom
```

## Simplest app
demo: [https://lagunoff.github.io/typescript-sdom/simple/](https://lagunoff.github.io/typescript-sdom/simple/)
```ts
import * as sdom from 'typescript-sdom';
const h = sdom.create<Date, never>();

const view = h.div(
  { style: `text-align: center` },
  h.h1('Local time', { style: date => `color: ` + colors[date.getSeconds() % 6] }),
  h.p(date => date.toString()),
);

const colors = ['#F44336', '#03A9F4', '#4CAF50', '#3F51B5', '#607D8B', '#FF5722'];
const model = { value: new Date() };
const el = view.create(sdom.observable.create(model), msg => {});
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
etc), but the definition of `SDOM` is supposed to work in other
settings as well by changing `El` parameter to the relevant type. The
module [src/observable.ts](src/observable.ts) contains minimal
implementation of subscription-based functionality for dealing with
values that can change over time. `Observable<T>` and
`ObservableValue<T>` are the most important definitions from that
module. `ObservableValue<T>` is the source that contains changing
value and `Observable<T>` provides interface for querying that value
and also to setup notifications for future changes.

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

## Todos
 - [ ] Similar approach for non-web GUIs (ReactNative, QTQuick)
 - [ ] Investigate the possibility of using generator-based effects in `update` e.g. [redux-saga](https://github.com/redux-saga/redux-saga), add examples
 - [ ] Better API and docs for `src/observable.ts`
 - [ ] Add benchmarks
 - [ ] Improve performance for large arrays with https://github.com/ashaffer/mini-hamt

## API reference
<%= TS_NODE_TRANSPILE_ONLY=true ts-node scripts/gendocs.ts src/index.ts %>
