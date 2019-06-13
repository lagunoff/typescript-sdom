import { Props, attributes } from './props'
import { h, H } from './index';
import * as subscribe from './observable';
import { Observable, ObservableRef, observableMap } from './observable';

export type Sink<T> = (x: T) => void;
export type PrevNext<T> = { prev:T; next: T; };

export type SUI<Model, Msg, UI> = {
  create(o: Observable<Model>, sink: Sink<Msg>): UI;
};

export type SDOM<Model, Msg, Elem extends Node = Node> = SUI<Model, Msg, Elem>;

/**
 * Start the application and attach it to `rootEl`
 * 
 *    const view = h.div(h.h1('Hello world!', { id: 'greeting' }));
 *    const inst = sdom.attach(view, document.body, {});
 *    assert.equal(document.getElementById('greeting').textContent, 'Hello world!');
 */
export function attach<Model, Action, Elem extends Node>(view: SDOM<Model, Action, Elem>, rootEl: HTMLElement, model: Model, sink: (a: Action) => void = noop): SDOMInstance<Model, Action, Elem> {
  const ref: ObservableRef<Model> = { value: model, subscriptions: [] };
  return new SDOMInstance(rootEl, ref, view, sink);
}

/**
 * Create an html node
 * 
 *    const view = sdom.elem('a', { href: '#link' });
 *    const el = view.create(sdom.observable.of({}), sdom.noop);
 *    assert.instanceOf(el, HTMLAnchorElement);
 *    assert.equal(el.hash, '#link');
 */
