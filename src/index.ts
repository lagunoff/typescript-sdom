import { PrimMsg } from './message';
import * as messages from './message';
import * as store from './store';
import { Store, StoreSource, Updates } from './store';
import { Lens, Lens1 } from './optic';

export { store, messages };

/**
 * An alias for `elem`. Also a namespace for the most [common html
 * tags](./src/html.ts) and all public API. All functions exposed by
 * `h` have their `Model` and `Msg` parameters bound, see docs for
 * `create`, see also [todomvc](examples/todomvc/src/index.ts) for
 * usage examples
 */
export const h = function h() {
  return element.apply(void 0, arguments);
} as any as H<unknown, unknown, unknown>;

import './html';
export * from './html';
import { Props } from './html';

/**
 * `SDOM<In, Out, Msg, Elem>` constructor for dynamic `Elem` node
 * 
 * @param Model type for data component needs to display itself
 * @param Msg type for messages component can fire during its lifecycle
 * @param Elem type of DOM node which will be constructed on 
 */
export type SDOM<In, Out, Msg, Elem extends Node = Node> = {
  create(model: Store<In>, sink: Sink<PrimMsg<In, Out, Msg, Elem>>): Elem;
};
export type HSDOM<In, Out, Msg, Elem extends Node = Node> = (h: H<In, Out, Msg>) => SDOM<In, Out, Msg, Elem>;
export type Sink<T> = (x: T) => void;
export type Interpreter<In, Out, Msg1, Msg2, Elem extends Node = Node> = (store: Store<In>, sink: Sink<PrimMsg<In, Out, Msg2, Elem>>) => Sink<PrimMsg<In, Out, Msg1, Elem>>;

/**
 * Type for `h` helper
 */
export interface H<In, Out, Msg> {
  (name: string, ...rest: Array<Props<In, Out, Msg>|SDOM<In, Out, Msg>|string|number|((m: In) => string)>): SDOM<In, Out, Msg, HTMLElement>;
  text(content: string|number|((m: In) => string|number)): SDOM<In, Out, Msg, Text>;
  array<Msg, X>(lens: Lens<In, Out, X[], X[]>, name: string, props?: Props<In, Out, Msg>): (child: SDOM<Nested<In, X>, X, ItemMsg<Msg>>) => SDOM<In, Out, Msg, HTMLElement>;
  arrayH<Msg, X>(lens: Lens<In, Out, X[], X[]>, name: string, props?: Props<In, Out, Msg>): (child: HSDOM<Nested<In, X>, X, ItemMsg<Msg>>) => SDOM<In, Out, Msg, HTMLElement>;
  discriminate<K extends string>(discriminator: (m: In) => K, variants: Record<K, SDOM<In, Out, Msg>>): SDOM<In, Out, Msg>;
  interpretMsg<Msg2, Elem extends Node>(interp: Interpreter<In, Out, Msg, Msg2, Elem>): (s: SDOM<In, Out, Msg, Elem>) => SDOM<In, Out, Msg2, Elem>;
  focus<In2, Out2>(lens: Lens<In, In2, Out, Out2>): <Elem extends Node>(sdom: SDOM<In, Out2, Msg, Elem>) => SDOM<In, Out, Msg, Elem>;
  ask<Elem extends Node>(create: (m: In) => SDOM<In, Out, Msg, Elem>): SDOM<In, Out, Msg, Elem>;
  mapMessage<Msg2, Elem extends Node>(proj: (msg: Msg2) => Msg): (sdom: SDOM<In, Out, Msg2, Elem>) => SDOM<In, Out, Msg, Elem>;
  comapInput<In2>(coproj: (m: In) => In2): <Elem extends Node>(s: SDOM<In2, Out, Msg, Elem>) => SDOM<In, Out, Msg, Elem>;
  mapOutput<Out2>(proj: (m: Out2) => Out): <Elem extends Node>(s: SDOM<In, Out2, Msg, Elem>) => SDOM<In, Out, Msg, Elem>;
  embed<In1, Out1, Msg1>(sdom: SDOM<In1, Out1, Msg1>, interp: Interpreter<In1, Out1, Msg1, Msg>, proj: (m: Out1) => Out, coproj: (m: In) => In1): SDOM<In, Out, Msg>;
}

