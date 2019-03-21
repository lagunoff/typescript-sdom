const NODE_DATA = '__SDOM_CUSTOM_DATA__';


export type DFunc<A, B> = {
  proj: (x: A) => B;
  projPatch: (x: Patch<A>) => Patch<B>;
};

export function zoom<A, K01 extends keyof A>(k: K01): DFunc<A, A[K01]>;
export function zoom<A, K01 extends keyof A, K02 extends keyof A[K01]>(k01: K01, k02: K02): DFunc<A, A[K01][K02]>;
export function zoom<A>(...keys): DFunc<A, any> {
  return {
    proj: (a: A) => keys.reduce((acc, k) => acc[k], a),
    projPatch: (aPatch: Patch<A>) => {
      let iter: Patch<any> = aPatch;
      for (const k of keys) {
        if (iter.tag === 'key' && iter.key === k) {
          iter = iter.patch;
          continue;
        }
        return noop;
      }
      return iter;
    },
  };
}


export type Patch<T> =
  | { tag: 'replace', prev: T, next: T }
  | { tag: 'array-splice', index: number, removes: number, inserts: T[] }
  | { tag: 'array-swap', first: number, second: number }
  | { tag: 'key', key: string|number, patch: Patch<any> }
  | { tag: 'batch', patches: Patch<T>[] }
;

export type RawPatch<T> =
  | RawPatchSimple<T>
  | RawPatchSimple<T>[];

export type RawPatchSimple<T> =
  | { $at: Many<string|number>, patch: RawPatch<any> }
  | { $splice: { index: number, removes: number, inserts: T[] } }
  | { $swap: { first: number, second: number } }
  | { $remove: number }
  | { $push: Many<T> }
  | { $unshift: Many<T> }
  | { $replace: T }
  | { $batch: RawPatch<T>[] }
  | { $patch: Partial<T> }
;

export function preparePatch<T>(value: T, patch: RawPatch<T>): Patch<T> {
  if (Array.isArray(patch)) {
    return { tag: 'batch', patches: patch.map(p => preparePatch(value, p)) };
  }
  
  if ('$at' in patch) {
    const keys = Array.isArray(patch.$at) ? patch.$at : [patch.$at];
    const v = keys.reduce((acc, k) => acc[k], value);
    return keys.reduceRight<Patch<T>>((patch, key) => ({ tag: 'key', key, patch }), preparePatch(v, patch.patch));
  }

  if ('$splice' in patch) {
    const { index, removes, inserts } = patch.$splice;
    return { tag: 'array-splice', index, removes, inserts };
  }
  
  if ('$swap' in patch) {
    const { first, second } = patch.$swap;
    return { tag: 'array-swap', first, second };
  }
  
  if ('$push' in patch) {
    const v = value as any as any[];
    const inserts = Array.isArray(patch.$push) ? patch.$push : [patch.$push];
    const index = v.length;
    return { tag: 'array-splice', index, removes: 0, inserts };
  }
  
  if ('$unshift' in patch) {
    const inserts = Array.isArray(patch.$unshift) ? patch.$unshift : [patch.$unshift];
    return { tag: 'array-splice', index: 0, removes: 0, inserts };
  }
  
  if ('$replace' in patch) {
    return { tag: 'replace', prev: value, next: patch.$replace };
  }
  
  if ('$batch' in patch) {
    return { tag: 'batch', patches: patch.$batch.map(p => preparePatch(value, p)) };
  }
  
  if ('$patch' in patch) {
    return { tag: 'batch', patches: Object.keys(patch.$patch).map<Patch<any>>(key => ({ tag: 'key', key, patch: { tag: 'replace', prev: value[key], next: patch.$patch[key] } })) };
  }
  
  if ('$remove' in patch) {
    return { tag: 'array-splice', index: patch.$remove, removes: 1, inserts: [] };
  }
  
  return absurd(patch);
}

export const noop: Patch<never> = { tag: 'batch', patches: [] };


