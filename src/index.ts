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


export type SDOM<Model> =
  | string|number|((m: Model) => string)
  | SDOMElement<Model>
  | SDOMText<Model>
  | SDOMTextThunk<Model>
  | SDOMDiscriminate<Model>
  | SDOMArray<Model>
  | SDOMPick<Model>
  | SDOMCustom<Model>
  | HasSDOM<Model>
  ;


export type SDOMAttribute<Model> =
  | SDOMAttr<Model>
  | SDOMProp<Model>
  | SDOMEvent<Model>
;

export class SDOMElement<Model> {
  constructor(
    public _name: string,
    public _attributes: Record<string, SDOMAttribute<Model>>,
    public _childs: SDOM<Model>[],
  ) {}

  attrs(attrs: Record<string, RawAttribute<Model>>) {
    for (const k in attrs) {
      if (!isAttribute(attrs[k])) attrs[k] = new SDOMAttr(attrs[k] as any);
    }
    Object.assign(this._attributes, attrs);
    return this;
  }
  
  props(attrs: Record<string, RawAttribute<Model>>) {
    for (const k in attrs) {
      if (!isAttribute(attrs[k])) attrs[k] = new SDOMProp(attrs[k] as any);
    }
    Object.assign(this._attributes, attrs);
    return this;
  }
  
  on(attrs: Record<string, Listener<Model>>) {
    for (const k in attrs) {
      attrs[k] = new SDOMEvent(attrs[k] as any) as any;
    }
    Object.assign(this._attributes, attrs);
    return this;
  }
  
  childs(...childs: SDOM<Model>[]) {
    this._childs = childs;
    return this;
  }
}

export type Listener<Model> = (e: Event, model: Model) => void;

export class SDOMText<Model> {
  constructor(
    readonly _value: string,
  ) {}
}

export class SDOMTextThunk<Model> {
  constructor(
    readonly _thunk: (model: Model) => string,
  ) {}
}

export class SDOMDiscriminate<Model> {
  constructor(
    readonly _discriminator: string[],
    readonly _tags: Record<string, SDOM<Model>>,
  ) {}
}

export class SDOMArray<Model> {
  constructor(
    readonly _discriminator: string,
    readonly _item: SDOM<any>,
    readonly _name: string,
    readonly _attributes: Record<string, SDOMAttribute<Model>>,
  ) {}
}

export class SDOMPick<Model, K extends (keyof Model)[] = (keyof Model)[]> {
  constructor(
    readonly _keys: K,
    readonly _sdom: SDOM<Pick<Model, K[number]>>,
  ) {}
}

export class SDOMCustom<Model > {
  constructor(
    readonly _create: (getModel: () => Model) => HTMLElement|Text,
    readonly _actuate: (el: HTMLElement|Text, getModel: () => Model, patch: Patch<Model>) => HTMLElement|Text,
  ) {}
}

export abstract class HasSDOM<Model > {
  abstract toSDOM(): SDOM<Model>;
}

export class SDOMAttr<Model> {
  constructor(
    readonly _value: string|number|boolean|((model: Model) => string|number|boolean),
  ) {}
}

export class SDOMProp<Model> {
  constructor(
    readonly _value: unknown|((model: Model) => unknown),
  ) {}
}

export class SDOMEvent<Model> {
  constructor(
    readonly _listener: (e: Event, model: Model) => void,
  ) {}  
}


function isAttribute(attr: unknown): attr is SDOMAttribute<any> {
  return attr instanceof SDOMAttr || attr instanceof SDOMProp || attr instanceof SDOMEvent;
}


export type Many<T> = T|T[];
export type RawAttribute<Model> = SDOMAttribute<Model>|string|number|boolean|((model: Model) => string|number|boolean);


export function h<Model>(name: string, attrs: Record<string, RawAttribute<Model>>, ...childs: SDOM<Model>[]): SDOMElement<Model>;
export function h<Model>(name: string, ...childs: SDOM<Model>[]): SDOMElement<Model>;
export function h<Model>() {
  // @ts-ignore
  const [name, attrs, childs]
    = arguments.length === 1 ? [arguments[0], {}, []]
    : (arguments[1] && arguments[1].constructor === Object) ? [arguments[0], arguments[1], Array.prototype.slice.call(arguments, 2)]
    : [arguments[0], {}, Array.prototype.slice.call(arguments, 1)];
  
  return new SDOMElement<Model>(name, prepareAttrs(name, attrs), Array.isArray(childs) ? childs : [childs])

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
      <Model>(...childs: SDOM<Model>[]): SDOMElement<Model>;
      <Model>(attrs: Record<string, RawAttribute<Model>>, ...childs: SDOM<Model>[]): SDOMElement<Model>;
  };
  
  export const div = h.bind(void 0, 'div') as BoundH;
  export const span = h.bind(void 0, 'span') as BoundH;
  export const button = h.bind(void 0, 'button') as BoundH;
  export const p = h.bind(void 0, 'p') as BoundH;
  export const h1 = h.bind(void 0, 'h1') as BoundH;
  export const h2 = h.bind(void 0, 'h2') as BoundH;
  export const h3 = h.bind(void 0, 'h3') as BoundH;
  export const input = <Model>(attrs: Record<string, RawAttribute<Model>>) => h('input', attrs);
  export const img = <Model>(attrs: Record<string, RawAttribute<Model>>) => h('img', attrs);
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


export namespace th {
  export type BoundH = {
      <Model>(template: TemplateStringsArray, ...args): SDOMElement<Model>;
  };
  