/**
 * Bind type parameters for `h`. This function does nothing at runtime
 * and just returns `h` singleton which exposes all API with bound
 * `Model` and `Msg` parameters. Without this typescript is not able
 * to unify types if you use directly exported functions from the
 * library. You dont need this in JS code.
 * 
 *     type Model = { counter: number };
 *     type Msg = 'Click';
 *     const h = sdom.create<In, Out, Msg>();
 *     const view = h.div(
 *         h.p(m => `You clicked ${m.counter} times`),
 *         h.button('Click here', { onclick: () => 'Click' }),
 *     );
 *     const model = { value: { counter: 0 } };
 *     const el = view.create(sdom.store.create(model), sdom.noop);
 *     assert.instanceOf(el.childNodes[0], HTMLParagraphElement);
 *     assert.instanceOf(el.childNodes[1], HTMLButtonElement);
 */
export function create<In, Out, Msg>(): H<In, Out, Msg> {
  return h as any;
}

/**
 * Start the application and attach it to `rootEl`
 * 
 *    const view = h.div(h.h1('Hello world!', { id: 'greeting' }));
 *    const inst = sdom.attach(view, document.body, {});
 *    assert.equal(document.getElementById('greeting').textContent, 'Hello world!');
 */
export function attach<Model, Msg, Elem extends Node>(view: SDOM<Model, Model, Msg, Elem>, rootEl: HTMLElement, init: Model, sink: Sink<Msg>): SDOMInstance<Model, Msg, Elem> {
  const model: StoreSource<Model> = { value: init, subscriptions: [] };
  return new SDOMInstance(rootEl, model, view, sink);
}

export type ElementContent<In, Out, Msg, Elem extends Node> = Props<In, Out, Msg, Elem>|SDOM<In, Out, Msg>|string|number|((m: In) => string);
export type Many<T> = T|T[];

/**
 * Create an html node. Attributes and contents can go in any order
 * 
 *    const view = sdom.element('a', { href: '#link' });
 *    const el = view.create(sdom.store.of({}), msg => {});
 *    assert.instanceOf(el, HTMLAnchorElement);
 *    assert.equal(el.hash, '#link');
 */
