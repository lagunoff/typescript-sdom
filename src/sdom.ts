import { Props, attributes, Omit } from './props'
import { h, H } from './index';

export const SDOM_DATA = '__SDOM_DATA__';
export type SDOMData<Model, Action> = {
  proj?(action: unknown): Action;
  coproj?(model: Model): unknown;
  model?: Model;
  unlisten?: Function;
};

const sdomSymbol = Symbol('SDOM');
export type SDOM<Model, Msg, UI extends Node = Node> = Derivative<Model, UI & { [sdomSymbol]: [Model, Msg] }>;
export type Prev<Arg, Result> = { model: Arg, el: Result };
export type Derivative<Input, Output> = (prev: Prev<Input, Output>|null, next: Input|null) => Output;


// An opaque alias for HTMLElement|Text to distinguish the DOM nodes
// created by typescript-sdom
export type SDOMElement<Model, Action, Elem> = Elem & { [sdomSymbol]: [Model, Action] };


// SDOMInstance
export type SDOMInstance<Model, Action> = {
  rootEl: HTMLElement;
  currentModel: Model;
  prev: Prev<Model, any>;
  sdom: SDOM<Model, Action>;
  stepper(next: Model): void;
};

// Attach `SDOM` to the real DOM node
export function attach<Model, Action>(view: SDOM<Model, Action>, rootEl: HTMLElement, model: Model, sink: (a: Action) => void): SDOMInstance<Model, Action> {
  const sdom = dimap(id, (a: Action) => (sink(a), a))(view);
  const el = sdom(null, model);
  rootEl[SDOM_DATA] = rootEl[SDOM_DATA] || {};
  rootEl[SDOM_DATA].model = model;
  rootEl.appendChild(el);
  const prev: Prev<Model, any> = { el, model };
  const inst: SDOMInstance<Model, Action> = { rootEl, prev, currentModel: model, sdom, stepper() {} };
  
  // Borrowed from ELM
  const rAF =
    typeof requestAnimationFrame !== 'undefined'
    ? requestAnimationFrame
    : function(callback) { setTimeout(callback, 1000 / 60); };  
  inst.stepper = makeStepper(inst);
  return inst;

  function makeStepper(instance: Omit<SDOMInstance<Model, Action>, 'stepper'>){
    var state = 'NO_REQUEST';
    function updateIfNeeded() {
      switch (state) {
	case 'NO_REQUEST':
	  throw new Error(
	    'Unexpected draw callback.\n' +
	      'Please report this to <https://github.com/elm-lang/virtual-dom/issues>.'
	  );

	case 'PENDING_REQUEST':
	  rAF(updateIfNeeded);
	  state = 'EXTRA_REQUEST';
          const nextEl = instance.sdom(instance.prev, instance.currentModel);
          if (nextEl !== instance.prev.el) {
            instance.rootEl.removeChild(instance.prev.el);
            instance.rootEl.appendChild(nextEl);
          }
          instance.prev = { el: nextEl, model: instance.currentModel };
	  return;

	case 'EXTRA_REQUEST':
	  state = 'NO_REQUEST';
	  return;
      }
    }

    return function stepper(model) {
      if (instance.currentModel === model) return;
      if (state === 'NO_REQUEST') {
	rAF(updateIfNeeded);
      }
      state = 'PENDING_REQUEST';
      instance.currentModel = model;
      rootEl[SDOM_DATA].model = instance.currentModel;
    };
  }  
}


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
      const { el } = prev;
      const data = nodeData(el);
      if (!(el instanceof HTMLElement)) throw new Error('actuate: got invalid DOM node');
      data && data.unlisten && data.unlisten();
      childs.forEach((childSdom, idx) => {
        const ch = el.childNodes[idx] as any;
        childSdom({ el: ch, model: prev.model }, null);
      });
      return prev.el;
    } else if (!prev && next) {
      // Create new element
      const el = document.createElement(name);
      props.forEach(([k, v]) => el[k] = v);
      dynamicProps.forEach(([k, fn]) => el[k] = fn(next));
      attrs.forEach(([k, v]) => el.setAttribute(k, v));
      dynamicAttrs.forEach(([k, fn]) => el.setAttribute(k, fn(next)));
      events.forEach(([k, listener]) => el.addEventListener(k, createEventListener(listener)));
      childs.forEach(ch => el.appendChild(ch(null, next)));
      return pack(el);
    } else if (prev && next) {
      // Update existing element
      const { el } = prev;
      if (!(el instanceof HTMLElement)) throw new Error('actuate: got invalid DOM node');
      dynamicProps.forEach(([k, fn]) => el[k] = fn(next));
      dynamicAttrs.forEach(([k, fn]) => el.setAttribute(k, fn(next)));
      childs.forEach((childSdom, idx) => {
        const ch = el.childNodes[idx] as any;
        const nextCh = childSdom({ el: ch, model: prev.model }, next);
        if (ch !== nextCh) el.replaceChild(nextCh, ch);
      });
      return pack(el);
    }
    throw new Error('next and prev cannot be both null simultaneously');
  }
}

