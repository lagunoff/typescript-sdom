export type Unlisten = () => void;
export type Subscribe<T> = (onNext: (x: T) => void, onComplete: () => void) => Unlisten;
export type Subscription<T> = { onNext: (x: T) => void; onComplete: () => void; };
export type Updates<T> = { prev: T; next: T; };
export type StoreSource<T> = { value: T; subscriptions?: Subscription<Updates<T>>[]; };
export type Store<T> = { ask(): T; updates: Subscribe<Updates<T>>; };

export function subscribeOf<A>(value: A): Subscribe<A> {
  return (onNext, onComplete) => (onNext(value), onComplete(), noop);
}

export const never: Subscribe<never> = (_, onComplete) => (onComplete(), noop);

export function create<T>(v: StoreSource<T>): Store<T> {
  const ask = () => v.value;
  const updates: Subscribe<Updates<T>> = (onNext, onComplete) => {
    const subscription = { onNext, onComplete };
    v.subscriptions = v.subscriptions || [];
    v.subscriptions.push(subscription);
    return () => {
      if (!v.subscriptions) return;
      const idx = v.subscriptions.indexOf(subscription); if (idx === -1) return;
      v.subscriptions.splice(idx, 1);
    };
  };
  return { updates, ask };
}

export function valueOf<T>(value: T): StoreSource<T> {
  return { value, subscriptions: [] };
}

export function of<T>(value: T): Store<T> {
  return create({ value, subscriptions: [] });
}

export function next<T>(v: StoreSource<T>, next: T): void {
  const change = { prev: v.value, next };
  v.subscriptions && v.subscriptions.forEach(s => s.onNext(change));
  v.value = next;
}

export function modify<T>(v: StoreSource<T>, proj: (prev: T) => T): void {
  return next(v, proj(v.value));
}

export function complete<T>(v: StoreSource<T>): void {
  v.subscriptions && v.subscriptions.forEach(s => s.onComplete());
  v.subscriptions = [];
}

export function mapSubscribe<A, B>(proj: (a: A) => B, s: Subscribe<A>): Subscribe<B> {
  return (onNext, onComplete) => s(a => onNext(proj(a)), onComplete);
}

export function mapStore<A, B>(proj: (a: A) => B, o: Store<A>): Store<B> {
  const ask = () => proj(o.ask());
  const updates = mapSubscribe(change => ({ prev: proj(change.prev), next: proj(change.next) }), o.updates);
  return { ask, updates };
}

export const noop = () => {};
