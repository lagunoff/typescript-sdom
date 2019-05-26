import { createVariant, Variant } from './variant';
import create, { SDOM, discriminate, id, SDOM_DATA, NestedModel, H, dimap } from '../../src';

const h = create<Model, Action>();

export type Model = {
  modal: Modal;
  tabs: Tabs;
};

export type Action2 = Variant<{
  Close: {};
  Tab: { tab: Tabs };
}>;

export type Action =
  | { tag: 'Close' }
  | { tag: 'Tab', tab: Tabs }
;


export type Modal = typeof Modal._A;
export const Modal = createVariant({
  None: {},
  ConfirmAction: (p: { action: Action }) => p,
});

export type Tabs = typeof Tabs._A;
export const Tabs = createVariant({
  Info: (p: { info: string }) => p,
  Comments: (p: { comments: string[] }) => p,
});


export type Tab = 
  | { tag: 'Info', info: string }
  | { tag: 'Comments', comments: string[] }

const s01: Action = { tag: 'Tab', tab: Tabs.Info({ info: '' }) };

export const view = h.div(
  h.ul(
    ...Object.keys(Tabs).map(k => h.li(k))
  ),
  
  variant(m => m.tabs, {
    Info: h => h.div(
      h.text(m => m.item.info)
    ),
    
    Comments: h => h.div(
      h.array(m => m.item.comments, 'ul', {}, h => h.li(h.text(m => m.item)))
    ),
  }),
);
 
function handleAction(action: Action) {
  return action;
}

let model: Model = { tabs: Tabs.Info({ info: 'isdhfsdjfhsdjfh' }), modal: Modal.None };
const container = document.createElement('div');
document.body.appendChild(container);
const sdom = h.dimap(id, handleAction)(view as any)
const el = sdom(null, model);
el[SDOM_DATA] = el[SDOM_DATA] || {};
el[SDOM_DATA].model = model;
container.appendChild(el);


export function variant<Model, Action, T>(discriminator: (m: Model) => Variant<T>, cases: VariantFn<T, Model, Action>): SDOM<Model, Action> {
  const cases_: any = {};
  for (const k in cases) {
    cases_[k] = dimap((parent: Model) => ({ parent, item: discriminator(parent)[1] as any }), (a => a(k)) as any)(cases[k](h as any));
  };
  return discriminate(m => discriminator(m)[0] as any, cases_);
}

export type VariantFn<T, Model, Action> = {
  [K in keyof T]: (h: H<NestedModel<Model, T[K]>, (k: K) => Action>) => SDOM<NestedModel<Model, T[K]>, (k: K) => Action>;
};

export type VariantOf<T> = T extends Variant<infer A> ? A : never;