export function element<In, Out, Msg>(name: string, ...rest: Many<ElementContent<In, Out, Msg, HTMLElement>>[]): SDOM<In, Out, Msg, HTMLElement> {
  const childs: SDOM<In, Out, Msg, Node>[] = [];
  const attrs: Array<[string, string]> = [];
  const dynamicAttrs: Array<[string, (m: In, el: HTMLElement) => string]> = [];
  const props: Array<[string, any]> = [];
  const dynamicProps: Array<[string, (m: In) => any]> = [];
  const events: Array<[string, Function]> = [];

  rest.forEach(prepareContent);

  function prepareContent(a) {
    if (typeof(a) === 'function') childs.push(text(a));
    else if (Array.isArray(a)) a.forEach(prepareContent);
    else if (isSDOM(a)) childs.push(a);
    else if (typeof(a) === 'string' || typeof(a) === 'number') childs.push(text(a));
    else if (typeof(a) === 'object') {
      for (const k in a) {
        if (/^on/.test(k)) {
          typeof(a[k]) === 'function' ? events.push([k.slice(2), a[k]]) : events.push([k.slice(2), () => a[k]]);
          continue;
        }
        if (typeof(a[k]) === 'function') {
          if (/^html/.test(k)) dynamicAttrs.push([k.slice(4).toLowerCase(), a[k]])
          else dynamicProps.push([k, a[k]]);
          continue;
        }
        if (/^html/.test(k)) attrs.push([k.slice(4).toLowerCase(), a[k]])
        else props.push([k, a[k]]);
      }
    }
  }

  return {
    // Create new element
    create(model, sink) {
      const init = model.ask();
      const el = document.createElement(name);
      const eventListeners: any[] = events.map(([k, handler]) => {
        const listener = e => {
          const msg = handler(e, model.ask());
          if (msg !== void 0) sink(msg);
        };
        el.addEventListener(k, listener);
        return [k, listener];
      });
      props.forEach(([k, v]) => el[k] = v);
      dynamicProps.forEach(([k, fn]) => el[k] = fn(init));
      attrs.forEach(([k, v]) => el.setAttribute(k, v));
      dynamicAttrs.forEach(([k, fn]) => el.setAttribute(k, fn(init, el)));
      childs.forEach((ch, idx) => el.appendChild(ch.create(model, childSink(idx))));
      if (dynamicProps.length !== 0 || dynamicAttrs.length !== 0 || eventListeners.length !== 0) {
        model.updates(onNext, onComplete)
      }
      return el;

      function childSink(idx: number): Sink<PrimMsg<In, Out, Msg, HTMLElement>> {
        return msg => {
          if (messages.isMessage(msg)) return sink(msg);
          if (msg.tag === '@@Ref') {
            const prevEl = el.children[idx]; if (!prevEl) return;
            el.replaceChild(msg.el, prevEl);
            return;
          }
          return sink(msg);
        };
      }

      // Update existing element
      function onNext({ next }: Updates<In>) {
        dynamicProps.forEach(([k, fn]) => el[k] = fn(next));
        dynamicAttrs.forEach(([k, fn]) => el.setAttribute(k, fn(next, el)));
      }
      
      // Destroy element
      function onComplete() {
        eventListeners.forEach(([k, listener]) => el.removeEventListener(k, listener));
      }
    }
  };
}

/**
 * Create Text node
 * 
 *    const view = sdom.text(n => `You have ${n} unread messages`);
 *    const model = { value: 0 };
 *    const el = view.create(sdom.store.create(model), sdom.noop);
 *    assert.instanceOf(el, Text);
 *    assert.equal(el.nodeValue, 'You have 0 unread messages');
 *    sdom.store.next(model, 5);
 *    assert.equal(el.nodeValue, 'You have 5 unread messages');
 */
export function text<In, Out, Msg>(value: string|number|((m: In) => string|number)): SDOM<In, Out, Msg, Text> {
  return {
    // Create new text node
    create(model) {
      const content = typeof(value) === 'function' ? String(value(model.ask())) : String(value);
      const el = document.createTextNode(content);
      if (typeof(value) === 'function') model.updates(pv => el.nodeValue = String(value(pv.next)), noop);
      return el;
    },
  };
}

export type Nested<Parent, Child> = { parent: Parent, here: Child };
export type ItemMsg<Msg> = ((idx: number) => Msg) | never;

/**
 * Create an html node which content is a dynamic list of child nodes
 * 
 *    const view = h.array('ul', { class: 'list' })(
 *      m => m.list,
 *      h => h.li(m => m.here),
 *    );
 *    const list = ['One', 'Two', 'Three', 'Four'];
 *    const el = view.create(sdom.store.of({ list }), msg => {});
 *    assert.instanceOf(el, HTMLUListElement);
 *    assert.equal(el.childNodes[3].innerHTML, 'Four');
 */
