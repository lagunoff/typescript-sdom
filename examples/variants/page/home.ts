import create from '../../../src';

const h = create<Model, Action>();

// Model
export type Model = {};

// Action
export type Action = never;

// View
export const view = h.div(
  h.h2('Home'),
  h.p(
    `This is an example of a simple SPA. It's done using library called `,
    h.a('typescript-sdom', { href: `https://github.com/lagunoff/typescript-sdom` }), ` and `,
    h.a(h.code(`variant`), { href: 'https://github.com/lagunoff/typescript-sdom/blob/9a717bad1ffe0de4403851296e5d7fbde81b5287/examples/variants/index.ts#L64' }),
    ` helper is used to implement basic routing.`
  ),

  h.h2(h.a({ href: '#wtf', id: 'wtf' }), `What is a `, h.code('Variant?')),
);

