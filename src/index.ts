export interface H<Model, Action> {
  
}

export const h = function h() {
  return sdom.elem.apply(void 0, arguments);
} as any as H<unknown, unknown>;

import * as sdom from './sdom';

export * from './sdom';
import './html';
export * from './html';
export * from './props';

export default function create<Model, Action>(): H<Model, Action> {
  return h as any;
}