export function array<In, Out, Msg, X>(lens: Lens<In, Out, X[], X[]>, name: string, props: Props<In, Out, Msg> = {}): (child: SDOM<Nested<In, X>, X, ItemMsg<Msg>>) => SDOM<In, Out, Msg, HTMLElement> {
  const rootSdom = element(name, props);
  return child => {
    const storeSources: StoreSource<any>[] = [];
    return {
      // Create new DOM node
      create(model, sink) {
        const init = model.ask();
        const xs = lens.getter(init);
        const el = rootSdom.create(model, sink);
        
        xs.forEach((here, idx) => {
          const storeSource = { value: { here, parent: init }, subscriptions: [] };
          const childEl = child.create(store.create<any>(storeSource), childSink(idx));
          storeSources.push(storeSource);
          el.appendChild(childEl);
        });
        model.updates(onNext, onComplete);
        
        return el;
        
        function childSink(idx: number): Sink<PrimMsg<any, any, (idx: number) => Msg, HTMLElement>> {
          return msg => {
            if (typeof(msg) === 'function') {
              return sink(msg(idx));              
            }
            if (msg.tag === '@@Ref') {
              const prevEl = el.children[idx]; if (!prevEl) return;
              el.replaceChild(msg.el, prevEl);
              return;
            }
            if (msg.tag === '@@Step') {
              const proj = (parent: In) => {
                const here = lens.getter(parent)[idx];
                const newChild = msg.proj({ parent, here });
                const newXs = lens.getter(parent).slice();
                newXs.splice(idx, 1, newChild);
                return lens.setter(newXs, parent);
              }
              return sink({ tag: '@@Step', proj });
            }
            return absurd(msg);
          };
        }

        function onNext({ prev, next }: Updates<In>) {
          const xs = lens.getter(next);
          const xsPrev = lens.getter(prev);
          let lastInserted: Node|null = null;
          for (let i =  Math.max(xs.length, xsPrev.length) - 1; i >= 0; i--) {
            const idx = i;
            const childEl = el.childNodes[i] as any;
            if (i in xsPrev && !(i in xs)) {
              const { subscriptions } = storeSources[i];
              subscriptions && subscriptions.forEach(s => s.onComplete());
              el.removeChild(childEl);
              storeSources.splice(i, 1);
            } else if(!(i in xsPrev) && i in xs) {
              const childModel = { value: { here: xs[i], parent: next }, subscriptions: [] };
              const nextEl = child.create(store.create<any>(childModel), childSink(idx));
              storeSources.push(childModel);

              if (lastInserted) {
                el.insertBefore(nextEl, lastInserted);
                lastInserted = nextEl;
              } else {
                el.appendChild(nextEl);
                lastInserted = nextEl;
              }            
            } else {
              store.next(storeSources[i], { here: xs[i], parent: next });
            }
          }
        }

        function onComplete() {
          for (const a of storeSources) {
            store.complete(a[0]);
          }
        }
      },
    };
  };
}
export function arrayH<In, Out, Msg, X>(lens: Lens<In, Out, X[], X[]>, name: string, props: Props<In, Out, Msg> = {}): (child: HSDOM<Nested<In, X>, X, ItemMsg<Msg>>) => SDOM<In, Out, Msg, HTMLElement> {
  return child => array(lens, name, props)(child(h as any))
}

export function mapMessage<In, Out, Msg1, Msg2, Elem extends Node>(proj: (msg: Msg1) => Msg2, sdom: SDOM<In, Out, Msg1, Elem>): SDOM<In, Out, Msg2, Elem> {
  return ({
    create(model, sink) {
      return sdom.create(model, m => sink(messages.mapMessage(proj, m)));
    },
  });
}

export function focus<S, T, A, B>(lens: Lens<S, T, A, B>): <Msg, Elem extends Node>(sdom: SDOM<A, B, Msg, Elem>) => SDOM<S, T, Msg, Elem> {
  return sdom => ({
    create(model, sink) {
      return sdom.create(store.mapStore(lens.getter, model), m => sink(messages.focus(lens, m)))
    },
  });
}

export function ask<In, Out, Msg, Elem extends Node>(create: (m: In) => SDOM<In, Out, Msg, Elem>): SDOM<In, Out, Msg, Elem> {
  return {
    create: (store, sink) => {
      return create(store.ask()).create(store, sink);
    },
  };
}

