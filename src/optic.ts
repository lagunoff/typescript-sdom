import { absurd } from './index';

// Very basic concrete optics

export type Optic<A, B> =
  | Iso<A, B>
  | Lens<A, B>
  | Prism<A, B>
  | Compose<A, B>
;

export type Iso<A, B> = {
  apply: (a: A) => B;
  unapply: (b: B) => A;
};

export type Lens<A, B> = {
  getter: (a: A) => B;
  setter: (b: B, a: A) => A;
};

export type Prism<A, B> = {
  build: (b: B) => A;
  match: (a: A) => <T>(ifNotB: (a: A) => T, ifB: (b: B) => T) => T;
};

export type Compose<A, C, B=unknown> = {
  left: Optic<A, B>;
  right: Optic<B, C>;
};

export function modify<A, B>(o: Optic<A, B>): (f: (b: B) => B) => (a: A) => A {
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

export function compose<A, B, C>(left: Iso<A, B>, right: Iso<B, C>): Iso<A, C>;
export function compose<A, B, C>(left: Lens<A, B>, right: Lens<B, C>): Iso<A, C>;
export function compose<A, B, C>(left: Prism<A, B>, right: Prism<B, C>): Prism<A, C>;
export function compose<A, B, C>(left: Optic<A, B>, right: Optic<B, C>): Optic<A, C>;
export function compose<R extends Optic<any, any>>(...args: Optic<any, any>[]): R;
export function compose(...args: Optic<any, any>[]): Optic<any, any> {
  if (args.length === 0) throw new TypeError(`compose: need at least one argument`);
  if (args.length === 1) return args[0];
  return args.reduce(composeTwo);

  function composeTwo<A, B, C>(left: Optic<A, B>, right: Optic<B, C>): Optic<A, C> {
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
    return { left, right } as Compose<A, C>;  
  }
}

export function at<A, K1 extends keyof A>(k: K1): Lens<A, A[K1]>;
export function at<A, K1 extends keyof A, K2 extends keyof A[K1]>(k1: K1, k2: K2): Lens<A, A[K1][K2]>;
export function at<A, K1 extends keyof A, K2 extends keyof A[K1], K3 extends keyof A[K1][K2]>(k1: K1, k2: K2, k3: K3): Lens<A, A[K1][K2][K3]>;
export function at(...keys): Lens<any, any> {
  return {
    getter: obj => keys.reduce((acc, k) => acc[k], obj),
    setter: (prop, obj) => updateAt(keys, prop)(obj),
  };
}

export function pick<T, K extends Array<keyof T>>(...keys: K): Lens<T, Pick<T, K[number]>> {
  return {
    getter: a => keys.reduce<any>((acc, k) => (acc[k] = a[k], acc), {}),
    setter: (b, a) => ({ ...a, ...b }),
  };
}

export function omit<T, K extends Array<keyof T>>(...keys: K): Lens<T, Omit<T, K[number]>> {
  return {
    getter: a => Object.keys(a).reduce<any>((acc, k) => (keys.indexOf(k as any) === -1 && (acc[k] = a[k]), acc), {}),
    setter: (b, a) => ({ ...a, ...b }),
  };
}

export function isIso<A, B>(o: Optic<A, B>): o is Iso<A, B> {
  return o.hasOwnProperty('apply');
}

export function isLens<A, B>(o: Optic<A, B>): o is Lens<A, B> {
  return o.hasOwnProperty('getter');
}

export function isPrism<A, B>(o: Optic<A, B>): o is Prism<A, B> {
  return o.hasOwnProperty('build');
}

export function isCompose<A, B>(o: Optic<A, B>): o is Compose<A, B> {
  return o.hasOwnProperty('left');
}

export interface LensStatics<T> {
  at<K1 extends keyof T>(k: K1): Lens<T, T[K1]>;
  at<K1 extends keyof T, K2 extends keyof T[K1]>(k1: K1, k2: K2): Lens<T, T[K1][K2]>;
  at<K1 extends keyof T, K2 extends keyof T[K1], K3 extends keyof T[K1][K2]>(k1: K1, k2: K2, k3: K3): Lens<T, T[K1][K2][K3]>;
  pick<K extends Array<keyof T>>(...keys: K): Lens<T, Pick<T, K[number]>>;
  omit<K extends Array<keyof T>>(...keys: K): Lens<T, Omit<T, K[number]>>;
}

export function Lens<T>(): LensStatics<T> {
  return { at, pick, omit };
}

export function identityIso<T>(): Iso<T, T> {
  return {
    apply: a => a,
    unapply: a => a,
  };
}

export function identityLens<T>(): Lens<T, T> {
  return {
    getter: a => a,
    setter: (a, _) => a,
  };
}

export function identityPrism<T>(): Prism<T, T> {
  return {
    build: a => a,
    match: a => (_, ifB) => ifB(a),
  };
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
