// Alternative sum types for typescript. Variants may be more convenient than unions
// because they easier to manipulate (see `Mapped types`)
// - [https://www.typescriptlang.org/docs/handbook/advanced-types.html](Mapped types)
// - [https://github.com/natefaubion/purescript-variant]

const variantSymbol = Symbol('Variant');
export type Variant<T> = { [K in keyof T]: { tag: K } & T[K] }[keyof T] & { [variantSymbol]: T };
export type VariantOf<T> = T extends Variant<infer A> ? A : never;

// Variant constructor
export function variant<T, K extends keyof T>(key: K, value: T[K]): Variant<T> { 
    return [key, value] as any;
}

export function variantConstructor<V extends Variant<any>>(): <K extends keyof VariantOf<V>>(key: K, value: VariantOf<V>[K]) => V {
  return variant as any;
}

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
