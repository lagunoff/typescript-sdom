export type Unlisten = () => void;
export type Subscribe<T> = (onNext: (x: T) => void, onComplete: () => void) => Unlisten;
export type Subscription<T> = { onNext: (x: T) => void; onComplete: () => void; };
export type PrevNext<T> = { prev: T; next: T; };
export type ObservableValue<T> = { value: T; subscriptions: Subscription<PrevNext<T>>[]; };
export type Observable<T> = { subscribe: Subscribe<PrevNext<T>>; getValue(): T; };

export function create<T>(v: ObservableValue<T>): Observable<T> {
  const getValue = () => v.value;
  const subscribe: Subscribe<PrevNext<T>> = (onNext, onComplete) => {
    const subscription = { onNext, onComplete };
    v.subscriptions.push(subscription);
    return () => {
      const idx = v.subscriptions.indexOf(subscription); if (idx === -1) return;
      v.subscriptions.splice(idx, 1);
    };
  };
  return { subscribe, getValue };
}

export function valueOf<T>(value: T): ObservableValue<T> {
  return { value, subscriptions: [] };
}

export function of<T>(value: T): Observable<T> {
  return create({ value, subscriptions: [] });
}

export function step<T>(v: ObservableValue<T>, next: T): void {
  const change = { prev: v.value, next };
  v.subscriptions.forEach(s => s.onNext(change));
  v.value = next;
}

export function modify<T>(v: ObservableValue<T>, proj: (prev: T) => T): void {
  return step(v, proj(v.value));
}

export function complete<T>(v: ObservableValue<T>): void {
  v.subscriptions.forEach(s => s.onComplete());
  v.subscriptions = [];
}

export function subscribeMap<A, B>(proj: (a: A) => B, s: Subscribe<A>): Subscribe<B> {
  return (onNext, onComplete) => s(a => onNext(proj(a)), onComplete);
}

export function observableMap<A, B>(proj: (a: A) => B, o: Observable<A>): Observable<B> {
  const getValue = () => proj(o.getValue());
  const subscribe = subscribeMap(change => ({ prev: proj(change.prev), next: proj(change.next) }), o.subscribe);
  return { getValue, subscribe };
}
