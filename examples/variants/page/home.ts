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
    `This is an example of an SPA with simple synchronous routing. It uses library `,
    h.a('typescript-sdom', { href: `https://github.com/lagunoff/typescript-sdom` }), ` to display its UI, and shows `,
    h.a(h.code(`variant`), { href: 'https://github.com/lagunoff/typescript-sdom/blob/9a717bad1ffe0de4403851296e5d7fbde81b5287/examples/variants/index.ts#L64' }),
    ` helper is used to implement basic routing.`
  ),

  h.h2(`What is a `, h.code('Variant?')),
  h.p(
    h.code('Variant'), ' is another union type, similar to which ', h.a('typescript already has', { href: 'https://basarat.gitbooks.io/typescript/docs/types/discriminated-unions.html' }), '. ',
    'Variants are more convenient in certain situations because they utilize record types in their definitions. Record types can be modified through ',
    h.a(`Mapped types. `, { href: 'https://www.typescriptlang.org/docs/handbook/advanced-types.html#mapped-types' }),
  ),
  h.p(
    'In runtime variants are represented by a pair of a tag and the corresponding contents.'
  ),
);

