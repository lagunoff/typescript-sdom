import { Props, attributes } from './props'
import { h, H } from './index';

const sdomSymbol = Symbol('SDOM');
export type SDOM<Model, Action, Elem extends Node = Node> = Derivative<Model, SDOMNode<Model, Action, Elem>>;
export type Prev<Input, Output> = { input: Input, output: Output };
export type Derivative<Input, Output> = {
  (prev: Prev<Input, Output>|null, next: Input|null): Output;
  (prev: Prev<Input, Output>, next: null): Output;
};

// An opaque alias for `Elem` to distinguish the DOM nodes created by
// this library
export type SDOMNode<Model, Action, Elem> = Elem & { [sdomSymbol]: [Model, Action] };

/**
 * Start the application and attach it to `rootEl`
 * ```ts
 * const view = h.div(h.h1('Hello world!', { id: 'greeting' }));
 * const inst = attach(view, document.body, {});
 * document.getElementById('greeting').textContent; // => 'Hello world!'
 * ```
 */
export function attach<Model, Action>(view: SDOM<Model, Action>, rootEl: HTMLElement, model: Model, sink: (a: Action) => void = noop): SDOMInstance<Model, Action> {
  const sdom = dimap(id, (a: Action) => (sink(a), a))(view);
  const el = sdom(null, model);
  rootEl[SDOM_DATA] = rootEl[SDOM_DATA] || {};
  rootEl[SDOM_DATA].model = model;
  rootEl.appendChild(el);
  const prev: Prev<Model, typeof el> = { output: el, input: model };

  return new SDOMInstance(rootEl, model, prev, sdom);
}

/**
 * Create an html node
 * ```ts
 * const view = elem('a', { href: '#link' });
 * const el = view(null, {});
 * el instanceof HTMLAnchorElement; // => true
 * el.href === '#link'; // => true
 * ```
 */
