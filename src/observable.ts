export type Unlisten = () => void;
export type Subscribe<T> = (onNext: (x: T) => void, onComplete: () => void) => Unlisten;
export type Subscription<T> = { onNext: (x: T) => void; onComplete: () => void; };
export type PrevNext<T> = { prev: T; next: T; };
export type ObservableRef<T> = { value: T; subscriptions: Subscription<PrevNext<T>>[]; };
export type Observable<T> = { subscribe: Subscribe<PrevNext<T>>; getLatest(): T; }; 

export function create<T>(ref: ObservableRef<T>): Observable<T> {
  const getLatest = () => ref.value;
  const subscribe: Subscribe<PrevNext<T>> = (onNext, onComplete) => {
    const subscription = { onNext, onComplete };
    ref.subscriptions.push(subscription);
    return () => {
      const idx = ref.subscriptions.indexOf(subscription); if (idx === -1) return;
      ref.subscriptions.splice(idx, 1);
    };
  };
  return { subscribe, getLatest };
}

export function of<T>(value: T): Observable<T> {
  return create({ value, subscriptions: [] });
}

export function step<T>(ref: ObservableRef<T>, value: T): void {
  const pn = { prev: ref.value, next: value };
  ref.subscriptions.forEach(s => s.onNext(pn));
  ref.value = value;
}

export function complete<T>(ref: ObservableRef<T>): void {
  ref.subscriptions.forEach(s => s.onComplete());
  ref.subscriptions = [];
}

export function subscribeMap<A, B>(proj: (a: A) => B, s: Subscribe<A>): Subscribe<B> {
  return (onNext, onComplete) => s(a => onNext(proj(a)), onComplete);
}

export function observableMap<A, B>(proj: (a: A) => B, o: Observable<A>): Observable<B> {
  const getLatest = () => proj(o.getLatest());
  const subscribe = subscribeMap(change => ({ prev: proj(change.prev), next: proj(change.next) }), o.subscribe);
  return { getLatest, subscribe };
}
