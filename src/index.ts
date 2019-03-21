const NODE_DATA = '__SDOM_CUSTOM_DATA__';

export type DFunc<A, B> = {
  (a: A): B;
  derive(da: Patch<A>, b: B): Patch<B>;
}

export type DLens<A, B> = {
  get: DFunc<A, B>;
  set(x: Patch<B>): Patch<A>;
}

export type InferPatch1<T>
  = T extends Array<infer A> ? ArrayPatch<A[]>
  : T extends object ? KeyPatch<T>|Replace<T>
  : Replace<T>;

export type InferPatch<T> = InferPatch1<T>|Batch<T>|T;
export type NonTrivialPatch<T> =
  | KeyPatch<T>
  | ArraySplice<T>
  | ArraySwap<T>
  | KeyPatch<T>
  | Batch<T>
;

export type Patch<T>
  // @ts-ignore
  = ArrayPatch<T>
  | KeyPatch<T>
  | Batch<T>
  | Replace<T>
;

export type ArrayPatch<A extends any[]> =
  | ArraySplice<A>
  | ArraySwap<A>
  | KeyPatch<A>
  | Replace<A>
;

export class ArraySplice<A> {
  constructor(
    readonly _index: number,
    readonly _removes: number,
    readonly _values: A,
  ) {}
}

export class ArraySwap<A> {
  constructor(
    readonly _firstIdx: number,
    readonly _secondIdx: number,
  ) {}
}

export class Batch<T> {
  constructor(
    readonly _patches: Patch<T>[],
  ) {}
}

export class Replace<T> {
  constructor(
    readonly _prev: T,
    readonly _next: T,
  ) {}
}

export class KeyPatch<A> {
  constructor(
    readonly _key: string|number,
    readonly _patch: Patch<any>,
  ) {}
}


export function applyPatch<T>(value: T, patch: Patch<T>, destructively = false): T {
  if (patch instanceof KeyPatch) {
    if (destructively) {
      // @ts-ignore
      value[patch._key] = applyPatch(value[patch._key], patch._patch, destructively);
      return value;
    } else {
      // @ts-ignore
      return { ...value, [patch._key]: applyPatch(value[patch._key], patch._patch, destructively) };
    }
  }

  if (patch instanceof ArraySplice) {
    if (destructively) {
      // @ts-ignore
      value.splice(patch._index, patch._removes, ...patch._values);
      return value;
    } else {
      // @ts-ignore
      const nextValue = value.slice(0); nextValue.splice(patch._index, patch._removes, ...patch._values);
      return nextValue;
    }
  }

  if (patch instanceof ArraySwap) {
    if (destructively) {
      // @ts-ignore
      const tmp = value[patch._firstIdx]; value[firstIdx] = value[secondIdx]; value[secondIdx] = tmp;
      return value;
    } else {
      // @ts-ignore
      const nextValue = value.slice(0); nextValue[firstIdx] = value[secondIdx]; nextValue[secondIdx] = value[firstIdx];
      return nextValue;
    }    
  }

  if (patch instanceof Batch) {
    return patch._patches.reduce<T>((acc, p) => applyPatch(acc, p, destructively), value);
  }

  if (patch instanceof Replace) {
    return patch._next;
  }
  
  return absurd(patch);
}


export type SDOM<Model, Action=never> =
  | SDOMElement<Model, Action>
  | SDOMText<Model, Action>
  | SDOMDiscriminate<Model, Action>
  | SDOMArray<Model, Action>
  | SDOMPick<Model, Action>
  | SDOMCustom<Model, Action>
  | SDOMMap<Model, Action>
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

// Base class is needed for instance method in `SDOM`
export class SDOMBase<Model, Action> {
  map<B>(proj: (action: Action) => B): SDOMMap<Model, B> {
    return new SDOMMap(this as any, proj);
  }
}

export class SDOMElement<Model, Action> extends SDOMBase<Model, Action> {
  constructor(
    public _name: string,
    public _attributes: Record<string, SDOMAttribute<Model, Action>>,
    public _childs: SDOM<Model, Action>[],
  ) { super(); }

  attrs(attrs: Record<string, RawAttribute<Model, Action>>) {
    for (const k in attrs) {
      if (!isAttribute(attrs[k])) attrs[k] = new SDOMAttr(attrs[k] as any);
    }
    Object.assign(this._attributes, attrs);
    return this;
  }
  
