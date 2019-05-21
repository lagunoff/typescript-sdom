import { absurd } from './types';


export const SDOM_DATA = '__SDOM_DATA__';


export type SDOM<Model, Action=never> =
  | SDOMElement<Model, Action>
  | SDOMText<Model, Action>
  | SDOMArray<Model, Action>
  | SDOMCustom<Model, Action>
  | SDOMDiscriminate<Model, Action>
  | SDOMDimap<Model, Action>
  ;

export type RawSDOM<Model, Action> = SDOM<Model, Action>|string|number|((m: Model) => string|number);

export function prepareSDOM<Model, Action>(raw: RawSDOM<Model, Action>): SDOM<Model, Action> {
  if (raw instanceof SDOMBase) return raw;
  return new SDOMText(raw);
}

export type SDOMAttribute<Model, Action> =
  | SDOMAttr<Model, Action>
  | SDOMProp<Model, Action>
  | SDOMEvent<Model, Action>
;

// Previous result of rendering
export type Prev<Model> = { el: HTMLElement|Text, model: Model };

// Base class is needed for instance method in `SDOM`
export class SDOMBase<Model, Action> {
  map<B>(proj: (action: Action) => B): SDOMDimap<Model, B> {
    return this.dimap(id, proj);
  }
  
  comap<B>(coproj: (b: B) => Model): SDOMDimap<B, Action> {
    return this.dimap(coproj, id);
  }
  
  dimap<B, C>(coproj: (b: B) => Model, proj: (action: Action) => C): SDOMDimap<B, C> {
    return new SDOMDimap(this as any, coproj, proj);
  }
}

export class SDOMElement<Model, Action> extends SDOMBase<Model, Action> {
  constructor(
    public _name: string,
    public _attrs: Record<string, SDOMAttribute<Model, Action>>,
    public _childs: SDOM<Model, Action>[],
  ) { super(); }

  attrs(attrs: Record<string, RawAttribute<Model, Action>>) {
    for (const k in attrs) {
      if (!isAttribute(attrs[k])) attrs[k] = new SDOMAttr(attrs[k] as any);
    }
    Object.assign(this._attrs, attrs);
    return this;
  }
  
  props(attrs: Record<string, RawAttribute<Model, Action>>) {
    for (const k in attrs) {
      if (!isAttribute(attrs[k])) attrs[k] = new SDOMProp(attrs[k] as any);
    }
    Object.assign(this._attrs, attrs);
    return this;
  }
  
  on(attrs: Record<string, Listener<Model, Action>>) {
    for (const k in attrs) {
      attrs[k] = new SDOMEvent(attrs[k] as any) as any;
    }
    Object.assign(this._attrs, attrs);
    return this;
  }
  
  childs(...childs: RawSDOM<Model, Action>[]) {
    this._childs = childs.map(prepareSDOM);
    return this;
  }
}

export function nodeIndex(el: HTMLElement) {
  let iter: Node|null = el;
  let i = 0;
  while( (iter = iter.previousSibling) != null ) 
    i++;
  return i;
}

export type Listener<Model, Action> = (e: Event, model: Model) => Action|void;

export class SDOMText<Model, Action> extends SDOMBase<Model, Action> {
  constructor(
    readonly _value: string|number|((m: Model) => string|number),
  ) { super(); }
}

export class SDOMArray<Model, Action> extends SDOMBase<Model, Action> {
  constructor(
    readonly _discriminator: (m: Model) => any[],
    readonly _item: SDOM<any, any>,
    readonly _name: string,
    readonly _attrs: Record<string, SDOMAttribute<Model, Action>>,
  ) { super(); }
}

export class SDOMDiscriminate<Model, Action> extends SDOMBase<Model, Action> {
  constructor(
    readonly _discriminator: (m: Model) => string,
    readonly _tags: Record<string, SDOM<Model, Action>>,
  ) { super(); }
}

export class SDOMCustom<Model, Action> extends SDOMBase<Model, Action> {
  constructor(
    readonly _actuate: (prev: Prev<Model>|null, next: Model) => HTMLElement|Text,
  ) { super(); }
}

class SDOMDimap<Model, Action> extends SDOMBase<Model, Action> {
  constructor(
    readonly _value: SDOM<Model, Action>,
    readonly _coproj: (b: Model) => any,
    readonly _proj: (x: any) => Action,
  ) { super(); }
}

export class SDOMAttr<Model, Action> {
  constructor(
    readonly _value: string|number|boolean|((model: Model) => string|number|boolean),
  ) {}
}

export class SDOMProp<Model, Action> {
  constructor(
    readonly _value: unknown|((model: Model) => unknown),
  ) {}
}

export class SDOMEvent<Model, Action> {
  constructor(
    readonly _listener: (e: Event, model: Model) => Action|void,
  ) {}  
}

function isAttribute(attr: unknown): attr is SDOMAttribute<any, any> {
  return attr instanceof SDOMAttr || attr instanceof SDOMProp || attr instanceof SDOMEvent;
}

