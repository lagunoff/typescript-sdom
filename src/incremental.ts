import { Patch, noop, applyPatch, unapplyPatch, diff } from './patch';
import { absurd, ensure } from './types';

export class Jet<A> {
  static of = of;
  static fn = fn;
  
  constructor(
    readonly _position: A,
    readonly _velocity: Patch<A>,    
  ) { }
  
  key<K1 extends keyof A>(k: K1): Jet<A[K1]>;
  key<K1 extends keyof A, K2 extends keyof A[K1]>(k1: K1, k2: K2): Jet<A[K1][K2]>;
  key<K1 extends keyof A, K2 extends keyof A[K1], K3 extends keyof A[K1][K2]>(k1: K1, k2: K2, k3: K3): Jet<A[K1][K2][K3]>;
  key(...keys: string[]): Jet<any> {
    const velocity = keys.reduce((acc, key) => keyPatch(acc, key), this._velocity);
    const position = keys.reduce((acc, key) => acc[key], this._position);
    return new Jet(position, velocity);
  }
}


function keyPatch(patch: Patch<any>, key: string): Patch<any> {
  if (patch.tag === 'batch') return { tag: 'batch', patches: patch.patches.map(p => keyPatch(p, key)) };
  return patch.tag === 'key' && patch.key === key ? patch.patch
    : patch.tag === 'replace' ? { tag: 'replace', prev: patch.prev[key], next: patch.next[key] }
    : noop;  
}


export function merge<A, B>(a: Jet<A>, b: Jet<B>): Jet<A & B>;
export function merge<A, B, C>(a: Jet<A>, b: Jet<B>, c: Jet<C>): Jet<A & B & C>;
export function merge<A, B, C, D>(a: Jet<A>, b: Jet<B>, c: Jet<C>, d: Jet<D>): Jet<A & B & C & D>;
export function merge(...jets: Jet<any>[]): Jet<any> {
  return jets.reduce((acc, jet) => merge2(acc, jet));
}


export function merge2<A, B>(a: Jet<A>, b: Jet<B>): Jet<A & B> {
  const position = { ...a._position, ...b._position };
  const velocity = mergePatches(a._position, b._position, position, a._velocity, b._velocity,)
  return new Jet(position, velocity);  
}


export function mergePatches<A, B>(a: A, b: B, prev: A & B, pa: Patch<A>, pb: Patch<B>): Patch<A & B> {
  if (pa.tag === 'replace' || pb.tag === 'replace') {
    const anext = applyPatch(a, pa, true);
    const bnext = applyPatch(b, pb, true);
    const next = { ...anext, ...bnext };
    unapplyPatch(anext, pa, true);
    unapplyPatch(bnext, pb, true);
    return { tag: 'replace', prev, next };
  }

  if (pa.tag === 'array-splice' || pa.tag === 'array-swap' || pb.tag === 'array-splice' || pb.tag === 'array-swap') {
    throw new Error('found wrong type of patch, array-splice and array-swap cannot be applied to objects');
  }
  
  if (pa.tag === 'key') {
    if (pa.key in b) return pb as any;
    return { tag: 'batch', patches: [pa, pb as any] };
  }

  if (pa.tag === 'batch') {
    return { tag: 'batch', patches: [...pa.patches.map(pa2 => mergePatches(a, b, prev, pa2, noop)), pb as any] };
  }

  return absurd(pa);
}


function of<A>(value: A): Jet<A> {
  return new Jet(value, noop);
}

export type JetTuple<T> = { [K in keyof T]: Jet<T[K]> };


export function fn<Args extends any[], B>(fn: (...args: Args) => B): (...args: JetTuple<Args>) => Jet<B> {
  return (...args) => {
    const pArgs = args.map(jet => jet._position);
    const position = fn.apply(void 0, pArgs);
    pArgs.forEach((arg, idx) => pArgs[idx] = applyPatch(arg, args[idx]._velocity, true));
    const nextPosition = fn.apply(void 0, pArgs);
    const velocity = diff(position, nextPosition);
    pArgs.forEach((arg, idx) => pArgs[idx] = unapplyPatch(arg, args[idx]._velocity, true));
    return new Jet(position, velocity);    
  };
}


export function record<T>(fields: { [K in keyof T]: Jet<T[K]> }): Jet<T> {
  const keys = Object.keys(fields);
  const position = keys.reduce((acc, k) => (acc[k] = fields[k]._position, acc), {});
  const velocity: Patch<any> = { tag: 'batch', patches: keys.map(key => ({ tag: 'key', key, patch: fields[key]._velocity } as Patch<any>)) };
  return new Jet(position, velocity);
}


export const eq = fn((a: any, b: any) => a === b);
export const neg = fn((a: boolean) => !a);
export const if_then_else: <A, B>(cond: Jet<boolean>, a: Jet<A>, b: Jet<B>) => Jet<A|B> = fn((cond: boolean, a: any, b: any) => cond ? a : b);
