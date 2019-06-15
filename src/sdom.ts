import { Props, attributes } from './props'
import { h, H } from './index';
import * as observable from './observable';
import { Observable, ObservableValue, observableMap, PrevNext } from './observable';

export type Sink<T> = (x: T) => void;

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
export function attach<Model, Msg, Elem extends Node>(view: SDOM<Model, Msg, Elem>, rootEl: HTMLElement, init: Model, sink: (a: Msg) => void = noop): SDOMInstance<Model, Msg, Elem> {
  const model: ObservableValue<Model> = { value: init, subscriptions: [] };
  return new SDOMInstance(rootEl, model, view, sink);
}

/**
 * Create an html node
 * 
 *    const view = sdom.elem('a', { href: '#link' });
 *    const el = view.create(sdom.observable.of({}), sdom.noop);
 *    assert.instanceOf(el, HTMLAnchorElement);
 *    assert.equal(el.hash, '#link');
 */
export function elem<Model, Msg>(name: string, ...rest: Array<Props<Model, Msg>|SDOM<Model, Msg>|string|number|((m: Model) => string)>): SDOM<Model, Msg, HTMLElement> {
  const childs: SDOM<Model, Msg, Node>[] = [];
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
      const init = o.getValue();
      const el = document.createElement(name);
      const eventListeners: any[] = events.map(([k, handler]) => {
        const listener = e => {
          const action = handler(e, o.getValue());
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
 *    const model = { value: 0 };
 *    const el = view.create(sdom.observable.create(model), sdom.noop);
 *    assert.instanceOf(el, Text);
 *    assert.equal(el.nodeValue, 'You have 0 unread messages');
 *    sdom.observable.step(model, 5);
 *    assert.equal(el.nodeValue, 'You have 5 unread messages');
 */
export function text<Model, Msg>(value: string|number|((m: Model) => string|number)): SDOM<Model, Msg, Text> {
  return {
    // Create new text node
    create(o) {
      const content = typeof(value) === 'function' ? String(value(o.getValue())) : String(value);
      const el = document.createTextNode(content);
      if (typeof(value) === 'function') o.subscribe(pv => el.nodeValue = String(value(pv.next)), noop);
      return el;
    },
  };
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
export function array<Model, Msg>(name: string, props: Props<Model, Msg> = {}): <T extends any[]>(selector: (m: Model) => T, child: (h: H<Nested<Model, T[number]>, (idx: number) => Msg>) => SDOM<Nested<Model, T[number]>, (idx: number) => Msg>) => SDOM<Model, Msg, HTMLElement> {
  const rootSdom = elem(name, props);
  return (selector, child_) => {
    const child = child_(h as any);
    const childModels: ObservableValue<any>[] = [];
    return {
      // Create new DOM node
      create(o, sink) {
        const init = o.getValue();
        const xs = selector(init);
        const el = rootSdom.create(o, sink);
        
        xs.forEach((here, idx) => {
          const childModel = { value: { here, parent: init }, subscriptions: [] };
          const childSink = (action: any) => sink(action(idx));
          const childEl = child.create(observable.create<any>(childModel), childSink);
          childModels.push(childModel);
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
              childModels[i].subscriptions.forEach(s => s.onComplete());
              el.removeChild(childEl);
              childModels.splice(i, 1);
            } else if(!(i in xsPrev) && i in xs) {
              const childModel = { value: { here: xs[i], parent: next }, subscriptions: [] };
              const childSink = (action: any) => sink(action(idx));
              const nextEl = child.create(observable.create<any>(childModel), childSink);
              childModels.push(childModel);

              if (lastInserted) {
                el.insertBefore(nextEl, lastInserted);
                lastInserted = nextEl;
              } else {
                el.appendChild(nextEl);
                lastInserted = nextEl;
              }            
            } else {
              observable.step(childModels[i], { here: xs[i], parent: next });
            }
          }
        }

        function onComplete() {
          for (const a of childModels) {
            observable.complete(a[0]);
          }
        }
      },
    };
  };
}

/**
 * Change both type parameters inside `SDOM<Model, Msg>`.
 * 
 *     type Model1 = { btnTitle: string };
 *     type Msg1 = { tag: 'Clicked' };
 *     type Model2 = string;
 *     type Msg2 = 'Clicked';
 *     let latestMsg: any = void 0;
 *     const view01 = sdom.elem<Model2, Msg2>('button', (m: Model2) => m, { onclick: () => 'Clicked'});
 *     const view02 = sdom.dimap<Model1, Msg1, Model2, Msg2>(m => m.btnTitle, msg2 => ({ tag: 'Clicked' }))(view01);
 *     const el = view02.create(sdom.observable.of({ btnTitle: 'Click on me' }), msg => (latestMsg = msg));
 *     el.click();
 *     assert.instanceOf(el, HTMLButtonElement);
 *     assert.equal(el.textContent, 'Click on me');
 *     assert.deepEqual(latestMsg, { tag: 'Clicked' });
 */
export function dimap<M1, M2, A1, A2>(coproj: (m: M2) => M1, proj: (m: A1) => A2): <UI>(s: SUI<M1, A1, UI>) => SUI<M2, A2, UI> {
  return sui => {
    return {
      create(o, sink) {
        return sui.create(observableMap(coproj, o), a => sink(proj(a)));
      },
    };
  };
}

/**
 * Generic way to create `SDOM` which content depends on some
 * condition on `Model`. First parameter checks this condition and
 * returns a key which points to the current `SDOM` inside `options`
 * 
 *     type Tab = { tag: 'Details', info: string } | { tag: 'Comments', comments: string[] };
 *     type Model = { tab: Tab };
 *     const view = h.div(sdom.discriminate(m => m.tab.tag, {
 *         Details: h.p({ id: 'details' }, m => m.tab.info),
 *         Comments: h.p({ id: 'comments' }, m => m.tab.comments.join(', ')),
 *     }));
 *     const model = { value: { tab: { tag: 'Details', info: 'This product is awesome' } } };
 *     const el = view.create(sdom.observable.create(model), sdom.noop);
 *     assert.equal(el.childNodes[0].id, 'details'); 
 *     assert.equal(el.childNodes[0].textContent, 'This product is awesome');
 *     sdom.observable.step(model, { tab: { tag: 'Comments', comments: [] } });
 *     assert.equal(el.childNodes[0].id, 'comments'); 
 */
export function discriminate<Model, Msg, El extends Node, K extends string>(discriminator: (m: Model) => K, options: Record<K, SDOM<Model, Msg, El>>): SDOM<Model, Msg, El> {
  return {
    // Create new node
    create(o, sink) {
      const key = discriminator(o.getValue());
      const childModel: ObservableValue<any> = observable.valueOf(o.getValue());
      let el = options[key].create(observable.create(childModel), sink);
      o.subscribe(onNext, onComplete);
      return el;
      
      // Update existing text node
      function onNext({ prev, next }: PrevNext<Model>) {
        const prevKey = discriminator(prev);
        const nextKey = discriminator(next);
        if (prevKey !== nextKey) {
          // Key is changed, so we don't update but switch to the new node
          observable.complete(childModel);
          observable.step(childModel, next);
          const nextEl = options[nextKey].create(observable.create(childModel), sink);
          el.parentNode!.replaceChild(nextEl, el);
          el = nextEl;
        } else {
          observable.step(childModel, next);          
        }
      }

      function onComplete() {
        observable.complete(childModel);        
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
  public currentModel: Model;
  
  constructor (
    readonly rootEl: HTMLElement,
    readonly model: ObservableValue<Model>,
    readonly view: SDOM<Model, Msg, Elem>,
    readonly sink: Sink<Msg>,
  ) {
    const o = observable.create(model);
    rootEl.appendChild(view.create(o, sink));
    this.currentModel = model.value;
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
        observable.step(this.model, this.currentModel);
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

declare module "./index" {
  export interface H<Model, Msg> {
    (name: string, ...rest: Array<Props<Model, Msg>|SDOM<Model, Msg>|string|number|((m: Model) => string)>): SDOM<Model, Msg, HTMLElement>;
    text(content: string|number|((m: Model) => string|number)): SDOM<Model, Msg, Text>;
    array(name: string, props?: Props<Model, Msg>): <T extends any[]>(selector: (m: Model) => T, child: (h: H<Nested<Model, T[number]>, (idx: number) => Msg>) => SDOM<Nested<Model, T[number]>, (idx: number) => Msg>) => SDOM<Model, Msg>;
    discriminate<K extends string>(discriminator: (m: Model) => K, variants: Record<K, SDOM<Model, Msg>>): SDOM<Model, Msg>;
    dimap<M1, A1>(coproj: (m: Model) => M1, proj: (m: A1) => Msg): (s: SDOM<M1, A1>) => SDOM<Model, Msg>;
  }
}

h.text = text;
h.array = array;
h.discriminate = discriminate;
h.dimap = dimap;

export function isSDOM(input: any): input is SDOM<any, any> {
  return input && typeof(input.create) === 'function';
}