  export const div = h.bind(void 0, 'div') as BoundH;
  export const span = h.bind(void 0, 'span') as BoundH;
  export const button = h.bind(void 0, 'button') as BoundH;
  export const p = h.bind(void 0, 'p') as BoundH;
  export const h1 = h.bind(void 0, 'h1') as BoundH;
  export const h2 = h.bind(void 0, 'h2') as BoundH;
  export const h3 = h.bind(void 0, 'h3') as BoundH;
  export const input = <Model>(attrs: Record<string, SDOMAttribute<Model>>) => h('input', attrs);
  export const img = <Model>(attrs: Record<string, SDOMAttribute<Model>>) => h('img', attrs);
  export const label = h.bind(void 0, 'label') as BoundH;
  export const ul = h.bind(void 0, 'ul') as BoundH;
  export const li = h.bind(void 0, 'li') as BoundH;
  export const a = h.bind(void 0, 'a') as BoundH;
  export const table = h.bind(void 0, 'table') as BoundH;
  export const tbody = h.bind(void 0, 'tbody') as BoundH;
  export const thead = h.bind(void 0, 'thead') as BoundH;
  export const th = h.bind(void 0, 'th') as BoundH;
}


export function text(value: string) {
  return new SDOMText<{}>(value);
}

export function thunk<Model>(th: (model: Model) => string) {
  return new SDOMTextThunk<Model>(th);
}

export function pick<Model, K extends (keyof Model)[]>(keys: K, sdom: SDOM<Pick<Model, K[number]>>) {
  return new SDOMPick<Model, K>(keys, sdom);
}


export function discriminate<Model>(discriminator: keyof Model);
export function discriminate<Model, K extends keyof Model>(k1: K, k2: keyof Model[K]);
export function discriminate<Model>(...discriminators) {
  return <T extends Record<string, SDOM<Model>>>(tags: T) => new SDOMDiscriminate<Model>(discriminators, tags);
}

// @ts-ignore
type TK<M, K> = M[K][number];


export function array<Model, K extends keyof Model>(discriminator: K, child: SDOM<{ item: TK<Model, K>, model: Model }>);
export function array<Model, K extends keyof Model>(discriminator: K, name: string, child: SDOM<{ item: TK<Model, K>, model: Model }>);
export function array<Model, K extends keyof Model>(discriminator: K, name: string, attributes: Record<string, SDOMAttribute<Model>>, child: SDOM<{ item: TK<Model, K>, model: Model }>);
export function array<Model, K extends keyof Model>() {
  // @ts-ignore
  const [discriminator, name, attributes, child]
    = arguments.length === 2 ? [arguments[0], 'div', {}, arguments[1]]
    : arguments.length === 3 ? [arguments[0], arguments[1], {}, arguments[2]]
    : arguments
  ;
  
  return new SDOMPick<Model, K[]>([discriminator], new SDOMArray<Model>(discriminator, child, name, attributes));
}


export function attr<Model>(value: string|number|boolean|((model: Model) => string|number|boolean)): SDOMAttr<Model> {
  return new SDOMAttr(value);
}

export function prop<Model>(value: string|number|boolean|((model: Model) => string|number|boolean)): SDOMProp<Model> {
  return new SDOMProp(value);
}

export function event<Model>(listener: (e: Event, model: Model) => void): SDOMEvent<Model> {
  return new SDOMEvent(listener);
}


export function create<Model>(sdom: SDOM<Model>, getModel: () => Model): HTMLElement|Text {
  if (sdom instanceof SDOMElement) {
    const el = document.createElement(sdom._name);
    Object.keys(sdom._attributes).forEach(k => applyAttribute(k, sdom._attributes[k], el, getModel));
    sdom._childs.forEach(ch => el.appendChild(create(ch, getModel)));
    return el;
  }
  
  if (sdom instanceof SDOMText) {
    const el = document.createTextNode(sdom._value);
    return el;
  }
  
  if (sdom instanceof SDOMTextThunk) {
    const el = document.createTextNode(sdom._thunk(getModel()));
    return el;
  }
  
  if (typeof (sdom) === 'function') {
    const el = document.createTextNode(sdom(getModel()));
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

  if (sdom instanceof HasSDOM) {
    return create(sdom.toSDOM(), getModel);
  }

  ensure<string|number>(sdom);
  const el = document.createTextNode(sdom + '');
  return el;
}


export function actuate<Model>(el: HTMLElement|Text, sdom: SDOM<Model>, getModel: () => Model, patch: Patch<Model>): HTMLElement|Text {
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
  
  if (sdom instanceof SDOMTextThunk) {
    if (!(el instanceof Text)) throw new Error('actuate: got invalid DOM node');
    const next = sdom._thunk(getModel());
    if (el.nodeValue !== next) el.nodeValue = next;
    return el;
  }
  
  if (typeof (sdom) === 'function') {
    if (!(el instanceof Text)) throw new Error('actuate: got invalid DOM node');
    const next = sdom(getModel());
    if (el.nodeValue !== next) el.nodeValue = next;
    return el;
  }

  if (sdom instanceof SDOMText) {
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
  
  if (sdom instanceof HasSDOM) {
    return create(sdom.toSDOM(), getModel);
  }

  ensure<string|number>(sdom);
  return el;
}


function isReplace(patch: Patch<any>): boolean {
  if (patch instanceof Replace) return true;
  if (patch instanceof Batch) return patch._patches.reduce((acc, p) => acc || isReplace(p), false);
  return false;
}


function applyAttribute<Model>(name: string, sdomAttr: SDOMAttribute<Model>, el: HTMLElement, getModel: () => Model, patch?: Patch<Model>) {
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


function createEventListener<Model>(getModel: () => Model, cb: (e: Event, model: Model) => void): EventListener {
  return e => {
    cb(e, getModel());
  };
}


/** Helper for totality checking */
export function absurd(x: never): any {
  throw new Error('absurd: unreachable code');
}


export function ensure<T>(value: T): T {
  return value;
}