export function elem<Model, Action>(name: string, ...rest: Array<Props<Model, Action>|SDOM<Model, Action>|string|number|((m: Model) => string)>): SDOM<Model, Action, HTMLElement> {
  const childs: SDOM<Model, Action, Node>[] = [];
  const attrs: Array<[string, string]> = [];
  const dynamicAttrs: Array<[string, (m: Model) => string]> = [];
  const props: Array<[string, any]> = [];
  const dynamicProps: Array<[string, (m: Model) => any]> = [];
  const events: Array<[string, Function]> = [];

  for (const a of rest) {
    if (typeof(a) === 'function') childs.push(text(a));
    else if (isSDOM(a)) childs.push(a);
    else if (typeof(a) === 'string' || typeof(a) === 'number') childs.push(text(a));
    else if (typeof(a) === 'object') {
      for (const k in a) {
        if (/^on/.test(k)) {
          events.push([k.slice(2), a[k]]);
          continue;
        }
        if (typeof(a[k]) === 'function') {
          k in attributes ? dynamicAttrs.push([k, a[k]]) : dynamicProps.push([k, a[k]]);
          continue;
        }
        k in attributes ? attrs.push([k, a[k]]) : props.push([k, a[k]]);
      }
    }
  }
  
  return {
    // Create new element
    create(o, sink) {
      const init = o.getLatest();
      const el = document.createElement(name);
      const eventListeners: any[] = events.map(([k, handler]) => {
        const listener = e => {
          const action = handler(e, o.getLatest());
          if (action !== void 0) sink(action);
        }
        el.addEventListener(k, listener);
        return [k, listener];
      });
      props.forEach(([k, v]) => el[k] = v);
      dynamicProps.forEach(([k, fn]) => el[k] = fn(init));
      attrs.forEach(([k, v]) => el.setAttribute(k, v));
      dynamicAttrs.forEach(([k, fn]) => el.setAttribute(k, fn(init)));
      childs.forEach(ch => el.appendChild(ch.create(o, sink)));
      o.subscribe(onNext, onComplete)
      return el;

      // Update existing element
      function onNext({ next }: PrevNext<Model>) {
        dynamicProps.forEach(([k, fn]) => el[k] = fn(next));
        dynamicAttrs.forEach(([k, fn]) => el.setAttribute(k, fn(next)));
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
 *    const model = { value: 0, subscriptions: [] };
 *    const el = view.create(sdom.observable.create(model), sdom.noop);
 *    assert.instanceOf(el, Text);
 *    assert.equal(el.nodeValue, 'You have 0 unread messages');
 *    sdom.observable.step(model, 5);
 *    assert.equal(el.nodeValue, 'You have 5 unread messages');
 */
export function text<Model, Action>(value: string|number|((m: Model) => string|number)): SDOM<Model, Action, Text> {
  if (typeof(value) === 'function') {
    return {
      // Create new text node
      create(o) {
        const el = document.createTextNode(String(value(o.getLatest())));
        o.subscribe(pv => el.nodeValue = String(value(pv.next)), noop);
        return el;
      },
    };
  } else {
    return {
      // Create new text node
      create() {
        const el = document.createTextNode(String(value));
        return el;
      },    
    };    
  }
}

export type Nested<Parent, Child> = { parent: Parent, here: Child };

/**
 * Create an html node which content is a dynamic list of child nodes
 * 
 *    const view = h.array('ul', { class: 'list' })(
 *      m => m.list,
 *      h => h.li(m => m.here),
 *    );
 *    const list = ['One', 'Two', 'Three', 'Four'];
 *    const el = view.create(sdom.observable.of({ list }), sdom.noop);
 *    assert.instanceOf(el, HTMLUListElement);
 *    assert.equal(el.childNodes[3].innerHTML, 'Four');
 */
export function array<Model, Action>(name: string, props: Props<Model, Action> = {}): <T extends any[]>(selector: (m: Model) => T, child: (h: H<Nested<Model, T[number]>, (idx: number) => Action>) => SDOM<Nested<Model, T[number]>, (idx: number) => Action>) => SDOM<Model, Action, HTMLElement> {
  const rootSdom = elem(name, props);
  return (selector, child_) => {
    const child = child_(h as any);
    const childArgs: Array<[ObservableRef<any>, Observable<any>, Sink<any>]> = [];
    return {
      // Create new DOM node
      create(o, sink) {
        const init = o.getLatest();
        const xs = selector(init);
        const el = rootSdom.create(o, sink);
        
        xs.forEach((here, idx) => {
          const childObservableRef = { value: { here, parent: init }, subscriptions: [] };
          const childObservable = subscribe.create<any>(childObservableRef);
          const childSink = (action: any) => sink(action(idx));
          const childEl = child.create(childObservable, childSink);
          childArgs.push([childObservableRef, childObservable, childSink]);
          el.appendChild(childEl);
        });
        o.subscribe(onNext, onComplete);
        
        return el;

        function onNext({ prev, next }: PrevNext<Model>) {
          const xs = selector(next);
          const xsPrev = selector(prev);
          let lastInserted: Node|null = null;
          for (let i =  Math.max(xs.length, xsPrev.length) - 1; i >= 0; i--) {
            const idx = i;
            const childEl = el.childNodes[i] as any;
            if (i in xsPrev && !(i in xs)) {
              childArgs[i][0].subscriptions.forEach(s => s.onComplete());
              el.removeChild(childEl);
              childArgs.splice(i, 1);
            } else if(!(i in xsPrev) && i in xs) {
              const childObservableRef = { value: { here: xs[i], parent: next }, subscriptions: [] };
              const childObservable = subscribe.create<any>(childObservableRef);
              const childSink = (action: any) => sink(action(idx));
              const nextEl = child.create(childObservable, childSink);
              childArgs.push([childObservableRef, childObservable, childSink]);

              if (lastInserted) {
                el.insertBefore(nextEl, lastInserted);
                lastInserted = nextEl;
              } else {
                el.appendChild(nextEl);
                lastInserted = nextEl;
              }            
            } else {
              subscribe.step(childArgs[i][0], { here: xs[i], parent: next });
            }
          }
        }

        function onComplete() {
          for (const a of childArgs) {
            subscribe.complete(a[0]);
          }
        }
      },
    };
  };
}

/**
 * Change both type parameters inside `SDOM<Model, Action>`.
 */
export function dimap<M1, M2, A1, A2>(coproj: (m: M2) => M1, proj: (m: A1) => A2): (s: SDOM<M1, A1>) => SDOM<M2, A2> {
  return sdom => {
    return {
      create(o, sink) {
        return sdom.create(observableMap(coproj, o), a => sink(proj(a)));
      },
    };
  };
}

/**
 * Generic way to create `SDOM` which content depends on some
 * condition on `Model`. First parameter checks this condition and
 * returns a key which points to the current `SDOM` inside `options`
 */
export function discriminate<Model, Action, K extends string>(discriminator: (m: Model) => K, options: Record<K, SDOM<Model, Action>>): SDOM<Model, Action> {
  return {
    // Create new node
    create(o, sink) {
      const key = discriminator(o.getLatest());
      const el = options[key].create(o, sink);
      o.subscribe(onNext, noop);
      return el;
      
      // Update existing text node
      function onNext({ prev, next }: PrevNext<Model>) {
        const prevKey = discriminator(prev);
        const nextKey = discriminator(next);
        if (prevKey !== nextKey) {
          // Key is changed, so we don't update but switch to the new node
          const nextEl = options[nextKey].create(o, sink);
          el.parentNode!.replaceChild(nextEl, el);
        }
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
export class SDOMInstance<Model, Action, Elem extends Node> {
  private state: 'NO_REQUEST'|'PENDING_REQUEST'|'EXTRA_REQUEST' = 'NO_REQUEST';
  public currentModel: Model;
  
  constructor (
    readonly rootEl: HTMLElement,
    readonly ref: ObservableRef<Model>,
    readonly view: SDOM<Model, Action, Elem>,
    readonly sink: Sink<Action>,
  ) {
    const o = subscribe.create(ref);
    rootEl.appendChild(view.create(o, sink));
    this.currentModel = ref.value;
  }

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
        subscribe.step(this.ref, this.currentModel);
	return;

      case 'EXTRA_REQUEST':
	this.state = 'NO_REQUEST';
	return;
    }
  }

  step(next: Model) {
    if (this.ref.value === next) return;
    if (this.state === 'NO_REQUEST') {
      rAF(this.updateIfNeeded);
    }
    this.state = 'PENDING_REQUEST';
    this.currentModel = next;
  }
};


declare module "./index" {
  export interface H<Model, Action> {
    (name: string, ...rest: Array<Props<Model, Action>|SDOM<Model, Action>|string|number|((m: Model) => string)>): SDOM<Model, Action, HTMLElement>;
    text(content: string|number|((m: Model) => string|number)): SDOM<Model, Action, Text>;
    array(name: string, props?: Props<Model, Action>): <T extends any[]>(selector: (m: Model) => T, child: (h: H<Nested<Model, T[number]>, (idx: number) => Action>) => SDOM<Nested<Model, T[number]>, (idx: number) => Action>) => SDOM<Model, Action>;
    discriminate<K extends string>(discriminator: (m: Model) => K, variants: Record<K, SDOM<Model, Action>>): SDOM<Model, Action>;
    dimap<M1, A1>(coproj: (m: Model) => M1, proj: (m: A1) => Action): (s: SDOM<M1, A1>) => SDOM<Model, Action>;
  }
}

h.text = text;
h.array = array;
h.discriminate = discriminate;
h.dimap = dimap;


export function isSDOM(input: any): input is SDOM<any, any> {
  return input && typeof(input.create) === 'function';
}