export function interpretMsg<In, Out, Msg1, Msg2, Elem extends Node = Node>(interp: (model: Store<In>, sink: Sink<PrimMsg<In, Out, Msg2, Elem>>) => Sink<PrimMsg<In, Out, Msg1, Elem>>): (s: SDOM<In, Out, Msg1, Elem>) => SDOM<In, Out, Msg2, Elem> {
  return sdom => ({
    create(model, sink) {
      return sdom.create(model, interp(model, sink));
    },
  });
}

/**
 * Generic way to create `SDOM` which content depends on some
 * condition on `Model`. First parameter checks this condition and
 * returns the index that points to the current `SDOM` inside
 * `alternatives`. This is useful for routing, tabs, etc. See also
 * [variants](/examples/variants/index.ts) example with more
 * convenient and more typesafe way of displaying union types
 * 
 *    type Tab = 'Details'|'Comments';
 *    type Model = { tab: Tab, details: string; comments: string[] };
 *    const view = h.div(sdom.discriminate(m => m.tab, {
 *        Details: h.p({ id: 'details' }, m => m.details),
 *        Comments: h.p({ id: 'comments' }, m => m.comments.join(', ')),
 *    }));
 *    const model = { value: { tab: 'Details', details: 'This product is awesome', comments: [`No it's not`] } };
 *    const el = view.create(sdom.store.create(model), sdom.noop);
 *    assert.equal(el.childNodes[0].id, 'details'); 
 *    assert.equal(el.childNodes[0].textContent, 'This product is awesome');
 *    sdom.store.next(model, { ...model.value, tab: 'Comments' });
 *    assert.equal(el.childNodes[0].id, 'comments'); 
 */
export function discriminate<In, Out, Msg, El extends Node, K extends string>(discriminator: (m: In) => K, alternatives: Record<K, SDOM<In, Out, Msg, El>>): SDOM<In, Out, Msg, El> {
  return {
    // Create new node
    create(model, sink) {
      const key = discriminator(model.ask());
      const childModel: StoreSource<any> = store.valueOf(model.ask());
      let el = alternatives[key].create(store.create(childModel), sink);
      model.updates(onNext, onComplete);
      return el;
      
      // Update existing text node
      function onNext({ prev, next }: Updates<In>) {
        const prevKey = discriminator(prev);
        const nextKey = discriminator(next);
        if (prevKey !== nextKey) {
          // Key is changed, so we don't update but switch to the new node
          store.complete(childModel);
          store.next(childModel, next);
          const nextEl = alternatives[nextKey].create(store.create(childModel), sink);
          el.parentNode!.replaceChild(nextEl, el);
          el = nextEl;
        } else {
          store.next(childModel, next);          
        }
      }

      function onComplete() {
        store.complete(childModel);        
      }
    },
  };
}

export function comapInput<In1, In2>(coproj: (m: In2) => In1): <Out, Msg, Elem extends Node>(s: SDOM<In1, Out, Msg, Elem>) => SDOM<In2, Out, Msg, Elem> {
  return sui => {
    return {
      create(model, sink) {
        return sui.create(store.mapStore(coproj, model), msg => sink(messages.dimapModel(coproj, a => a, msg)));
      },
    };
  };
}

export function mapOutput<Out1, Out2>(proj: (m: Out1) => Out2): <In, Msg, Elem extends Node>(s: SDOM<In, Out1, Msg, Elem>) => SDOM<In, Out2, Msg, Elem> {
  return sui => {
    return {
      create(model, sink) {
        return sui.create(model, msg => sink(messages.dimapModel(a => a, proj, msg)));
      },
    };
  };
}

export function embed<In1, Out1, Msg1, In2, Out2, Msg2>(sdom: SDOM<In1, Out1, Msg1>, interp: Interpreter<In1, Out1, Msg1, Msg2>, proj: (m: Out1) => Out2, coproj: (m: In2) => In1): SDOM<In2, Out2, Msg2> {
  return dimap(coproj, proj)(interpretMsg(interp)(sdom));
}

