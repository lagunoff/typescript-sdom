import { absurd } from './index';

export type Optic<S, T, A, B> =
  | Iso<S, T, A, B>
  | Lens<S, T, A, B>
  | Prism<S, T, A, B>
  | Compose<S, T, A, B>
;

export type Iso<S, T, A, B> = {
  apply: (s: S) => A;
  unapply: (b: B) => T;
};

export type Lens<S, T, A, B> = {
  getter: (s: S) => A;
  setter: (b: B, s: S) => T;
};

export type Prism<S, T, A, B> = {
  build: (b: B) => T;
  match: (s: S) => <X>(ifNotA: (t: T) => X, ifA: (a: A) => X) => X;
};

export type Compose<S, T, A, B, A1=unknown, B1=unknown> = {
  left: Optic<S, T, A1, B1>;
  right: Optic<A1, B1, A, B>;
};

// 2-parameter aliases
export type Optic1<S, A> = Optic<S, S, A, A>;
export type Iso1<S, A> = Iso<S, S, A, A>;
export type Lens1<S, A> = Lens<S, S, A, A>;
export type Prism1<S, A> = Prism<S, S, A, A>;
export type Compose1<S, A> = Compose<S, S, A, A>;

/**
 * Compose several different optics. Function can receive one or more
 * arguments with type-aligned `Optic`s, but type signatures exist
 * only for two parameters.
 * 
 *    const lens = optics.identityLens();
 *    const prism = optics.identityPrism();
 *    const iso = optics.identityIso();
 *    
 *    assert.isTrue(optics.isLens(optics.compose(lens, lens)));
 *    assert.isTrue(optics.isPrism(optics.compose(prism, prism)));
 *    assert.isTrue(optics.isIso(optics.compose(iso, iso)));
 *    assert.isTrue(optics.isLens(optics.compose(iso, lens)));
 *    assert.isTrue(optics.isPrism(optics.compose(iso, prism)));
 *    assert.isTrue(optics.isCompose(optics.compose(lens, prism)));
 */
export function compose<S, T, A, B, A1, B1>(left: Lens <S, T, A1, B1>, right: Lens <A1, B1, A, B>): Lens <S, T, A, B>;
export function compose<S, T, A, B, A1, B1>(left: Prism<S, T, A1, B1>, right: Prism<A1, B1, A, B>): Prism<S, T, A, B>;
export function compose<S, T, A, B, A1, B1>(left: Iso  <S, T, A1, B1>, right: Iso  <A1, B1, A, B>): Iso  <S, T, A, B>;
export function compose<S, T, A, B, A1, B1>(left: Iso  <S, T, A1, B1>, right: Lens <A1, B1, A, B>): Lens <S, T, A, B>;
export function compose<S, T, A, B, A1, B1>(left: Lens <S, T, A1, B1>, right: Iso  <A1, B1, A, B>): Lens <S, T, A, B>;
export function compose<S, T, A, B, A1, B1>(left: Iso  <S, T, A1, B1>, right: Prism<A1, B1, A, B>): Prism<S, T, A, B>;
export function compose<S, T, A, B, A1, B1>(left: Prism<S, T, A1, B1>, right: Iso  <A1, B1, A, B>): Prism<S, T, A, B>;
export function compose<S, T, A, B, A1, B1>(left: Optic<S, T, A1, B1>, right: Optic<A1, B1, A, B>): Optic<S, T, A, B>;
export function compose<R extends Optic<any, any, any, any>>(...args: Optic<any, any, any, any>[]): R;
export function compose(...args: Optic<any, any, any, any>[]): Optic<any, any, any, any> {
  if (args.length === 0) throw new TypeError(`compose: need at least one argument`);
  if (args.length === 1) return args[0];
  return args.reduce(composeTwo);
}

export function modify<S, T, A, B>(o: Optic<S, T, A, B>): (f: (a: A) => B) => (s: S) => T {
  if (isIso(o)) {
    return f => a => o.unapply(f(o.apply(a)));
  }
  if (isLens(o)) {
    return f => a => o.setter(f(o.getter(a)), a);
  }
  if (isPrism(o)) {
    return f => a => o.match(a)(a => a, b => o.build(f(b)));
  }
  if (isCompose(o)) {
    return f => modify(o.left)(modify(o.right)(f));
  }
  return absurd(o);
}

export function at<A, K1 extends keyof A>(k: K1): Lens1<A, A[K1]>;
export function at<A, K1 extends keyof A, K2 extends keyof A[K1]>(k1: K1, k2: K2): Lens1<A, A[K1][K2]>;
export function at<A, K1 extends keyof A, K2 extends keyof A[K1], K3 extends keyof A[K1][K2]>(k1: K1, k2: K2, k3: K3): Lens1<A, A[K1][K2][K3]>;
export function at(...keys): Lens1<any, any> {
  return {
    getter: obj => keys.reduce((acc, k) => acc[k], obj),
    setter: (prop, obj) => updateAt(keys, prop)(obj),
  };
}