  props(attrs: Record<string, RawAttribute<Model, Action>>) {
    for (const k in attrs) {
      if (!isAttribute(attrs[k])) attrs[k] = new SDOMProp(attrs[k] as any);
    }
    Object.assign(this._attributes, attrs);
    return this;
  }
  
  on(attrs: Record<string, Listener<Model, Action>>) {
    for (const k in attrs) {
      attrs[k] = new SDOMEvent(attrs[k] as any) as any;
    }
    Object.assign(this._attributes, attrs);
    return this;
  }
  
  childs(...childs: SDOM<Model, Action>[]) {
    this._childs = childs;
    return this;
  }
}

export type Listener<Model, Action> = (e: Event, model: Model) => Action|void;



export class SDOMText<Model, Action> extends SDOMBase<Model, Action> {
  constructor(
    readonly _value: string|number|((m: Model) => string|number),
  ) { super(); }
}

export class SDOMDiscriminate<Model, Action> extends SDOMBase<Model, Action> {
  constructor(
    readonly _discriminator: string[],
    readonly _tags: Record<string, SDOM<Model, Action>>,
  ) { super(); }
}

export class SDOMArray<Model, Action> extends SDOMBase<Model, Action> {
  constructor(
    readonly _discriminator: string,
    readonly _item: SDOM<any, any>,
    readonly _name: string,
    readonly _attributes: Record<string, SDOMAttribute<Model, Action>>,
  ) { super(); }
}

export class SDOMPick<Model, Action> extends SDOMBase<Model, Action> {
  constructor(
    readonly _keys: Array<string|number|symbol>,
    readonly _sdom: SDOM<Partial<Model>, Action>,
  ) { super(); }
}

export class SDOMCustom<Model, Action> extends SDOMBase<Model, Action> {
  constructor(
    readonly _create: (getModel: () => Model) => HTMLElement|Text,
    readonly _actuate: (el: HTMLElement|Text, getModel: () => Model, patch: Patch<Model>) => HTMLElement|Text,
  ) { super(); }
}

