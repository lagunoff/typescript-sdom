import { PrimMsg } from './message';
import * as messages from './message';
import * as store from './store';
import { Store, StoreSource, Updates } from './store';
import { Lens } from './optic';

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
} as any as H<unknown, unknown>;

import './html';
export * from './html';
import { Props } from './html';

/**
 * `SDOM<Model, Msg, Elem>` constructor for dynamic `Elem` node
 * 
 * @param Model type for data component needs to display itself
 * @param Msg type for messages component can fire during its lifecycle
 * @param Elem type of DOM node which will be constructed on 
 */
export type SDOM<Model, Msg, Elem extends Node = Node> = {
  create(model: Store<Model>, sink: Sink<PrimMsg<Model, Msg, Elem>>): Elem;
};
export type HSDOM<Model, Msg, Elem extends Node = Node> = (h: H<Model, Msg>) => SDOM<Model, Msg, Elem>;
export type Sink<T> = (x: T) => void;
export type Interpreter<Model, Msg1, Msg2, Elem extends Node = Node> = (store: Store<Model>, sink: Sink<PrimMsg<Model, Msg2, Elem>>) => Sink<PrimMsg<Model, Msg1, Elem>>;

/**
 * Type for `h` helper
 */
export interface H<Model, Msg> {
  (name: string, ...rest: Array<Props<Model, Msg>|SDOM<Model, Msg>|string|number|((m: Model) => string)>): SDOM<Model, Msg, HTMLElement>;
  text(content: string|number|((m: Model) => string|number)): SDOM<Model, Msg, Text>;
  // @ts-ignore
  arrayC(name: string, props?: Props<Model, Msg>): (child: SDOM<Nested<Model['parent'], Model['here'][number]>, ItemMsg<Msg>>) => SDOM<Model, Msg, HTMLElement>;
  // @ts-ignore
  arrayCH(name: string, props?: Props<Model, Msg>): (child: HSDOM<Nested<Model['parent'], Model['here'][number]>, ItemMsg<Msg>>) => SDOM<Model, Msg, HTMLElement>;

  discriminate<K extends string>(discriminator: (m: Model) => K, variants: Record<K, SDOM<Model, Msg>>): SDOM<Model, Msg>;
  mapMessage<Msg2, Elem extends Node>(proj: (msg: Msg2) => Msg): (sdom: SDOM<Model, Msg2, Elem>) => SDOM<Model, Msg, Elem>;
  interpretMsg<Msg2, Elem extends Node>(interp: Interpreter<Model, Msg, Msg2, Elem>): (s: SDOM<Model, Msg, Elem>) => SDOM<Model, Msg2, Elem>;
  
  omit<K extends Array<keyof Model>>(...keys: K): <Elem extends Node>(sdom: SDOM<Omit<Model, K[number]>, Msg, Elem>) => SDOM<Model, Msg, Elem>;
  pick<K extends Array<keyof Model>>(...keys: K): <Elem extends Node>(sdom: SDOM<Pick<Model, K[number]>, Msg, Elem>) => SDOM<Model, Msg, Elem>;
  at<K extends keyof Model>(k: K): <Elem extends Node>(sdom: SDOM<Model[K], Msg, Elem>) => SDOM<Model, Msg, Elem>;
  atC<K extends keyof Model>(k: K): <Elem extends Node>(sdom: SDOM<Nested<Model, Model[K]>, Msg, Elem>) => SDOM<Model, Msg, Elem>;
  atCH<K extends keyof Model>(k: K): <Elem extends Node>(sdom: (h: H<Nested<Model, Model[K]>, Msg>) => SDOM<Nested<Model, Model[K]>, Msg, Elem>) => SDOM<Model, Msg, Elem>;
  atCH<K1 extends keyof Model, K2 extends keyof Model[K1]>(k1: K1, k2: K2): <Elem extends Node>(sdom: (h: H<Nested<Model, Model[K1][K2]>, Msg>) => SDOM<Nested<Model, Model[K1][K2]>, Msg, Elem>) => SDOM<Model, Msg, Elem>;
  
  focus<Model2>(lens: Lens<Model, Model2>): <Elem extends Node>(sdom: SDOM<Model2, Msg, Elem>) => SDOM<Model, Msg, Elem>;
  focusH<Model2>(lens: Lens<Model, Model2>): <Elem extends Node>(sdom: (h: H<Model2, Msg>) => SDOM<Model2, Msg, Elem>) => SDOM<Model, Msg, Elem>;
  focusC<Model2>(lens: Lens<Model, Model2>): <Elem extends Node>(sdom: SDOM<Nested<Model, Model2>, Msg, Elem>) => SDOM<Model2, Msg, Elem>;