export function pick<T, K extends Array<keyof T>>(...keys: K): Lens1<T, Pick<T, K[number]>> {
  return {
    getter: a => keys.reduce<any>((acc, k) => (acc[k] = a[k], acc), {}),
    setter: (b, a) => ({ ...a, ...b }),
  };
}

export function omit<T, K extends Array<keyof T>>(...keys: K): Lens1<T, Omit<T, K[number]>> {
  return {
    getter: a => Object.keys(a).reduce<any>((acc, k) => (keys.indexOf(k as any) === -1 && (acc[k] = a[k]), acc), {}),
    setter: (b, a) => ({ ...a, ...b }),
  };
}

export function isIso<S, T, A, B>(o: Optic<S, T, A, B>): o is Iso<S, T, A, B> {
  return o.hasOwnProperty('apply');
}

export function isLens<S, T, A, B>(o: Optic<S, T, A, B>): o is Lens<S, T, A, B> {
  return o.hasOwnProperty('getter');
}

export function isPrism<S, T, A, B>(o: Optic<S, T, A, B>): o is Prism<S, T, A, B> {
  return o.hasOwnProperty('build');
}

export function isCompose<S, T, A, B>(o: Optic<S, T, A, B>): o is Compose<S, T, A, B> {
  return o.hasOwnProperty('left');
}

export interface LensStatics<T> {
  at<K1 extends keyof T>(k: K1): Lens1<T, T[K1]>;
  at<K1 extends keyof T, K2 extends keyof T[K1]>(k1: K1, k2: K2): Lens1<T, T[K1][K2]>;
  at<K1 extends keyof T, K2 extends keyof T[K1], K3 extends keyof T[K1][K2]>(k1: K1, k2: K2, k3: K3): Lens1<T, T[K1][K2][K3]>;
  pick<K extends Array<keyof T>>(...keys: K): Lens1<T, Pick<T, K[number]>>;
  omit<K extends Array<keyof T>>(...keys: K): Lens1<T, Omit<T, K[number]>>;
}

export function Lens<T>(): LensStatics<T> {
  return { at, pick, omit };
}

export function identityIso<T>(): Iso1<T, T> {
  return {
    apply: a => a,
    unapply: a => a,
  };
}

export function identityLens<T>(): Lens1<T, T> {
  return {
    getter: a => a,
    setter: (a, _) => a,
  };
}

export function identityPrism<T>(): Prism1<T, T> {
  return {
    build: a => a,
    match: a => (_, ifB) => ifB(a),
  };
}

function composeTwo<A, B, C>(left: Optic1<A, B>, right: Optic1<B, C>): Optic1<A, C> {
  if (isIso(left) && isIso(right)) {
    return {
      apply: c => right.apply(left.apply(c)),
      unapply: a => left.unapply(right.unapply(a)),
    };
  }
  if (isLens(left) && isLens(right)) {
    return {
      getter: c => right.getter(left.getter(c)),
      setter: (a, c) => left.setter(right.setter(a, left.getter(c)), c),
    };
  }
  if (isPrism(left) && isPrism(right)) {
    return {
      build: c => left.build(right.build(c)),
      match: a => (ifNotC, ifC) => left.match(a)(ifNotC, b => right.match(b)(_ => ifNotC(a), ifC))
    };
  }
  if (isIso(left) && isLens(right)) {
    return {
      getter: c => right.getter(left.apply(c)),
      setter: (a, c) => left.unapply(right.setter(a, left.apply(c))),
    };
  }
  if (isIso(right) && isLens(left)) {
    return {
      getter: c => right.apply(left.getter(c)),
      setter: (a, c) => left.setter(right.unapply(a), c),
    };
  }
  if (isIso(left) && isPrism(right)) {
    return {
      build: c => left.unapply(right.build(c)),
      match: a => (ifNotC, ifC) => right.match(left.apply(a))(_ => ifNotC(a), ifC),
    };
  }
  if (isIso(right) && isPrism(left)) {
    return {
      build: c => left.build(right.unapply(c)),
      match: a => (ifNotC, ifC) => left.match(a)(ifNotC, b => ifC(right.apply(b))),
    };
  }
  return { left, right } as Compose1<A, C>;  
}

function updateAt(keys: string[], value: any): <A>(obj: A) => A {
  return obj => {
    let stack: any[] = [obj];
    let tail: any = stack[0];
    for (const k of keys) {
      if (!tail.hasOwnProperty(k)) return obj; // Property not found
      stack.push(tail[k]);
      tail = tail[k];
    }
    return stack.reduceRight((acc, x, idx) => {
      if (idx === stack.length - 1) return value;
      if (Array.isArray(x)) {
        const output = x.slice();
        output.splice(keys[idx] as any, 1, acc);
        return output;
      }
      return { ...x, [keys[idx]]: acc };
    }, value);
  };
}
