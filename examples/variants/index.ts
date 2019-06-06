import { variantConstructor, Variant, VariantOf } from './variant';
import create, { SDOM, discriminate, Nested, H, dimap, attach } from '../../src';
import css from './css';
import * as home from './page/home';
import * as lorem from './page/lorem';
import * as parrot from './page/parrot';

const h = create<Model, Action>();

export type Model = {
  page: Page;
};

// Action
export type Action =
  | { tag: '@Children', key: keyof VariantOf<Page>, action: any }
  | { tag: 'Hash/change', hash: string }
;

// Pages
export const Page = variantConstructor<Page>();
export type Page = Variant<{
  Home: home.Model;
  Lorem: lorem.Model;
  Parrot: parrot.Model;
}>;

// Update
export function update(action: Action, model: Model): Model {
  switch (action.tag) {
    case 'Hash/change': {
      const page = pageFromHash(action.hash);
      return { ...model, page };
    }
  }
  throw 'Unimplemented';
}

// View
export const view = h(
  'main',
  h.nav(
    h.ul(
      h.li(h.a('Home', { href: '#/' })),
      h.li(h.a('Lorem Ipsum', { href: '#/lorem' })),
      h.li(h.a('Barking parrot', { href: '#/parrot' })),
    ),
  ),
  
  variant(m => m.page, {
    Home: renderChildren(home.view),
    Lorem: renderChildren(lorem.view),
    Parrot: renderChildren(parrot.view),
  }),

  h('style', { type: 'text/css' }, css),
);

function renderChildren<M, A>(childView: SDOM<M, A>) {
  return (h: H<Nested<Model, M>, (k: any) => Action>) => h.dimap(m => m.here, action => key => ({ tag: '@Children', key, action }))(childView);
}

function pageFromHash(hash: string): Page {
  if (hash === '#/lorem') return Page('Lorem', {});
  if (hash === '#/parrot') return Page('Parrot', {});
  return Page('Home', {});
}
 
function dispatch(action: Action) {
  const next = update(action, inst.currentModel);
  inst.stepper(next);
  console.log('action', action);
  console.log('next', next);
  console.log('-----------');
}

const init: Model = { page: pageFromHash(location.hash) };
const inst = attach(view, document.body, init, dispatch);


window.onpopstate = () => {
  dispatch({ tag: 'Hash/change', hash: location.hash });
};

export function variant<Model, Action, T>(discriminator: (m: Model) => Variant<T>, cases: VariantFn<T, Model, Action>): SDOM<Model, Action> {
  const cases_: any = {};
  for (const k in cases) {
    cases_[k] = dimap((parent: Model) => ({ parent, here: discriminator(parent)[1] as any }), (a => a(k)) as any)(cases[k](h as any));
  };
  return discriminate(m => discriminator(m)[0] as any, cases_);
}

export type VariantFn<T, Model, Action> = {
  [K in keyof T]: (h: H<Nested<Model, T[K]>, (k: K) => Action>) => SDOM<Nested<Model, T[K]>, (k: K) => Action>;
};