export type Many<T> = T|T[];
export type RawAttribute<Model, Action> = SDOMAttribute<Model, Action>|string|number|boolean|((model: Model) => string|number|boolean);

export function h<Model, Action=never>(name: string, attrs: Record<string, RawAttribute<Model, Action>>, ...childs: RawSDOM<Model, Action>[]): SDOMElement<Model, Action>;
export function h<Model, Action=never>(name: string, ...childs: RawSDOM<Model, Action>[]): SDOMElement<Model, Action>;
export function h<Model, Action=never>() {
  // @ts-ignore
  const [name, attrs, childs]
    = arguments.length === 1 ? [arguments[0], {}, []]
    : (arguments[1] && arguments[1].constructor === Object) ? [arguments[0], arguments[1], Array.prototype.slice.call(arguments, 2)]
    : [arguments[0], {}, Array.prototype.slice.call(arguments, 1)];
  
  return new SDOMElement<Model, Action>(name, prepareAttrs(name, attrs), (Array.isArray(childs) ? childs.map(prepareSDOM) : [prepareSDOM(childs)]) as any)

  function prepareAttrs(name: string, attrs) {
    for (const k in attrs) {
      if (!isAttribute(attrs[k])) attrs[k] = new SDOMAttr(attrs[k]);
    }
    if (name === 'a' && !('href' in attrs)) return { ...attrs, href: new SDOMAttr('javascript://void 0') };
    return attrs;
  }
}

export namespace h {
  export type BoundH = {
      <Model, Action=never>(...childs: RawSDOM<Model, Action>[]): SDOMElement<Model, Action>;
      <Model, Action=never>(attrs: Record<string, RawAttribute<Model, Action>>, ...childs: RawSDOM<Model, Action>[]): SDOMElement<Model, Action>;
  };
  
