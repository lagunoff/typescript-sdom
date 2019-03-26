import { absurd } from './types';
import { SplicePatch, Many } from './index';


// Calculate difference between two values
export function diff<A>(prev: A, next: A): Patch<A> {
  if (prev === next) return noop;
  // TODO: do the diffing
  return { tag: 'replace', prev, next };
}

// More convenient version of `Patch<T>`
export type Patch<T> =
  | { tag: 'replace', prev: T, next: T }
  | { tag: 'array-splice', index: number, remove: T, insert: T }
  | { tag: 'array-swap', first: any, firstIdx: number, second: any, secondIdx: number }
  | { tag: 'key', key: string|number, patch: Patch<any> }
  | { tag: 'batch', patches: Patch<T>[] }
;

// More convenient version of `Patch<T>`
export type RawPatch<T> =
  | RawPatchSimple<T>
  | RawPatchSimple<T>[];

export type RawPatchSimple<T> =
  | { $at: Many<string|number>, patch: RawPatch<any> }
  | { $splice: { index: number, remove: number, insert: T } }
  | { $swap: { first: number, second: number } }
  | { $remove: number }
  | { $push: T }
  | { $unshift: T }
  | { $replace: T }
  | { $batch: RawPatch<T>[] }
  | { $patch: Partial<T> }
;

// Coerce `RawPatch<T>` to `Patch<T>`
export function preparePatch<T>(value: T, patch: RawPatch<T>): Patch<T> {
  if (Array.isArray(patch)) {
    return { tag: 'batch', patches: patch.map(p => preparePatch(value, p)) };
  }

  if ('$batch' in patch) {
    return { tag: 'batch', patches: patch.$batch.map(p => preparePatch(value, p)) };
  }
    
  if ('$at' in patch) {
    const keys = Array.isArray(patch.$at) ? patch.$at : [patch.$at];
    const v = keys.reduce((acc, k) => acc[k], value);
    return keys.reduceRight<Patch<T>>((patch, key) => ({ tag: 'key', key, patch }), preparePatch(v, patch.patch));
  }
  
  if ('$replace' in patch) {
    return { tag: 'replace', prev: value, next: patch.$replace };
  } 

  if ('$patch' in patch) {
    return { tag: 'batch', patches: Object.keys(patch.$patch).map<Patch<any>>(key => ({ tag: 'key', key, patch: { tag: 'replace', prev: value[key], next: patch.$patch[key] } })) };
  }
 
  const v = value as any as any[];
  if ('$splice' in patch) {
    const { index, insert } = patch.$splice;
    const remove = v.slice(patch.$splice.index, patch.$splice.remove) as any;
    return { tag: 'array-splice', index, remove, insert };
  }
  
  if ('$swap' in patch) {
    const { first: firstIdx, second: secondIdx } = patch.$swap;
    return { tag: 'array-swap', first: v[firstIdx], firstIdx, second: v[secondIdx], secondIdx };
  }
  
  if ('$push' in patch) {
    const insert: any = Array.isArray(patch.$push) ? patch.$push : [patch.$push];
    const remove: any = [];
    const index = v.length;
    return { tag: 'array-splice', index, remove, insert };
  }
  
  if ('$unshift' in patch) {
    const insert: any = Array.isArray(patch.$unshift) ? patch.$unshift : [patch.$unshift];
    const remove: any = [];
    return { tag: 'array-splice', index: 0, remove, insert };
  }
  
  if ('$remove' in patch) {
    const remove: any = v.slice(patch.$remove, patch.$remove + 1);
    const insert: any = [];
    return { tag: 'array-splice', index: patch.$remove, remove, insert };
  }
  
  return absurd(patch);
}

export const noop: Patch<never> = { tag: 'batch', patches: [] };

// Get new version of `value` or mutate data in-place if `destructively` is true
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

  if (patch.tag === 'batch') {
    return patch.patches.reduce<T>((acc, p) => applyPatch(acc, p, destructively), value);
  }

  if (patch.tag === 'replace') {
    return patch.next;
  }
  
  const v = value as any as any[];
  
  if (patch.tag === 'array-splice') {
    const { index, insert, remove } = patch as any as SplicePatch<any[]>;
    if (remove.length !== 0 && v[index] !== remove[0]) {
      return v as any;
    }
    if (insert.length !== 0 && v[index] === insert[0]) {
      return v as any;
    }
    
    if (destructively) {
      v.splice(index, remove.length, ...insert);
      return v as any;
    } else {
      const nextValue = v.slice(0); nextValue.splice(index, remove.length, ...insert);
      return nextValue as any;
    }
  }

  if (patch.tag === 'array-swap') {
    if (v[patch.firstIdx] === patch.second) return v as any;
    if (destructively) {
      const tmp = v[patch.firstIdx]; v[patch.firstIdx] = v[patch.secondIdx]; v[patch.secondIdx] = tmp;
      return v as any;
    } else {
      const nextValue = v.slice(0); nextValue[patch.firstIdx] = value[patch.secondIdx]; nextValue[patch.secondIdx] = value[patch.firstIdx];
      return nextValue as any;
    }    
  }

  return absurd(patch);
}

// Inverse of `applyPatch`
export function unapplyPatch<A>(value: A, patch: Patch<A>, destructively = false): A {
  return applyPatch(value, inverse(patch), destructively);
}

// Make patch that does the opposite of `patch`
export function inverse<T>(patch: Patch<T>): Patch<T> {
  if (patch.tag === 'key') {
    return { tag: 'key', key: patch.key, patch: inverse(patch.patch) };
  }

  if (patch.tag === 'batch') {
    return { tag: 'batch', patches: patch.patches.map(inverse).reverse() };
  }

  if (patch.tag === 'replace') {
    const { prev, next } = patch;
    return { tag: 'replace', next: prev, prev: next };
  }
  
  if (patch.tag === 'array-splice') {
    const { index, insert, remove } = patch;
    return { tag: 'array-splice', index, remove: insert, insert: remove };
  }

  if (patch.tag === 'array-swap') {
    const { first, second, firstIdx, secondIdx } = patch;
    return { tag: 'array-swap', first: second, firstIdx: secondIdx, second: first, secondIdx: firstIdx };
  }

  return absurd(patch);  
}

// Check if `patch` does nothing
export function isNoop(patch: Patch<any>): boolean {
  if (patch.tag === 'batch') return patch.patches.reduce((acc, p) => acc && isNoop(p), true);
  if (patch.tag === 'key') return isNoop(patch.patch);
  return false;
}