export function applyPatch<T>(value: T, patch: Patch<T>, destructively = false): T {
  if (patch.tag === 'key') {
    if (destructively) {
      value[patch.key] = applyPatch(value[patch.key], patch.patch, destructively);
      return value;
    } else {
      if (Array.isArray(value)) {
        const output = value.slice();
        output.splice(patch.key as number, 1, applyPatch(value[patch.key], patch.patch, destructively));
        return output as any;
      }
      return { ...value, [patch.key]: applyPatch(value[patch.key], patch.patch, destructively) };
    }
  }

  if (patch.tag === 'array-splice') {
    const v = value as any as any[];
    if (destructively) {
      v.splice(patch.index, patch.removes, ...patch.inserts);
      return v as any as T;
    } else {
      const nextValue = v.slice(0); nextValue.splice(patch.index, patch.removes, ...patch.inserts);
      return nextValue as any as T;
    }
  }

  if (patch.tag === 'array-swap') {
    const v = value as any as any[];
    if (destructively) {
      const tmp = v[patch.first]; v[patch.first] = v[patch.second]; v[patch.second] = tmp;
      return v as any as T;
    } else {
      const nextValue = v.slice(0); nextValue[patch.first] = value[patch.second]; nextValue[patch.second] = value[patch.first];
      return nextValue as any as T;
    }    
  }

  if (patch.tag === 'batch') {
    return patch.patches.reduce<T>((acc, p) => applyPatch(acc, p, destructively), value);
  }

  if (patch.tag === 'replace') {
    return patch.next;
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
  | SDOMComap<Model, Action>
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
  
  comap<B>(coproj: DFunc<B, Model>): SDOMComap<B, Action> {
    return new SDOMComap(this as any, coproj);
  }
  
  dimap<B, C>(coproj: DFunc<B, Model>, proj: (action: Action, model: B, el: HTMLElement) => C): SDOM<B, C> {
    return new SDOMMap(new SDOMComap(this as any, coproj), proj as any);
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
    readonly _value: SDOM<Model, Action>,
    readonly _proj: (x: any, model: Model) => Action,
  ) { super(); }
}

class SDOMComap<Model, Action> extends SDOMBase<Model, Action> {
  constructor(
    readonly _value: SDOM<any, Action>,
    readonly _coproj: DFunc<Model, any>,
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


export function discriminate<Model, Action>(discriminator: keyof Model);
export function discriminate<Model, K extends keyof Model>(k1: K, k2: keyof Model[K]);
export function discriminate<Model, Action>(...discriminators) {
  return <T extends Record<string, SDOM<Model, Action>>>(tags: T) => new SDOMDiscriminate<Model, Action>(discriminators, tags);
}

// @ts-ignore
type TK<M, K> = M[K][number];


export function array<Model, Action, K extends keyof Model>(discriminator: K, child: SDOM<{ item: TK<Model, K>, model: Model }, Action>): SDOM<Model, Action>;
export function array<Model, Action, K extends keyof Model>(discriminator: K, name: string, child: SDOM<{ item: TK<Model, K>, model: Model }, Action>): SDOM<Model, Action>;
export function array<Model, Action, K extends keyof Model>(discriminator: K, name: string, attributes: Record<string, SDOMAttribute<Model, Action>>, child: SDOM<{ item: TK<Model, K>, model: Model }, Action>): SDOM<Model, Action>;
export function array<Model, Action, K extends keyof Model>(): SDOM<Model, Action> {
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
    const el = create(sdom._value, getModel);
    el[NODE_DATA] = { proj: sdom._proj, getModel };
    return el;
  }
  
  if (sdom instanceof SDOMComap) {
    const _getModel = () => sdom._coproj.proj(getModel());
    const el = create(sdom._value, _getModel);
    return el;
  }
  
  return absurd(sdom);
}


export function actuate<Model, Action>(el: HTMLElement|Text, sdom: SDOM<Model, Action>, getModel: () => Model, patch: Patch<Model>): HTMLElement|Text {
  if (patch.tag === 'batch') {
    return patch.patches.reduce((acc, p) => actuate(acc, sdom, getModel, p as any), el);
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
    if (patch.tag !== 'key' || patch.key !== sdom._discriminator) {
      const getChildModel = (idx) => () => ({ item: getModel()[sdom._discriminator][idx], model: getModel(), idx });
      array.forEach((item, idx) => {
        const ch = el.childNodes[idx] as HTMLElement;
        const chPatch: Patch<any> = { tag: 'key', key: 'model', patch };
        const nextCh = actuate(ch, sdom._item, getChildModel(idx), chPatch);
        if (ch !== nextCh) {
          el.replaceChild(nextCh, ch);
        }
      })
      return el;
    };
    const p = patch.patch as Patch<any>;

    if (p.tag === 'array-splice') {
      for (let i = p.removes - 1; i >= 0; i--) {
        const ch = el.childNodes[p.index + i];
        el.removeChild(ch);
      }
      const getChildModel = (idx) => () => ({ item: getModel()[sdom._discriminator][idx], model: getModel(), idx });
      p.inserts.forEach((item, idx) => {
        const ch = create(sdom._item, getChildModel(p.index + idx));
        el.insertBefore(ch, el.childNodes[p.index + idx] || null);
      });
      return el;
    }
    
    if (p.tag === 'key') {
      const ch = el.childNodes[p.key] as HTMLElement;
      const chPatch: Patch<any> = { tag: 'key', key: 'item', patch: p.patch };
      const getChildModel = (idx) => () => ({ item: getModel()[sdom._discriminator][idx], model: getModel(), idx });
      const nextCh = actuate(ch, sdom._item, getChildModel(p.key), chPatch);
      if (ch !== nextCh) el.replaceChild(nextCh, ch);
      return el;
    }

    if (p.tag === 'array-swap') {
      const ch1 = el.childNodes[p.first];
      const ch2 = el.childNodes[p.second];
      el.removeChild(ch2);
      el.insertBefore(ch2, ch1);
      el.removeChild(ch1);
      el.insertBefore(ch1, el.childNodes[p.second] || null);
      return el;
    }

    if (p.tag === 'replace') {
      return create(sdom, getModel);
    }

    if (p.tag === 'batch') {
      throw new Error('[actuate]: unimplemented');
    }
    
    return absurd(p);
  }

  if (sdom instanceof SDOMPick) {
    if (patch.tag === 'key') {
      if (sdom._keys.indexOf(patch.key as keyof Model) === -1) return el;
    }
    return actuate(el, sdom._sdom, getModel, patch);
  }

  if (sdom instanceof SDOMCustom) {
    return sdom._actuate(el, getModel, patch);
  }

  if (sdom instanceof SDOMMap) {
    const nextEl = actuate(el, sdom._value, getModel, patch);
    if (nextEl !== el) {
      nextEl[NODE_DATA] = { proj: sdom._proj, getModel };
    }

    return nextEl;
  }
  
  if (sdom instanceof SDOMComap) {
    const _getModel = () => sdom._coproj.proj(getModel());
    const nextEl = actuate(el, sdom._value, _getModel, sdom._coproj.projPatch(patch));
    return nextEl;
  }
  
  return absurd(sdom);
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
      if ('getModel' in nodeData) getModel = nodeData.getModel;
      if (!actionInitialized) {
        action = cb(e, getModel());
        actionInitialized = true;
        if (action === void 0) return;
      }

      if (actionInitialized && ('proj' in nodeData)) {
        action = nodeData.proj(action, getModel(), iter);
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

