import { Props, attributes } from './props'
import { h, H } from './index';

const sdomSymbol = Symbol('SDOM');
export type SDOM<Model, Action, Elem = Node> = {
  create(model: Model): SDOMNode<Model, Action, Elem>;
  update(el: SDOMNode<Model, Action, Elem>, prev: Model, next: Model): SDOMNode<Model, Action, Elem>;
  destroy(el: SDOMNode<Model, Action, Elem>, prev: Model): void;
};

// An opaque alias for `Elem` to distinguish the DOM nodes created by
// this library
export type SDOMNode<Model, Action, Elem> = Elem & { [sdomSymbol]: [Model, Action] };

/**
 * Start the application and attach it to `rootEl`
 * 
 *    const view = h.div(h.h1('Hello world!', { id: 'greeting' }));
 *    const inst = attach(view, document.body, {});
 *    assert.equal(document.getElementById('greeting').textContent, 'Hello world!');
 */
export function attach<Model, Action>(view: SDOM<Model, Action>, rootEl: HTMLElement, model: Model, sink: (a: Action) => void = noop): SDOMInstance<Model, Action> {
  const sdom = dimap(id, (a: Action) => (sink(a), a))(view);
  const el = sdom.create(model);
  rootEl[SDOM_DATA] = rootEl[SDOM_DATA] || {};
  rootEl[SDOM_DATA].model = model;
  rootEl.appendChild(el);
  return new SDOMInstance(rootEl, model, model, el, sdom);
}

/**
 * Create an html node
 * 
 *    const view = elem('a', { href: '#link' });
 *    const el = view.create({});
 *    assert.instanceOf(el, HTMLAnchorElement);
 *    assert.equal(el.hash, '#link');
 */
