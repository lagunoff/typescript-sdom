import { Props, attributes } from './props'

export const SDOM_DATA = '__SDOM_DATA__';
export type SDOMData<Model, Action> = {
  proj?(action: unknown): Action;
  coproj?(model: Model): unknown;
  model?: Model;
  unlisten?: Function;
};

const sdomSymbol = Symbol('SDOM');
export type SDOM<Model, Action> = (prev: Prev<Model, Action>|null, next: Model|null) => SDOMElement<Model, Action>;

// An opaque alias for HTMLElement|Text to distinguish the DOM nodes
// created by typescript-sdom
export type SDOMElement<Model, Action> = (HTMLElement|Text) & { [sdomSymbol]: [Model, Action] };


export function h<Model, Action>(name: string, ...rest: Array<Props<Model, Action>|SDOM<Model, Action>|string|number>): SDOM<Model, Action> {
  const childs: SDOM<Model, Action>[] = [];
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

export function text<Model, Action>(value: string|number|((m: Model) => string|number)): SDOM<Model, Action> {
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

export function array<Model, Action, K extends keyof Model>(key: K, name: string, props: Props<Model, Action>, child: SDOM<{ item: TK<Model, K>, model: Model }, Action>): SDOM<Model, { action: Action, idx: number }> {
  const discriminator = a => a[key];
  
  return (prev, next) => {
    if (prev && !next) {
      // Destroy node
      const { el, model } = prev;
      const xs = discriminator(model);
      const data = nodeData(el);
      if (!(el instanceof HTMLElement)) throw new Error('actuate: got invalid DOM node');
      data && data.unlisten && data.unlisten();
      xs.forEach((item, idx) => {
        const ch = el.childNodes[idx] as any;
        child({ el: ch, model: { model, item } }, null);
      });
      return prev.el;      
    } else if (!prev && next) {
      // Create new DOM node
      const xs = discriminator(next);
      const el = h(name, props)(null, next);
      xs.forEach((item, idx) => {
        const childEl = child(null, { item, model: next });
        childEl[SDOM_DATA] = childEl[SDOM_DATA] || {};
        const { coproj, proj } = childEl[SDOM_DATA];
        childEl[SDOM_DATA].coproj = model => {
          const item = discriminator(model)[idx];
          model = { model, item };
          return coproj ? coproj(model) : model;
        };
        childEl[SDOM_DATA].proj = action => {
          if (proj) action = proj(action);
          return { action, idx };
        };
        el.appendChild(childEl);
      });
      return el as any;
    } else if (prev && next) {
      // Update existing DOM node
      const { el } = prev;
      const xs = discriminator(next);
      const xsPrev = discriminator(prev.model);
      let lastInserted: SDOMElement<any,any>|null = null;
      for (let i =  Math.max(xs.length, xsPrev.length) - 1; i >= 0; i--) {
        const childEl = el.childNodes[i] as any as SDOMElement<any, any>;
        const childPrev = i in xsPrev ? { el: childEl, model: { model: next, item: xsPrev[i] } } : null;
        const childNext = i in xs ? { model: next, item: xs[i] } : null;
        const nextEl = child(childPrev, childNext);
        if (nextEl !== childEl) {
          nextEl[SDOM_DATA] = nextEl[SDOM_DATA] || {};
          const { coproj, proj } = nextEl[SDOM_DATA];
          nextEl[SDOM_DATA].coproj = model => {
            const item = discriminator(model)[i];
            model = { model, item };
            return coproj ? coproj(model) : model;
          };
          nextEl[SDOM_DATA].proj = action => {
            if (proj) action = proj(action);
            return { action, idx: i };
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

// Previous result of rendering
export type Prev<Model, Action> = { el: SDOMElement<Model, Action>, model: Model };


export type Many<T> = T|T[];


type PropsOrChilds<Model, Action> = Props<any, any>|SDOM<any, any>|string|number|null|undefined;
type InferModel<T> = T extends PropsOrChilds<infer Model, any> ? Model : {};
type InferAction<T> = T extends PropsOrChilds<any, infer Action> ? Action : never;

  

export namespace h {
  export type BoundH = {
      <Rest extends PropsOrChilds<any, any>[]>(...rest: Rest): SDOM<InferModel<Rest[number]>, InferAction<Rest[number]>>;
  };
  
  export const div = h.bind(void 0, 'div') as BoundH;
  export const span = h.bind(void 0, 'span') as BoundH;
  export const button = h.bind(void 0, 'button') as BoundH;
  export const p = h.bind(void 0, 'p') as BoundH;
  export const h1 = h.bind(void 0, 'h1') as BoundH;
  export const h2 = h.bind(void 0, 'h2') as BoundH;
  export const h3 = h.bind(void 0, 'h3') as BoundH;
  export const input = <Model, Action>(...rest: Array<Props<Model, Action>>) => h('input', ...rest);
  export const img = <Model, Action>(...rest: Array<Props<Model, Action>>) => h('img', ...rest);
  export const label = h.bind(void 0, 'label') as BoundH;
  export const ul = h.bind(void 0, 'ul') as BoundH;
  export const li = h.bind(void 0, 'li') as BoundH;
  export const a = h.bind(void 0, 'a') as BoundH;
  export const tr = h.bind(void 0, 'tr') as BoundH;
  export const td = h.bind(void 0, 'td') as BoundH;
  export const table = h.bind(void 0, 'table') as BoundH;
  export const tbody = h.bind(void 0, 'tbody') as BoundH;
  export const thead = h.bind(void 0, 'thead') as BoundH;
  export const th = h.bind(void 0, 'th') as BoundH;
  export const section = h.bind(void 0, 'section') as BoundH;
  export const header = h.bind(void 0, 'header') as BoundH;
  export const footer = h.bind(void 0, 'footer') as BoundH;
}

// @ts-ignore
type TK<M, K> = M[K][number];


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


export function pack<Model, Action>(el: HTMLElement|Text): SDOMElement<Model, Action> {
  return el as any;
}
 
export function unpack(el: SDOMElement<any, any>): HTMLElement|Text {
  return el as any;
}

export function nodeData<Model, Action>(el: SDOMElement<Model, Action>): SDOMData<Model, Action>|undefined {
  return el[SDOM_DATA];
}