/**
 * Change both type parameters inside `SDOM<Model, Msg>`.
 * 
 *    type Model1 = { btnTitle: string };
 *    type Msg1 = { tag: 'Clicked' };
 *    type Model2 = string;
 *    type Msg2 = 'Clicked';
 *    let latestMsg: any = void 0;
 *    const view01 = sdom.elem<Model2, Msg2>('button', (m: Model2) => m, { onclick: () => 'Clicked'});
 *    const view02 = sdom.dimap<Model1, Msg1, Model2, Msg2>(m => m.btnTitle, msg2 => ({ tag: 'Clicked' }))(view01);
 *    const el = view02.create(sdom.observable.of({ btnTitle: 'Click on me' }), msg => (latestMsg = msg));
 *    el.click();
 *    assert.instanceOf(el, HTMLButtonElement);
 *    assert.equal(el.textContent, 'Click on me');
 *    assert.deepEqual(latestMsg, { tag: 'Clicked' });
 */
export function dimap<In1, Out1, In2, Out2>(coproj: (m: In2) => In1, proj: (m: Out1) => Out2): <Msg, Elem extends Node>(s: SDOM<In1, Out1, Msg, Elem>) => SDOM<In2, Out2, Msg, Elem> {
  return sui => {
    return {
      create(model, sink) {
        return sui.create(store.mapStore(coproj, model), msg => sink(messages.dimapModel(coproj, proj, msg)));
      },
    };
  };
}

export const id = <A>(a: A) => a;
export const noop = () => {};

// Borrowed from ELM
const rAF =
  typeof requestAnimationFrame !== 'undefined'
  ? requestAnimationFrame
  : function(callback) { setTimeout(callback, 1000 / 60); };  

// A running SDOM application
export class SDOMInstance<Model, Msg, Elem extends Node> {
  private state: 'NO_REQUEST'|'PENDING_REQUEST'|'EXTRA_REQUEST' = 'NO_REQUEST';
  public currentElement: Elem;
  public currentModel: Model;
  
  constructor (
    readonly rootEl: HTMLElement,
    readonly model: StoreSource<Model>,
    readonly view: SDOM<Model, Model, Msg, Elem>,
    readonly sink: Sink<Msg>,
  ) {
    const modelStore = store.create(model);
    this.currentElement = view.create(modelStore, this.handleMsg);
    rootEl.appendChild(this.currentElement);
    this.currentModel = model.value;
  }

  handleMsg = (msg: PrimMsg<Model, Model, never, Elem>) => {
    if (msg.tag === '@@Step') {
      this.step(msg.proj(this.currentModel));
      return;
    }
    if (msg.tag === '@@Ref') {
      if (this.currentElement !== msg.el) {
        this.rootEl.replaceChild(msg.el, this.currentElement);
      }
      return;
    }
    this.sink(msg);
  };

  updateIfNeeded = () => {
    switch (this.state) {
      case 'NO_REQUEST':
        throw new Error(
          'Unexpected draw callback.\n' +
            'Please report this to <https://github.com/elm-lang/virtual-dom/issues>.'
        );

      case 'PENDING_REQUEST':
        rAF(this.updateIfNeeded);
        this.state = 'EXTRA_REQUEST';
        store.next(this.model, this.currentModel);
        return;

      case 'EXTRA_REQUEST':
        this.state = 'NO_REQUEST';
        return;
    }
  }

  step(next: Model) {
    if (this.model.value === next) return;
    if (this.state === 'NO_REQUEST') {
      rAF(this.updateIfNeeded);
    }
    this.state = 'PENDING_REQUEST';
    this.currentModel = next;
  }
};

Object.assign(h, {
  text,
  array,
  arrayH,
  discriminate,
  interpretMsg,
  focus,
  ask,
  comapInput,
  mapOutput,
  dimap,
  embed,
});

export function identity<A>(a: A): A {
  return a;
}

export function isSDOM(input: any): input is SDOM<any, any, any> {
  return input && typeof(input.create) === 'function';
}

// Helper for totality checking
export function absurd(x: never): any {
  throw new Error('absurd: unreachable code');
}