export function elem<Model, Action>(name: string, ...rest: Array<Props<Model, Action>|SDOM<Model, Action>|string|number>): SDOM<Model, Action, HTMLElement> {
  const childs: SDOM<Model, Action, Node>[] = [];
  const attrs: Array<[string, string]> = [];
  const dynamicAttrs: Array<[string, (m: Model) => string]> = [];
  const props: Array<[string, any]> = [];
  const dynamicProps: Array<[string, (m: Model) => any]> = [];
  const events: Array<[string, EventListener]> = [];

  for (const a of rest) {
    if (typeof(a) === 'function') childs.push(a);
    if (typeof(a) === 'string' || typeof(a) === 'number') childs.push(text(a));
    if (typeof(a) === 'object') {
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
  
  return (prev, next) => {
    if (prev && !next) {
      // Destroy element
      const el = prev.output;
      const data = el[SDOM_DATA];
      if (!(el instanceof HTMLElement)) throw new Error('actuate: got invalid DOM node');
      data && data.unlisten && data.unlisten();
      childs.forEach((childSdom, idx) => {
        const ch = el.childNodes[idx] as any;
        childSdom({ output: ch, input: prev.input }, null);
      });
      return prev.output;
    } else if (!prev && next) {
      // Create new element
      const el = document.createElement(name);
      props.forEach(([k, v]) => el[k] = v);
      dynamicProps.forEach(([k, fn]) => el[k] = fn(next));
      attrs.forEach(([k, v]) => el.setAttribute(k, v));
      dynamicAttrs.forEach(([k, fn]) => el.setAttribute(k, fn(next)));
      events.forEach(([k, listener]) => el.addEventListener(k, createEventListener(listener)));
      childs.forEach(ch => el.appendChild(ch(null, next)));
      return el;
    } else if (prev && next) {
      // Update existing element
      const { output } = prev;
      if (!(output instanceof HTMLElement)) throw new Error('actuate: got invalid DOM node');
      dynamicProps.forEach(([k, fn]) => output[k] = fn(next));
      dynamicAttrs.forEach(([k, fn]) => output.setAttribute(k, fn(next)));
      childs.forEach((childSdom, idx) => {
        const ch = output.childNodes[idx] as any;
        const nextCh = childSdom({ output: ch, input: prev.input }, next);
        if (ch !== nextCh) output.replaceChild(nextCh, ch);
      });
      return output;
    }
    throw new Error('next and prev cannot be both null simultaneously');
  }
}

/**
 * Create Text node
 */
export function text<Model, Action>(value: string|number|((m: Model) => string|number)): SDOM<Model, Action, Text> {
  return (prev, next) => {
    if (prev && !next) {
      // Destroy element
      const { output } = prev;
      return prev.output;
    } else if (!prev && next) {
      // Create new text node
      const text = typeof(value) === 'function' ? value(next) : value;
      const el = document.createTextNode(String(text));
      return el as any;
    } else if (prev && next) {
      // Update existing text node
      const { output } = prev;
      if (typeof (value) === 'function') {
        if (!(output instanceof Text)) throw new Error('actuate: got invalid DOM node');
        const nextValue = value(next);
        if (output.nodeValue !== nextValue) output.nodeValue = String(nextValue);
        return output;
      }
      // Don't update static text
      return output;
    }
    throw new Error('next and prev cannot be both null simultaneously');    
  }
}

export type Nested<Parent, Child> = { parent: Parent, here: Child };

/**
 * Create an html node which content is a dynamic list of child nodes
 */
export function array<Model, Action>(name: string, props: Props<Model, Action> = {}): <T extends any[]>(selector: (m: Model) => T, child: (h: H<Nested<Model, T[number]>, (idx: number) => Action>) => SDOM<Nested<Model, T[number]>, (idx: number) => Action>) => SDOM<Model, Action> {
  return (selector, child) => (prev, next) => {
    if (prev && !next) {
      // Destroy node
      const { output } = prev;
      const parent = prev.input;
      const xs = selector(parent);
      const data = output[SDOM_DATA];
      if (!(output instanceof HTMLElement)) throw new Error('actuate: got invalid DOM node');
      data && data.unlisten && data.unlisten();
      xs.forEach((here, idx) => {
        const ch = output.childNodes[idx] as any;
        child(h as any)({ output: ch, input: { parent, here } }, null);
      });
      return prev.output;      
    } else if (!prev && next) {
      // Create new DOM node
      const xs = selector(next);
      const el = elem(name, props)(null, next);
      xs.forEach((here, idx) => {
        const childEl = child(h as any)(null, { here, parent: next });
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
    } else if (prev && next) {
      // Update existing DOM node
      const el = prev.output;
      const xs = selector(next);
      const xsPrev = selector(prev.input);
      let lastInserted: Node|null = null;
      for (let i =  Math.max(xs.length, xsPrev.length) - 1; i >= 0; i--) {
        const childEl = el.childNodes[i] as any;
        const childPrev = i in xsPrev ? { output: childEl, input: { parent: next, here: xsPrev[i] } } : null;
        const childNext = i in xs ? { parent: next, here: xs[i] } : null;
        const nextEl = child(h as any)(childPrev, childNext);
        if (nextEl !== childEl) {
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
        !(i in xs) && el.removeChild(childEl);
        if (!(i in xsPrev)) {
          if (lastInserted) {
            el.insertBefore(nextEl, lastInserted);
            lastInserted = nextEl;
          } else {
            el.appendChild(nextEl);
            lastInserted = nextEl;
          }
        }
        (i in xs && i in xsPrev && nextEl !== childEl) && el.replaceChild(nextEl, childEl);
      }
      return el;
    }
    throw new Error('next and prev cannot be both null simultaneously');    
  }
}

/**
 * Change both type parameters inside `SDOM<Model, Action>`.
 */
export function dimap<M1, M2, A1, A2>(coproj: (m: M2) => M1, proj: (m: A1) => A2): (s: SDOM<M1, A1>) => SDOM<M2, A2> {
  return sdom => (prev, next) => {
    const chPrev = prev ? { output: prev.output as any, input: coproj(prev.input) } : null;
    const nextEl = sdom(chPrev, next ? coproj(next) : null);
    if (!prev || nextEl !== prev.output as any) {
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
    return nextEl as any;
  };
}

/**
 * Generic way to create `SDOM` which content is depends on some
 * condition on `Model`. First parameter checks this condition and
 * returns a key which points to the current `SDOM` inside `options`
 */
export function discriminate<Model, Action, K extends string>(discriminator: (m: Model) => K, options: Record<K, SDOM<Model, Action>>): SDOM<Model, Action> {
  return (prev, next) => {
    if (prev && !next) {
      // Destroy element
      const key = discriminator(prev.input);
      return options[key](prev, null);
    } else if (!prev && next) {
      // Create new node
      const key = discriminator(next);
      return options[key](prev, next);
    } else if (prev && next) {
      // Update existing text node
      const prevKey = discriminator(prev.input);
      const nextKey = discriminator(next);
      if (prevKey !== nextKey) {
        // Key is changed, so we don't update but switch to the new node
        return options[nextKey](null, next);
      }
      return options[nextKey](prev, next);
    }
    throw new Error('next and prev cannot be both null simultaneously');    
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
    private prev: Prev<Model, any>,
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
        const nextEl = this.sdom(this.prev, this.currentModel);
        if (nextEl !== this.prev.output) {
          this.rootEl.removeChild(this.prev.output);
          this.rootEl.appendChild(nextEl);
        }
        this.prev = { output: nextEl, input: this.currentModel };
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
    (name: string, ...rest: Array<Props<Model, Action>|SDOM<Model, Action>|string|number>): SDOM<Model, Action, HTMLElement>;
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
