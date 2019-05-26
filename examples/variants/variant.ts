// Alternative sum types for typescript. Variants may be more convenient than unions
// because they easier to manipulate (see `Mapped types`)
// - [https://www.typescriptlang.org/docs/handbook/advanced-types.html](Mapped types)
// - [https://github.com/natefaubion/purescript-variant]

const variantSymbol = Symbol('Variant');
export type Variant<T> = { [K in keyof T]: { tag: K } & T[K] }[keyof T] & { [variantSymbol]: T };

// Variant constructor
export function variant<T, K extends keyof T>(key: K, value: T[K]): Variant<T> { 
    return [key, value] as any;
}

export function createVariant<C extends Record<string, {} | ((...a) => any)>>(constructors: C): { [K in keyof C]: C[K] extends ((...a) => infer P) ? ((p: P) => InferVariant<C>) : InferVariant<C> } & { _A: InferVariant<C> } {
  for (const k in constructors) {
    // @ts-ignore
    constructors[k] = typeof(constructors[k]) === 'object' ? variant(k, constructors[k]) as any : v => variant(k, v);
  }
  return constructors as any;
}

type InferVariant<C extends Record<string, {} | ((...a) => any)>> = Variant<{
  [K in keyof C]: C[K] extends ((...a) => infer P) ? P : {};
}>;

// Pattern-match on `Variant<T>`
export function match<T>(v: Variant<T>): MatchFn<T> {
  return function () {
    if (arguments.length === 1) return arguments[0][v[0]](v[1]);
    return v[0] in arguments[1] ? arguments[1][v[0]](v[1]) : arguments[0];
  };
}

// Second curried argument of `match<T>`
export type MatchFn<T> = {
    <R>(cases: { [K in keyof T]: (x: T[K]) => R }): R;
    <R>(default_: R, cases: Partial<{ [K in keyof T]: (x: T[K]) => R }>): R;
};

// Try to match tag value with `key`, return `T[K]` or `undefined` if matching failed
export function match1<T, K extends keyof T>(v: Variant<T>, key: K): T[K]|undefined { 
  return v[0] === key ? v[1] as any : undefined;
}