export function elem<Model, Action>(name: string, ...rest: Array<Props<Model, Action>|SDOM<Model, Action>|string|number|((m: Model) => string)>): SDOM<Model, Action, HTMLElement> {
  const childs: SDOM<Model, Action, Node>[] = [];
  const attrs: Array<[string, string]> = [];
  const dynamicAttrs: Array<[string, (m: Model) => string]> = [];
  const props: Array<[string, any]> = [];
  const dynamicProps: Array<[string, (m: Model) => any]> = [];
  const events: Array<[string, EventListener]> = [];

  for (const a of rest) {
    if (typeof(a) === 'function') childs.push(text(a));
    else if (isSDOM(a)) childs.push(a);
    else if (typeof(a) === 'string' || typeof(a) === 'number') childs.push(text(a));
    else if (typeof(a) === 'object') {
      for (const k in a) {
        if (/^on/.test(k)) {
          events.push([k.slice(2), createEventListener(a[k])]);
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
    create(model) {
      const el = document.createElement(name);
      props.forEach(([k, v]) => el[k] = v);
      dynamicProps.forEach(([k, fn]) => el[k] = fn(model));
      attrs.forEach(([k, v]) => el.setAttribute(k, v));
      dynamicAttrs.forEach(([k, fn]) => el.setAttribute(k, fn(model)));
      events.forEach(([k, listener]) => el.addEventListener(k, listener));
      childs.forEach(ch => el.appendChild(ch.create(model)));
      return el as any;
    },
    
    // Update existing element
    update(el, prev, next) {
      dynamicProps.forEach(([k, fn]) => el[k] = fn(next));
      dynamicAttrs.forEach(([k, fn]) => el.setAttribute(k, fn(next)));
      childs.forEach((chSdom, idx) => {
        const ch = el.childNodes[idx] as any;
        const nextCh = chSdom.update(ch, prev, next);
        if (ch !== nextCh) el.replaceChild(nextCh, ch);
      });
      return el;
    },
    
    // Destroy element
    destroy(el, prev) {
      events.forEach(([k, listener]) => el.removeEventListener(k, listener));
      childs.forEach((chSdom, idx) => {
        const ch = el.childNodes[idx] as any;
        chSdom.destroy(ch, prev);
      });
    },    
  };
}

/**
 * Create Text node
 * 
 *    const view = text(n => `You have ${n} unread messages`);
 *    let model = 0;
 *    const el = view.create(model);
 *    assert.instanceOf(el, Text);
 *    assert.equal(el.nodeValue, 'You have 0 unread messages');
 *    view.update(el, model, 5);
 *    assert.equal(el.nodeValue, 'You have 5 unread messages');
 */
export function text<Model, Action>(value: string|number|((m: Model) => string|number)): SDOM<Model, Action, Text> {
  if (typeof(value) === 'function') {
    return {
      // Create new text node
      create(model) {
        const el = document.createTextNode(String(value(model)));
        return el as any;
      },    
      // Update existing text node
      update(el, prev, next) {
        const nextValue = value(next);
        if (el.nodeValue !== nextValue) el.nodeValue = String(nextValue);
        return el;
      },
      // Destroy Text node
      destroy: noopDestroy,
    };
  } else {
    return {
      // Create new text node
      create(model) {
        const el = document.createTextNode(String(value));
        return el as any;
      },    
      // Update existing text node
      update: noopUpdate,
      // Destroy Text node
      destroy: noopDestroy,
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
 *    const el = view.create({ list });
 *    assert.instanceOf(el, HTMLUListElement);
 *    assert.equal(el.childNodes[3].innerHTML, 'Four');
 */
export function array<Model, Action>(name: string, props: Props<Model, Action> = {}): <T extends any[]>(selector: (m: Model) => T, child: (h: H<Nested<Model, T[number]>, (idx: number) => Action>) => SDOM<Nested<Model, T[number]>, (idx: number) => Action>) => SDOM<Model, Action, HTMLElement> {
  const rootSdom = elem(name, props);
  return (selector, child_) => {
    const child = child_(h as any);
    return {
      // Create new DOM node
      create(model) {
        const xs = selector(model);
        const el = rootSdom.create(model);
        xs.forEach((here, idx) => {
          const childEl = child.create({ here, parent: model });
          childEl[SDOM_DATA] = childEl[SDOM_DATA] || {};
          const { coproj, proj } = childEl[SDOM_DATA];
          childEl[SDOM_DATA].coproj = parent => {
            const item = selector(parent)[idx];
            parent = { parent, item };
            return coproj ? coproj(parent) : parent;
          };
          childEl[SDOM_DATA].proj = action => {
            if (proj) action = proj(action);
            return action(idx);
          };
          el.appendChild(childEl);
        });
        return el as any;
      },
      
      // Update existing DOM node
      update(el, prev, next) {
        rootSdom.update(el, prev, next);
        const xs = selector(next);
        const xsPrev = selector(prev);
        let lastInserted: Node|null = null;
        for (let i =  Math.max(xs.length, xsPrev.length) - 1; i >= 0; i--) {
          const childEl = el.childNodes[i] as any;
          if (i in xsPrev && !(i in xs)) {
            child.destroy(childEl, { parent: next, here: xsPrev[i] });
            el.removeChild(childEl);
          } else if(!(i in xsPrev) && i in xs) {
            const nextEl = child.create({ parent: next, here: xs[i] });
            if (lastInserted) {
              el.insertBefore(nextEl, lastInserted);
              lastInserted = nextEl;
            } else {
              el.appendChild(nextEl);
              lastInserted = nextEl;
            }            
            nextEl[SDOM_DATA] = nextEl[SDOM_DATA] || {};
            const { coproj, proj } = nextEl[SDOM_DATA];
            nextEl[SDOM_DATA].coproj = parent => {
              const item = selector(parent)[i];
              parent = { parent, item };
              return coproj ? coproj(parent) : parent;
            };
            nextEl[SDOM_DATA].proj = action => {
              if (proj) action = proj(action);
              return action(i);
            };
          } else {
            const nextEl = child.update(childEl, { parent: next, here: xsPrev[i] }, { parent: next, here: xs[i] });
            if (nextEl !== childEl) {
              el.replaceChild(nextEl, childEl);
              nextEl[SDOM_DATA] = nextEl[SDOM_DATA] || {};
              const { coproj, proj } = nextEl[SDOM_DATA];
              nextEl[SDOM_DATA].coproj = parent => {
                const item = selector(parent)[i];
                parent = { parent, item };
                return coproj ? coproj(parent) : parent;
              };
              nextEl[SDOM_DATA].proj = action => {
                if (proj) action = proj(action);
                return action(i);
              };
            }
          }
        }
        return el;
      },
      
      // Destroy node
      destroy(el, prev) {
        const parent = prev;
        const xs = selector(parent);
        xs.forEach((here, idx) => {
          const ch = el.childNodes[idx] as any;
          child.destroy(ch, { parent, here });
        });
        rootSdom.destroy(el, prev);
        return el;
      },
    };
  };
}

/**
 * Change both type parameters inside `SDOM<Model, Action>`.
 */
export function dimap<M1, M2, A1, A2>(coproj: (m: M2) => M1, proj: (m: A1) => A2): (s: SDOM<M1, A1>) => SDOM<M2, A2> {
  return sdom => {
    const create = (model) => {
      const el = sdom.create(coproj(model));
      el[SDOM_DATA] = el[SDOM_DATA] || {};
      const { coproj: coproj_, proj: proj_ } = el[SDOM_DATA];
      el[SDOM_DATA].coproj = model => {
        model = coproj(model);
        return coproj_ ? coproj_(model) : model;
      };
      el[SDOM_DATA].proj = action => {
        if (proj_) action = proj_(action);
        return proj(action);
      };
      return el;
    };
    
    const update = sdom.update === noopUpdate ? noopUpdate : (el, prev, next) => {
      const nextEl = sdom.update(el, coproj(prev), coproj(next));
      if (nextEl !== el) {
        nextEl[SDOM_DATA] = nextEl[SDOM_DATA] || {};
        const { coproj: coproj_, proj: proj_ } = nextEl[SDOM_DATA];
        nextEl[SDOM_DATA].coproj = model => {
          model = coproj(model);
          return coproj_ ? coproj_(model) : model;
        };
        nextEl[SDOM_DATA].proj = action => {
          if (proj_) action = proj_(action);
          return proj(action);
        };
      }
      return nextEl;
    };
    
    const destroy = sdom.destroy;

    return { create, update, destroy } as any;
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
    create(model) {
      const key = discriminator(model);
      return options[key].create(model);
    },
    
    // Update existing text node
    update(el, prev, next) {
      const prevKey = discriminator(prev);
      const nextKey = discriminator(next);
      if (prevKey !== nextKey) {
        // Key is changed, so we don't update but switch to the new node
        return options[nextKey].create(next);
      }
      return options[nextKey].update(el, prev, next);
    },
    
    // Destroy element
    destroy(el, prev) {
      const key = discriminator(prev);
      return options[key].destroy(el, prev);
    },
  };
}

// Create an `Action` and then bubble it up the DOM tree applying all
// the projections attached by `dimap`
function createEventListener<Model, Action>(cb: (e: Event, model: Model) => Action|void): EventListener {
  return e => {
    let iter = e.target as HTMLElement|null;
    let action = void 0 as Action|void;
    const coprojs: Function[] = [];
    const projs: Function[] = [];
    
    for (; iter; iter = iter.parentElement) {
      const nodeData = iter[SDOM_DATA];
      if (!nodeData) continue;
      if ('coproj' in nodeData) coprojs.push(nodeData.coproj);
      if ('proj' in nodeData) projs.push(nodeData.proj);
      if ('model' in nodeData) {
        const model = coprojs.reduceRight((acc, f) => f(acc), nodeData.model);
        action = cb(e, model); if (!action) return;
        action = projs.reduce((acc, f) => f(acc), action);
        break;
      }
    }
    if (!action) return;
    for (; iter; iter = iter.parentElement) {
      const nodeData = iter[SDOM_DATA];
      if (!nodeData) continue;
      if ('proj' in nodeData) action = nodeData.proj(action);
    }
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
export class SDOMInstance<Model, Action> {
  private state: 'NO_REQUEST'|'PENDING_REQUEST'|'EXTRA_REQUEST' = 'NO_REQUEST';
  
  constructor (
    readonly rootEl: HTMLElement,
    public currentModel: Model,
    private prevModel: Model,
    private prevEl: any,
    readonly sdom: SDOM<Model, Action>,
  ){}

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
        const nextEl = this.sdom.update(this.prevEl, this.prevModel, this.currentModel);
        if (nextEl !== this.prevEl) {
          this.rootEl.removeChild(this.prevEl);
          this.rootEl.appendChild(nextEl);
        }
        this.prevEl = nextEl;
        this.prevModel = this.currentModel;
	return;

      case 'EXTRA_REQUEST':
	this.state = 'NO_REQUEST';
	return;
    }
  }

  stepper(next: Model) {
    if (this.currentModel === next) return;
    if (this.state === 'NO_REQUEST') {
      rAF(this.updateIfNeeded);
    }
    this.state = 'PENDING_REQUEST';
    this.currentModel = next;
    this.rootEl[SDOM_DATA].model = this.currentModel;
  }
};

export const SDOM_DATA = '__SDOM_DATA__';
export type SDOMData<Model, Action> = {
  proj?(action: unknown): Action;
  coproj?(model: Model): unknown;
  model?: Model;
  unlisten?: Function;
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

export function noopUpdate(el, prev, next) {
  return el;
}

export function noopDestroy(el, prev) {
}

export function isSDOM(input: any): input is SDOM<any, any> {
  return input && typeof(input.create) === 'function' && typeof(input.update) === 'function' && typeof(input.destroy) === 'function';
}
