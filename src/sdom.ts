import { absurd } from './types';
import { Jet } from './incremental';
import { Patch, noop, isNoop, applyPatch, unapplyPatch } from './patch';


const NODE_DATA = '__SDOM_CUSTOM_DATA__';


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
  
  comap<B>(coproj: (b: Jet<B>) => Jet<Model>): SDOMComap<B, Action> {
    return new SDOMComap(this as any, coproj);
  }
  
  dimap<B, C>(coproj: (b: Jet<B>) => Jet<Model>, proj: (action: Action, model: B, el: HTMLElement) => C): SDOM<B, C> {
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
    readonly _actuate: (el: HTMLElement|Text, jet: Jet<Model>) => HTMLElement|Text,
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
    readonly _coproj: (b: Jet<Model>) => Jet<any>
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
export function array<Model, Action, K extends keyof Model>(discriminator: K, name: string, attributes: Record<string, RawAttribute<Model, Action>>, child: SDOM<{ item: TK<Model, K>, model: Model }, Action>): SDOM<Model, Action>;
export function array<Model, Action, K extends keyof Model>(): SDOM<Model, Action> {
  // @ts-ignore
  const [discriminator, name, attributes, child]
    = arguments.length === 2 ? [arguments[0], 'div', {}, arguments[1]]
    : arguments.length === 3 ? [arguments[0], arguments[1], {}, arguments[2]]
    : arguments
  ;
  
  return new SDOMArray<Model, Action>(discriminator, child, name, prepareAttrs(name, attributes));

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

export function event<Model, Action>(listener: (e: Event, model: Model) => void): SDOMEvent<Model, Action> {
  return new SDOMEvent(listener);
}


export function create<Model, Action>(sdom: SDOM<Model, Action>, getModel: () => Model): HTMLElement|Text {
  if (sdom instanceof SDOMElement) {
    const el = document.createElement(sdom._name);
    Object.keys(sdom._attributes).forEach(k => applyAttribute(k, sdom._attributes[k], el, Jet.of(getModel()), true));
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
    Object.keys(sdom._attributes).forEach(k => applyAttribute(k, sdom._attributes[k], el, Jet.of(getModel()), true));
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
    const _getModel = () => sdom._coproj(new Jet(getModel(), noop))._position;
    const el = create(sdom._value, _getModel);
    return el;
  }
  
  return absurd(sdom);
}


export function actuate<Model, Action>(el: HTMLElement|Text, sdom: SDOM<Model, Action>, jet: Jet<Model>): HTMLElement|Text {
  if (jet._velocity.tag === 'batch') {
    let model = jet._position;
    let elem = el;
    for (const p of jet._velocity.patches) {
      elem = actuate(elem, sdom, new Jet(model, p));
      model = applyPatch(model, p, true);
    }
    return elem;
  }
  
  if (sdom instanceof SDOMElement) {
    if (!(el instanceof HTMLElement)) throw new Error('actuate: got invalid DOM node');
    Object.keys(sdom._attributes).forEach(k => applyAttribute(k, sdom._attributes[k], el, jet, false));
    sdom._childs.forEach((s, idx) => {
      const ch = el.childNodes[idx] as any;
      const nextCh = actuate(ch, s, jet);
      if (ch !== nextCh) el.replaceChild(nextCh, ch);
    });
    return el;
  }
    
  if (sdom instanceof SDOMText) {
    if (typeof (sdom._value) === 'function') {
      if (!(el instanceof Text)) throw new Error('actuate: got invalid DOM node');
      const model = applyPatch(jet._position, jet._velocity, true);
      const next = sdom._value(model);
      if (el.nodeValue !== next) el.nodeValue = String(next);
      unapplyPatch(model, jet._velocity, true);
      return el;
    }
    return el;
  }

  if (sdom instanceof SDOMDiscriminate) {
    if (el instanceof Text) throw new Error(`elements of discriminate should be DOM nodes, not text`);
    if (el.dataset.tag !== sdom._discriminator.reduce((acc, k) => acc[k], jet._position)) {
      return create(sdom, () => jet._position);
    }
    return actuate(el, sdom._tags[sdom._discriminator.reduce((acc, k) => acc[k], jet._position)], jet);
  }

  if (sdom instanceof SDOMArray) {
    const array = jet._position[sdom._discriminator] as any[];
    if ((jet._velocity.tag !== 'key') || (jet._velocity.key !== sdom._discriminator)) {
      const getChildJet = (idx) => new Jet({ item: jet._position[sdom._discriminator][idx], model: jet._position, idx }, { tag: 'key', key: 'model', patch: jet._velocity });
      array.forEach((item, idx) => {
        const ch = el.childNodes[idx] as HTMLElement;
        const nextCh = actuate(ch, sdom._item, getChildJet(idx));
        if (ch !== nextCh) {
          el.replaceChild(nextCh, ch);
        }
      })
      return el;
    };

    return actuateArray(el as HTMLElement, sdom, jet._position, new Jet(array, jet._velocity.patch));
  }

  if (sdom instanceof SDOMPick) {
    if (jet._velocity.tag === 'key') {
      if (sdom._keys.indexOf(jet._velocity.key as keyof Model) === -1) return el;
    }
    return actuate(el, sdom._sdom, jet);
  }

  if (sdom instanceof SDOMCustom) {
    return sdom._actuate(el, jet);
  }

  if (sdom instanceof SDOMMap) {
    const nextEl = actuate(el, sdom._value, jet);
    if (nextEl !== el) {
      nextEl[NODE_DATA] = { proj: sdom._proj, jet };
    }

    return nextEl;
  }
  
  if (sdom instanceof SDOMComap) {
    const nextEl = actuate(el, sdom._value, sdom._coproj(jet));
    return nextEl;
  }
  
  return absurd(sdom);
}


function actuateArray<Model, Action>(el: HTMLElement, sdom: SDOMArray<Model, Action>, parent: any, jet: Jet<Model>): HTMLElement {
  const array = jet._position;
  const p = jet._velocity;

  if (p.tag === 'array-splice') {
    const { index, insert, remove } = p as any as SplicePatch<any[]>;
    for (let i = remove.length - 1; i >= 0; i--) {
      const ch = el.childNodes[index + i];
      el.removeChild(ch);
    }
    const getIdx = idx => idx < index ? array[idx] : idx >= index && idx < index + insert.length ? insert[idx - index] : array[idx - insert.length + remove.length];
    const getChildModel = (idx) => () => ({ item: getIdx(idx), model: parent, idx });
    insert.forEach((item, idx) => {
      const ch = create(sdom._item, getChildModel(index + idx));
      el.insertBefore(ch, el.childNodes[index + idx] || null);
    });
    return el;
  }
  
  if (p.tag === 'key') {
    const ch = el.childNodes[p.key] as HTMLElement;
    const getChildJet = (idx) => new Jet({ item: parent[sdom._discriminator][idx], model: parent, idx }, { tag: 'key', key: 'item', patch: p.patch });
    const nextCh = actuate(ch, sdom._item, getChildJet(p.key));
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
    return create(sdom, () => parent) as HTMLElement;
  }

  if (p.tag === 'batch') {
    let model = jet._position;
    let elem = el;
    for (const patch of p.patches) {
      elem = actuateArray(elem, sdom, parent, new Jet(model, patch));
      model = applyPatch(model, patch, true);
    }
    return elem;
  }
  
  return absurd(p);
}

function applyAttribute<Model, Action>(name: string, sdomAttr: SDOMAttribute<Model, Action>, el: HTMLElement, jet: Jet<Model>, create: boolean) {
  if (sdomAttr instanceof SDOMAttr) {
    const model = applyPatch(jet._position, jet._velocity, true);
    const next = typeof(sdomAttr._value) === 'function' ? sdomAttr._value(model) : sdomAttr._value;
    if (!el.hasAttribute(name)) {
      el.setAttribute(name, String(next));
      unapplyPatch(model, jet._velocity, true);
      return;
    }
    unapplyPatch(model, jet._velocity, true);
    // Either nothing changes or the new value is the same as previous
    if (isNoop(jet._velocity) || (el.getAttribute(name) == next)) return;
    el.setAttribute(name, String(next));
    return;
  }
  
  if (sdomAttr instanceof SDOMProp) {
    const model = applyPatch(jet._position, jet._velocity, true);
    const next = typeof(sdomAttr._value) === 'function' ? sdomAttr._value(model) : sdomAttr._value;
    unapplyPatch(model, jet._velocity, true);
    // Either nothing changes or the new value is the same as previous
    if ((el[name] == next)) return;
    el[name] = next;
    return;
  }    

  if (!create) return;

  if (sdomAttr instanceof SDOMEvent) {
    el.addEventListener(name, createEventListener(() => jet._position, sdomAttr._listener));
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


export type SplicePatch<T> = { tag: 'array-splice', index: number, remove: T, insert: T };
