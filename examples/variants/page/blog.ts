import create from '../../../src';

const h = create<Model, Action>();

// Model
export type Model = {};

// Action
export type Action = never;

// View
export const view = h.div(
  'Blog',
);