  ask<Elem extends Node>(create: (m: Model) => SDOM<Model, Msg, Elem>): SDOM<Model, Msg, Elem>;
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
 *     const h = sdom.create<Model, Msg>();
 *     const view = h.div(
 *         h.p(m => `You clicked ${m.counter} times`),
 *         h.button('Click here', { onclick: () => 'Click' }),
 *     );
 *     const model = { value: { counter: 0 } };
 *     const el = view.create(sdom.store.create(model), sdom.noop);
 *     assert.instanceOf(el.childNodes[0], HTMLParagraphElement);
 *     assert.instanceOf(el.childNodes[1], HTMLButtonElement);
 */
export function create<Model, Msg>(): H<Model, Msg> {
  return h as any;
}

/**
 * Start the application and attach it to `rootEl`
 * 
 *    const view = h.div(h.h1('Hello world!', { id: 'greeting' }));
 *    const inst = sdom.attach(view, document.body, {});
 *    assert.equal(document.getElementById('greeting').textContent, 'Hello world!');
 */
export function attach<Model, Msg, Elem extends Node>(view: SDOM<Model, Msg, Elem>, rootEl: HTMLElement, init: Model, interp: Interpreter<Model, Msg, never, Elem>): SDOMInstance<Model, Msg, Elem> {
  const model: StoreSource<Model> = { value: init, subscriptions: [] };
  return new SDOMInstance(rootEl, model, view, interp);
}

export type ElementContent<Model, Msg, Elem extends Node> = Props<Model, Msg, Elem>|SDOM<Model, Msg>|string|number|((m: Model) => string);
export type Many<T> = T|T[];

/**
 * Create an html node. Attributes and contents can go in any order
 * 
 *    const view = sdom.element('a', { href: '#link' });
 *    const el = view.create(sdom.store.of({}), msg => {});
 *    assert.instanceOf(el, HTMLAnchorElement);
 *    assert.equal(el.hash, '#link');
 */
export function element<Model, Msg>(name: string, ...rest: Many<ElementContent<Model, Msg, HTMLElement>>[]): SDOM<Model, Msg, HTMLElement> {
  const childs: SDOM<Model, Msg, Node>[] = [];
  const attrs: Array<[string, string]> = [];
  const dynamicAttrs: Array<[string, (m: Model, el: HTMLElement) => string]> = [];
  const props: Array<[string, any]> = [];
  const dynamicProps: Array<[string, (m: Model) => any]> = [];
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

      function childSink(idx: number): Sink<PrimMsg<Model, Msg, HTMLElement>> {
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
      function onNext({ next }: Updates<Model>) {
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
export function text<Model, Msg>(value: string|number|((m: Model) => string|number)): SDOM<Model, Msg, Text> {
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
export function arrayC<Model extends Nested<any, any[]>, Msg>(name: string, props: Props<Model, Msg> = {}): (child: SDOM<Nested<Model['parent'], Model['here'][number]>, ItemMsg<Msg>>) => SDOM<Model, Msg, HTMLElement> {
  const rootSdom = element(name, props);
  return child => {
    const storeSources: StoreSource<any>[] = [];
    return {
      // Create new DOM node
      create(model, sink) {
        const init = model.ask();
        const xs = init.here;
        const el = rootSdom.create(model, sink);
        
        xs.forEach((here, idx) => {
          const storeSource = { value: { here, parent: init.parent }, subscriptions: [] };
          const childEl = child.create(store.create<any>(storeSource), childSink(idx));
          storeSources.push(storeSource);
          el.appendChild(childEl);
        });
        model.updates(onNext, onComplete);
        
        return el;
        
        function childSink(idx: number): Sink<PrimMsg<any, (idx: number) => Msg, HTMLElement>> {
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
              const proj = (m: Nested<any, any>) => {
                const newChild = msg.proj({ parent: m.parent, here: m.here[idx] });
                const here = m.here.slice();
                here.splice(idx, 1, newChild.here);
                return { parent: newChild.parent, here } as any;
              }
              return sink({ tag: '@@Step', proj });
            }
            return absurd(msg);
          };
        }

        function onNext({ prev, next }: Updates<Model>) {
          const xs = next.here;
          const xsPrev = prev.here;
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
              const childModel = { value: { here: xs[i], parent: next.parent }, subscriptions: [] };
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
              store.next(storeSources[i], { here: xs[i], parent: next.parent });
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
export function arrayCH<Model extends Nested<any, any[]>, Msg>(name: string, props: Props<Model, Msg> = {}): (child: HSDOM<Nested<Model['parent'], Model['here'][number]>, ItemMsg<Msg>>) => SDOM<Model, Msg, HTMLElement> {
  return child => arrayC(name, props)(child(h as any))
}

export function mapMessage<Model, Msg1, Msg2, Elem extends Node>(proj: (msg: Msg1) => Msg2, sdom: SDOM<Model, Msg1, Elem>): SDOM<Model, Msg2, Elem> {
  return ({
    create(model, sink) {
      return sdom.create(model, m => sink(messages.mapMessage(proj, m)));
    },
  });
}

export function focus<A, B>(lens: Lens<B, A>): <Msg, Elem extends Node>(sdom: SDOM<A, Msg, Elem>) => SDOM<B, Msg, Elem> {
  return sdom => ({
    create(model, sink) {
      return sdom.create(store.mapStore(lens.getter, model), m => sink(messages.focus(lens, m)))
    },
  });
}

export function focusC<A, B>(lens: Lens<B, A>): <Msg, Elem extends Node>(sdom: SDOM<Nested<B, A>, Msg, Elem>) => SDOM<B, Msg, Elem> {
  const lens_ = {
    getter: parent => ({ parent, here: lens.getter(parent) }),
    setter: (a, b) => lens.setter(a.here, b),
  };
  return sdom => ({
    create(model, sink) {
      return sdom.create(store.mapStore(lens_.getter, model), m => sink(messages.focus(lens_, m)))
    },
  });
}

export function at<Model, K extends keyof Model>(k: K): <Msg, Elem extends Node>(sdom: SDOM<Model[K], Msg, Elem>) => SDOM<Model, Msg, Elem>;
export function at(...keys): (sdom: SDOM<any, any, any>) => SDOM<any, any, any> {
  // @ts-ignore
  return focus(Lens<any>().at(...keys));
}

export function atCH<Parent, Model, K extends keyof Model>(k: K): <Msg, Elem extends Node>(sdom: (h: H<Nested<Parent, Model[K]>, Msg>) => SDOM<Model[K], Msg, Elem>) => SDOM<Model, Msg, Elem>;
export function atCH(...keys): (sdom: HSDOM<any, any, any>) => SDOM<any, any, any> {
  // @ts-ignore
  return sdom => focusC(Lens<Model>().at(...keys))(sdom(h));
}

export function ask<Model, Msg, Elem extends Node>(create: (m: Model) => SDOM<Model, Msg, Elem>): SDOM<Model, Msg, Elem> {
  return {
    create: (store, sink) => {
      return create(store.ask()).create(store, sink);
    },
  };
}

export function pick<Model, K extends Array<keyof Model>>(...keys: K): <Msg, Elem extends Node>(sdom: SDOM<Pick<Model, K[number]>, Msg, Elem>) => SDOM<Model, Msg, Elem> {
  return focus(Lens<Model>().pick(...keys));
}

export function omit<Model, K extends Array<keyof Model>>(...keys: K): <Msg, Elem extends Node>(sdom: SDOM<Omit<Model, K[number]>, Msg, Elem>) => SDOM<Model, Msg, Elem> {
  return focus(Lens<Model>().omit(...keys));
}

export function interpretMsg<Model, Msg1, Msg2, Elem extends Node>(interp: (model: Store<Model>, sink: Sink<PrimMsg<Model, Msg2, Elem>>) => Sink<PrimMsg<Model, Msg1, Elem>>): (s: SDOM<Model, Msg1, Elem>) => SDOM<Model, Msg2, Elem> {
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
export function discriminate<Model, Msg, El extends Node, K extends string>(discriminator: (m: Model) => K, alternatives: Record<K, SDOM<Model, Msg, El>>): SDOM<Model, Msg, El> {
  return {
    // Create new node
    create(model, sink) {
      const key = discriminator(model.ask());
      const childModel: StoreSource<any> = store.valueOf(model.ask());
      let el = alternatives[key].create(store.create(childModel), sink);
      model.updates(onNext, onComplete);
      return el;
      
      // Update existing text node
      function onNext({ prev, next }: Updates<Model>) {
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
    readonly view: SDOM<Model, Msg, Elem>,
    readonly interpreter: Interpreter<Model, Msg, never, Elem>,
  ) {
    const modelStore = store.create(model);
    this.currentElement = view.create(modelStore, interpreter(modelStore, this.handleMsg));
    rootEl.appendChild(this.currentElement);
    this.currentModel = model.value;
  }

  handleMsg = (msg: PrimMsg<Model, never, Elem>) => {
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
  arrayC,
  arrayCH,
  discriminate,
  interpretMsg,
  omit,
  pick,
  at,
  atCH,
  focus,
  ask,
});

export function isSDOM(input: any): input is SDOM<any, any> {
  return input && typeof(input.create) === 'function';
}

// Helper for totality checking
export function absurd(x: never): any {
  throw new Error('absurd: unreachable code');
}