class SDOMMap<Model, Action> extends SDOMBase<Model, Action> {
  constructor(
    readonly sdom: SDOM<Model, Action>,
    readonly proj: (x: any) => Action,
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
    readonly _listener: (e: Event, model: Model) => void,
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
}


export function text(value: string): SDOMText<{}, never> {
  return new SDOMText(value);
}


export function discriminate<Model, Action>(discriminator: keyof Model);
export function discriminate<Model, K extends keyof Model>(k1: K, k2: keyof Model[K]);
export function discriminate<Model, Action>(...discriminators) {
  return <T extends Record<string, SDOM<Model, Action>>>(tags: T) => new SDOMDiscriminate<Model, Action>(discriminators, tags);
}

// @ts-ignore
type TK<M, K> = M[K][number];


export function array<Model, Action, K extends keyof Model>(discriminator: K, child: SDOM<{ item: TK<Model, K>, model: Model }, Action>);
export function array<Model, Action, K extends keyof Model>(discriminator: K, name: string, child: SDOM<{ item: TK<Model, K>, model: Model }, Action>);
export function array<Model, Action, K extends keyof Model>(discriminator: K, name: string, attributes: Record<string, SDOMAttribute<Model, Action>>, child: SDOM<{ item: TK<Model, K>, model: Model }, Action>);
export function array<Model, Action, K extends keyof Model>() {
  // @ts-ignore
  const [discriminator, name, attributes, child]
    = arguments.length === 2 ? [arguments[0], 'div', {}, arguments[1]]
    : arguments.length === 3 ? [arguments[0], arguments[1], {}, arguments[2]]
    : arguments
  ;
  
  return new SDOMPick<Model, Action>([discriminator], new SDOMArray<Model, Action>(discriminator, child, name, attributes));
}


export function attr<Model, Action>(value: string|number|boolean|((model: Model) => string|number|boolean)): SDOMAttr<Model, Action> {
  return new SDOMAttr(value);
}

export function prop<Model, Action>(value: string|number|boolean|((model: Model) => string|number|boolean)): SDOMProp<Model, Action> {
  return new SDOMProp(value);
}

export function event<Model, Action>(listener: (e: Event, model: Model) => void): SDOMEvent<Model, Action> {
  return new SDOMEvent(listener);
}


export function create<Model, Action>(sdom: SDOM<Model, Action>, getModel: () => Model): HTMLElement|Text {
  if (sdom instanceof SDOMElement) {
    const el = document.createElement(sdom._name);
    Object.keys(sdom._attributes).forEach(k => applyAttribute(k, sdom._attributes[k], el, getModel));
    sdom._childs.forEach(ch => el.appendChild(create(ch, getModel)));
    return el;
  }
  
  if (sdom instanceof SDOMText) {
    const text = typeof (sdom._value) === 'function' ? sdom._value(getModel()) : sdom._value;
    const el = document.createTextNode(String(text));
    return el;
  }
    
  if (sdom instanceof SDOMDiscriminate) {
    const ch = sdom._tags[sdom._discriminator.reduce((acc, k) => acc[k], getModel())];
    const el = create(ch, getModel);
    if (el instanceof Text) throw new Error(`elements of discriminate should be DOM nodes, not text`);
    el.dataset.tag = sdom._discriminator.reduce((acc, k) => acc[k], getModel());
    return el;
  }
  
  if (sdom instanceof SDOMArray) {
    const array = getModel()[sdom._discriminator] as any[];
    const el = document.createElement(sdom._name);
    Object.keys(sdom._attributes).forEach(k => applyAttribute(k, sdom._attributes[k], el, getModel));
    const getChildModel = (idx) => () => ({ item: getModel()[sdom._discriminator][idx], model: getModel() });
    array.forEach((item, idx) => {
      const ch = create(sdom._item, getChildModel(idx));
      el.appendChild(ch);
    });
    return el;
  }
  
  if (sdom instanceof SDOMPick) {
    const el = create(sdom._sdom, getModel);
    return el;
  }
  
  if (sdom instanceof SDOMCustom) {
    return sdom._create(getModel);
  }
  
  if (sdom instanceof SDOMMap) {
    const el = create(sdom.sdom, getModel);
    el[NODE_DATA] = { proj: sdom.proj };
    return el;
  }
  
  return absurd(sdom);
}


export function actuate<Model, Action>(el: HTMLElement|Text, sdom: SDOM<Model, Action>, getModel: () => Model, patch: Patch<Model>): HTMLElement|Text {
  if (patch instanceof Batch) {
    return patch._patches.reduce((acc, p) => actuate(acc, sdom, getModel, p as any), el);
  }
  
  if (sdom instanceof SDOMElement) {
    if (!(el instanceof HTMLElement)) throw new Error('actuate: got invalid DOM node');
    Object.keys(sdom._attributes).forEach(k => applyAttribute(k, sdom._attributes[k], el, getModel, patch));
    sdom._childs.forEach((s, idx) => {
      const ch = el.childNodes[idx] as any;
      const nextCh = actuate(ch, s, getModel, patch);
      if (ch !== nextCh) el.replaceChild(nextCh, ch);
    });
    return el;
  }
    
  if (sdom instanceof SDOMText) {
    if (typeof (sdom._value) === 'function') {
      if (!(el instanceof Text)) throw new Error('actuate: got invalid DOM node');
      const next = sdom._value(getModel());
      if (el.nodeValue !== next) el.nodeValue = String(next);
      return el;
    }
    return el;
  }

  if (sdom instanceof SDOMDiscriminate) {
    if (el instanceof Text) throw new Error(`elements of discriminate should be DOM nodes, not text`);
    if (el.dataset.tag !== sdom._discriminator.reduce((acc, k) => acc[k], getModel())) {
      return create(sdom, getModel);
    }
    return actuate(el, sdom._tags[sdom._discriminator.reduce((acc, k) => acc[k], getModel())], getModel, patch);
  }

  if (sdom instanceof SDOMArray) {
    const array = getModel()[sdom._discriminator] as any[];
    // if (!(patch instanceof ObjectPatch)) throw new Error('actuate2: invalid patch');
    if (!(patch instanceof KeyPatch) || patch._key !== sdom._discriminator) {
      const getChildModel = (idx) => () => ({ item: getModel()[sdom._discriminator][idx], model: getModel() });
      array.forEach((item, idx) => {
        const ch = el.childNodes[idx] as HTMLElement;
        const chPatch = new KeyPatch('model', patch);
        const nextCh = actuate(ch, sdom._item, getChildModel(idx), chPatch);
        if (ch !== nextCh) {
          el.replaceChild(nextCh, ch);
        }
      })
      return el;
    };
    const p = patch._patch as ArrayPatch<any[]>;

    if (p instanceof ArraySplice) {
      for (let i = p._removes - 1; i >= 0; i--) {
        const ch = el.childNodes[p._index + i];
        el.removeChild(ch);
      }
      const getChildModel = (idx) => () => ({ item: getModel()[sdom._discriminator][idx], model: getModel() });
      p._values.forEach((item, idx) => {
        const ch = create(sdom._item, getChildModel(idx));
        el.insertBefore(ch, el.childNodes[p._index + idx] || null);
      });
      return el;
    }
    
    if (p instanceof KeyPatch) {
      const ch = el.childNodes[p._key] as HTMLElement;
      const chPatch = new KeyPatch('item', p._patch);
      const getChildModel = (idx) => () => ({ item: getModel()[sdom._discriminator][idx], model: getModel() });
      const nextCh = actuate(ch, sdom._item, getChildModel(p._key), chPatch);
      if (ch !== nextCh) el.replaceChild(nextCh, ch);
      return el;
    }

    if (p instanceof ArraySwap) {
      const ch1 = el.childNodes[p._firstIdx];
      const ch2 = el.childNodes[p._secondIdx];
      el.removeChild(ch2);
      el.insertBefore(ch2, ch1);
      el.removeChild(ch1);
      el.insertBefore(ch1, el.childNodes[p._secondIdx] || null);
      return el;
    }

    if (p instanceof Replace) {
      return create(sdom, getModel);
    }

    return absurd(p);
  }

  if (sdom instanceof SDOMPick) {
    if (patch instanceof KeyPatch) {
      if (sdom._keys.indexOf(patch._key as keyof Model) === -1) return el;
    }
    return actuate(el, sdom._sdom, getModel, patch);
  }

  if (sdom instanceof SDOMCustom) {
    return sdom._actuate(el, getModel, patch);
  }

  if (sdom instanceof SDOMMap) {
    const nextEl = actuate(el, sdom.sdom, getModel, patch);
    if (nextEl !== el) {
      nextEl[NODE_DATA] = { proj: sdom.proj, getModel };
    } else if (isReplace(patch)) {
      nextEl[NODE_DATA].model = applyPatch(nextEl[NODE_DATA].model, patch, true);
    }

    return nextEl;
  }
  return absurd(sdom);
}

function isReplace(patch: Patch<any>): boolean {
  if (patch instanceof Replace) return true;
  if (patch instanceof Batch) return patch._patches.reduce((acc, p) => acc || isReplace(p), false);
  return false;
}


function applyAttribute<Model, Action>(name: string, sdomAttr: SDOMAttribute<Model, Action>, el: HTMLElement, getModel: () => Model, patch?: Patch<Model>) {
  if (sdomAttr instanceof SDOMAttr) {
    const next = typeof(sdomAttr._value) === 'function' ? sdomAttr._value(getModel()) : sdomAttr._value;
    if (!patch || (el.getAttribute(name) !== next)) el.setAttribute(name, String(next));
  }
  
  if (sdomAttr instanceof SDOMProp) {
    const next = typeof(sdomAttr._value) === 'function' ? sdomAttr._value(getModel()) : sdomAttr._value;
    if (!patch || (el[name] !== next)) el[name] = next;
  }    

  if (patch) return;

  if (sdomAttr instanceof SDOMEvent) {
    el.addEventListener(name, createEventListener(getModel, sdomAttr._listener));
    return;
  }
  return;
}


function createEventListener<Model, Action>(getModel: () => Model, cb: (e: Event, model: Model) => Action|void): EventListener {
  return e => {
    let iter = e.target as HTMLElement|null;
    let action = void 0 as Action|void;
    let actionInitialized = false;
    
    for (; iter; iter = iter.parentElement) {
      const nodeData = iter[NODE_DATA];
      if (!nodeData) continue;
      if (!actionInitialized) {
        action = cb(e, getModel());
        actionInitialized = true;
        if (action === void 0) return;
      }

      if (actionInitialized && ('proj' in nodeData)) {
        action = nodeData.proj(action);
      }
    }
  };
}


/** Helper for totality checking */
export function absurd(x: never): any {
  throw new Error('absurd: unreachable code');
}


export function ensure<T>(value: T): T {
  return value;
}