export function text<Model, Action>(value: string|number|((m: Model) => string|number)): SDOM<Model, Action, Text> {
  return (prev, next) => {
    if (prev && !next) {
      // Destroy element
      const { el } = prev;
      return prev.el;
    } else if (!prev && next) {
      // Create new text node
      const text = typeof(value) === 'function' ? value(next) : value;
      const el = document.createTextNode(String(text));
      return pack(el);      
    } else if (prev && next) {
      // Update existing text node
      const { el } = prev;
      if (typeof (value) === 'function') {
        if (!(el instanceof Text)) throw new Error('actuate: got invalid DOM node');
        const nextValue = value(next);
        if (el.nodeValue !== nextValue) el.nodeValue = String(nextValue);
        return el;
      }
      // Don't update static text
      return el;
    }
    throw new Error('next and prev cannot be both null simultaneously');    
  }
}

export type NestedModel<Parent, Child> = { parent: Parent, item: Child };


export function array<Model, Action>(name: string, props: Props<Model, Action> = {}): <T extends any[]>(selector: (m: Model) => T, child: (h: H<NestedModel<Model, T[number]>, (idx: number) => Action>) => SDOM<NestedModel<Model, T[number]>, (idx: number) => Action>) => SDOM<Model, Action> {
  return (selector, child) => (prev, next) => {
    if (prev && !next) {
      // Destroy node
      const { el } = prev;
      const parent = prev.model;
      const xs = selector(parent);
      const data = nodeData(el);
      if (!(el instanceof HTMLElement)) throw new Error('actuate: got invalid DOM node');
      data && data.unlisten && data.unlisten();
      xs.forEach((item, idx) => {
        const ch = el.childNodes[idx] as any;
        child(h as any)({ el: ch, model: { parent, item } }, null);
      });
      return prev.el;      
    } else if (!prev && next) {
      // Create new DOM node
      const xs = selector(next);
      const el = elem(name, props)(null, next);
      xs.forEach((item, idx) => {
        const childEl = child(h as any)(null, { item, parent: next });
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
      const { el } = prev;
      const xs = selector(next);
      const xsPrev = selector(prev.model);
      let lastInserted: SDOMElement<any,any, any>|null = null;
      for (let i =  Math.max(xs.length, xsPrev.length) - 1; i >= 0; i--) {
        const childEl = el.childNodes[i] as any as SDOMElement<any, any, any>;
        const childPrev = i in xsPrev ? { el: childEl, model: { parent: next, item: xsPrev[i] } } : null;
        const childNext = i in xs ? { parent: next, item: xs[i] } : null;
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

export function dimap<M1, M2, A1, A2>(coproj: (m: M2) => M1, proj: (m: A1) => A2): (s: SDOM<M1, A1>) => SDOM<M2, A2> {
  return sdom => (prev, next) => {
    const chPrev = prev ? { el: prev.el as any, model: coproj(prev.model) } : null;
    const nextEl = sdom(chPrev, next ? coproj(next) : null);
    if (!prev || nextEl !== prev.el as any) {
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


export function discriminate<Model, Action, K extends string>(discriminator: (m: Model) => K, variants: Record<K, SDOM<Model, Action>>): SDOM<Model, Action> {
  return (prev, next) => {
    if (prev && !next) {
      // Destroy element
      const { el } = prev;
      return prev.el;
    } else if (!prev && next) {
      // Create new text node
      return variants[discriminator(next)](prev, next);
    } else if (prev && next) {
      // Update existing text node
      const { el } = prev;
      const prevKey = discriminator(prev.model);
      const nextKey = discriminator(next);
      if (prevKey !== nextKey) {
        // Key is changed, so we don't update but create new node
        return variants[discriminator(next)](null, next);
      }
      return variants[discriminator(next)](prev, next);
    }
    throw new Error('next and prev cannot be both null simultaneously');    
  };
}


export type Many<T> = T|T[];


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


export function pack<Model, Action, Elem>(el: Elem): SDOMElement<Model, Action, Elem> {
  return el as any;
}
 
export function unpack<Elem>(el: SDOMElement<any, any, Elem>): Elem {
  return el as any;
}

export function nodeData<Model, Action>(el: SDOMElement<Model, Action, any>): SDOMData<Model, Action>|undefined {
  return el[SDOM_DATA];
}


declare module "./index" {
  export interface H<Model, Action> {
    (name: string, ...rest: Array<Props<Model, Action>|SDOM<Model, Action>|string|number>): SDOM<Model, Action, HTMLElement>;
    text(content: string|number|((m: Model) => string|number)): SDOM<Model, Action, Text>;
    array(name: string, props?: Props<Model, Action>): <T extends any[]>(selector: (m: Model) => T, child: (h: H<NestedModel<Model, T[number]>, (idx: number) => Action>) => SDOM<NestedModel<Model, T[number]>, (idx: number) => Action>) => SDOM<Model, Action>;
    discriminate<K extends string>(discriminator: (m: Model) => K, variants: Record<K, SDOM<Model, Action>>): SDOM<Model, Action>;
    dimap<M1, A1>(coproj: (m: Model) => M1, proj: (m: A1) => Action): (s: SDOM<M1, A1>) => SDOM<Model, Action>;
  }
}

h.text = text;
h.array = array;
h.discriminate = discriminate;
h.dimap = dimap;