  export const div = h.bind(void 0, 'div') as BoundH;
  export const span = h.bind(void 0, 'span') as BoundH;
  export const button = h.bind(void 0, 'button') as BoundH;
  export const p = h.bind(void 0, 'p') as BoundH;
  export const h1 = h.bind(void 0, 'h1') as BoundH;
  export const h2 = h.bind(void 0, 'h2') as BoundH;
  export const h3 = h.bind(void 0, 'h3') as BoundH;
  export const input = <Model, Action=never>(attrs: Record<string, RawAttribute<Model, Action>>) => h('input', attrs);
  export const img = <Model, Action=never>(attrs: Record<string, RawAttribute<Model, Action>>) => h('img', attrs);
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

export function text(value: string): SDOMText<{}, never> {
  return new SDOMText(value);
}

// @ts-ignore
type TK<M, K> = M[K][number];


export function array<Model, Action, K extends keyof Model>(discriminator: K, child: SDOM<{ item: TK<Model, K>, model: Model }, Action>): SDOM<Model, { action: Action, idx: number }>;
export function array<Model, Action, K extends keyof Model>(discriminator: K, name: string, child: SDOM<{ item: TK<Model, K>, model: Model }, Action>): SDOM<Model, { action: Action, idx: number }>;
export function array<Model, Action, K extends keyof Model>(discriminator: K, name: string, attributes: Record<string, RawAttribute<Model, Action>>, child: SDOM<{ item: TK<Model, K>, model: Model }, Action>): SDOM<Model, { action: Action, idx: number }>;
export function array<Model, Action, K extends keyof Model>(): SDOM<Model, Action> {
  // @ts-ignore
  const [discriminator, name, attributes, child]
    = arguments.length === 2 ? [arguments[0], 'div', {}, arguments[1]]
    : arguments.length === 3 ? [arguments[0], arguments[1], {}, arguments[2]]
    : arguments
  ;
  
  return new SDOMArray<Model, Action>(m => m[discriminator], child, name, prepareAttrs(name, attributes));

  function prepareAttrs(name: string, attrs) {
    for (const k in attrs) {
      if (!isAttribute(attrs[k])) attrs[k] = new SDOMAttr(attrs[k]);
    }
    if (name === 'a' && !('href' in attrs)) return { ...attrs, href: new SDOMAttr('javascript://void 0') };
    return attrs;
  }  
}


export function attr<Model, Action>(value: string|number|boolean|((model: Model) => string|number|boolean)): SDOMAttr<Model, Action> {
  return new SDOMAttr(value);
}

export function prop<Model, Action>(value: string|number|boolean|((model: Model) => string|number|boolean)): SDOMProp<Model, Action> {
  return new SDOMProp(value);
}

export function event<Model, Action>(listener: (e: Event, model: Model) => void|Action): SDOMEvent<Model, Action> {
  return new SDOMEvent(listener);
}

export function actuate<Model, Action>(prev: Prev<Model>|null, next: Model, sdom: SDOM<Model, Action>): HTMLElement|Text {
  if (sdom instanceof SDOMElement) {
    if (!prev) {
      // Create new element
      const el = document.createElement(sdom._name);
      Object.keys(sdom._attrs).forEach(k => applyAttribute(k, sdom._attrs[k], el, null, next));
      sdom._childs.forEach(ch => el.appendChild(actuate(null, next, ch)));
      return el;      
    } else {
      // Update existing element
      const { el } = prev;
      if (!(el instanceof HTMLElement)) throw new Error('actuate: got invalid DOM node');
      Object.keys(sdom._attrs).forEach(k => applyAttribute(k, sdom._attrs[k], el, prev.model, next));
      sdom._childs.forEach((childSdom, idx) => {
        const ch = el.childNodes[idx] as any;
        const nextCh = actuate({ el: ch, model: prev.model }, next, childSdom);
        if (ch !== nextCh) el.replaceChild(nextCh, ch);
      });
      return el;
    }
  }
    
  if (sdom instanceof SDOMText) {
    if (!prev) {
      // Create new text node
      const text = typeof (sdom._value) === 'function' ? sdom._value(next) : sdom._value;
      const el = document.createTextNode(String(text));
      return el;      
    } else {
      // Update existing text node
      const { el } = prev;
      if (typeof (sdom._value) === 'function') {
        if (!(el instanceof Text)) throw new Error('actuate: got invalid DOM node');
        const nextValue = sdom._value(next);
        if (el.nodeValue !== nextValue) el.nodeValue = String(nextValue);
        return el;
      }
      // Don't update static text
      return el;
    }
  }

  if (sdom instanceof SDOMDiscriminate) {
    if (!prev) {
      // Create new node
      const ch = sdom._tags[sdom._discriminator(next)];
      return actuate(null, next, ch);
    } else {
      // Update existing node
      const { el } = prev;
      if (sdom._discriminator(prev.model) !== sdom._discriminator(next)) {
        return actuate(null, next, sdom._tags[sdom._discriminator(next)]);
      }
      return actuate(prev, next, sdom._tags[sdom._discriminator(next)]);
    }
  }

  if (sdom instanceof SDOMArray) {
    // Create new element
    const xs = sdom._discriminator(next);
    const el = document.createElement(sdom._name);
    Object.keys(sdom._attrs).forEach(k => applyAttribute(k, sdom._attrs[k], el, null, next));
    xs.forEach((item, idx) => {
      const childEl = actuate(null, { item, model: next }, sdom._item);
      childEl[SDOM_DATA] = childEl[SDOM_DATA] || {};
      const { coproj, proj } = childEl[SDOM_DATA];
      childEl[SDOM_DATA].coproj = model => {
        const item = sdom._discriminator(model)[idx];
        model = { model, item };
        return coproj ? coproj(model) : model;
      };
      childEl[SDOM_DATA].proj = action => {
        if (proj) action = proj(action);
        return { action, idx };
      };
      el.appendChild(childEl);
    });
    return el;
  }

  if (sdom instanceof SDOMCustom) {
    return sdom._actuate(prev, next);
  }

  if (sdom instanceof SDOMDimap) {
    const chPrev = prev ? { el: prev.el, model: sdom._coproj(prev.model) } : null;
    const nextEl = actuate(chPrev, sdom._coproj(next), sdom._value);
    if (!prev || nextEl !== prev.el) {
      nextEl[SDOM_DATA] = nextEl[SDOM_DATA] || {};
      const { coproj, proj } = nextEl[SDOM_DATA];
      nextEl[SDOM_DATA].coproj = model => {
        model = sdom._coproj(model);
        return coproj ? coproj(model) : model;
      };
      nextEl[SDOM_DATA].proj = action => {
        if (proj) action = proj(action);
        return sdom._proj(action);
      };
    }
    return nextEl;
  }
  return absurd(sdom);
}

function applyAttribute<Model, Action>(name: string, sdomAttr: SDOMAttribute<Model, Action>, el: HTMLElement, prev: Model|null, next: Model) {
  if (sdomAttr instanceof SDOMAttr) {
    const nextValue = typeof(sdomAttr._value) === 'function' ? sdomAttr._value(next) : sdomAttr._value;
    if (!el.hasAttribute(name)) {
      el.setAttribute(name, String(nextValue));
      return;
    }
    // Either nothing changes or the new value is the same as previous
    if ((el.getAttribute(name) == nextValue)) return;
    el.setAttribute(name, String(nextValue));
    return;
  }
  
  if (sdomAttr instanceof SDOMProp) {
    const nextValue = typeof(sdomAttr._value) === 'function' ? sdomAttr._value(next) : sdomAttr._value;
    // Either nothing changes or the new value is the same as previous
    if ((el[name] == nextValue)) return;
    el[name] = nextValue;
    return;
  }    

  // Do not re-attach event listeners
  if (prev) return;

  if (sdomAttr instanceof SDOMEvent) {
    el.addEventListener(name, createEventListener(sdomAttr._listener));
    return;
  }
  return;
}

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

const id = <A>(a: A) => a;
