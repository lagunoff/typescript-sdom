import { Lens, modify } from './optic';

export type PrimMsg<In, Out, Msg, Elem extends Node> =
  | Msg
  | { tag: '@@Step', proj: (x: In) => Out }
  | { tag: '@@Ref', el: Elem }


export function mapMessage<In, Out, Msg1, Msg2, Elem extends Node>(proj: (msg: Msg1) => Msg2, msg: PrimMsg<In, Out, Msg1, Elem>): PrimMsg<In, Out, Msg2, Elem> {
  if (isMessage(msg)) return proj(msg);
  return msg;
}

export function mapElement<Model, Msg, Elem1 extends Node, Elem2 extends Node>(proj: (el: Elem1) => Elem2, msg: PrimMsg<Model, Model, Msg, Elem1>): PrimMsg<Model, Model, Msg, Elem2> {
  if (isMessage(msg)) return msg;
  if (msg.tag === '@@Ref') return { tag: '@@Ref', el: proj(msg.el) };
  return msg;
}

export function focus<S, T, A, B, Msg, Elem extends Node>(lens: Lens<S, T, A, B>, msg: PrimMsg<A, B, Msg, Elem>): PrimMsg<S, T, Msg, Elem> {
  if (isMessage(msg)) return msg;
  if (msg.tag === '@@Step') {
    return { tag: '@@Step', proj: modify(lens)(msg.proj) };
  }
  return msg;
}

export function dimapModel<S, T, A, B, Msg, Elem extends Node>(coproj: (a: A) => S, proj: (t: T) => B, msg: PrimMsg<S, T, Msg, Elem>): PrimMsg<A, B, Msg, Elem> {
  if (isMessage(msg)) return msg;
  if (msg.tag === '@@Step') return { tag: '@@Step', proj: m => proj(msg.proj(coproj(m))) };
  return msg;
}

export function isMessage<Msg>(msg: PrimMsg<any, any, Msg, any>): msg is Msg {
  if (!msg || !msg['tag']) return true;
  return msg['tag'] === '@@Step' || msg['tag'] === '@@Ref' ? false : true;
}
