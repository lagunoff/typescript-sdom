import { Lens, modify } from './optic';

export type PrimMsg<Model, Msg, Elem extends Node> =
  | Msg
  | { tag: '@@Step', proj: (x: Model) => Model }
  | { tag: '@@Ref', el: Elem }
;

export function mapMessage<Model, Msg1, Msg2, Elem extends Node>(proj: (msg: Msg1) => Msg2, msg: PrimMsg<Model, Msg1, Elem>): PrimMsg<Model, Msg2, Elem> {
  if (isMessage(msg)) return proj(msg);
  return msg;
}

export function mapElement<Model, Msg, Elem1 extends Node, Elem2 extends Node>(proj: (el: Elem1) => Elem2, msg: PrimMsg<Model, Msg, Elem1>): PrimMsg<Model, Msg, Elem2> {
  if (isMessage(msg)) return msg;
  if (msg.tag === '@@Ref') return { tag: '@@Ref', el: proj(msg.el) };
  return msg;
}

export function focus<Model1, Model2, Msg, Elem extends Node>(lens: Lens<Model1, Model2>, msg: PrimMsg<Model2, Msg, Elem>): PrimMsg<Model1, Msg, Elem> {
  if (isMessage(msg)) return msg;
  if (msg.tag === '@@Step') {
    return { tag: '@@Step', proj: modify(lens)(msg.proj) };
  }
  return msg;
}

export function dimapModel<Model1, Model2, Msg, Elem extends Node>(coproj: (m: Model2) => Model1, proj: (m: Model1) => Model2, msg: PrimMsg<Model1, Msg, Elem>): PrimMsg<Model2, Msg, Elem> {
  if (isMessage(msg)) return msg;
  if (msg.tag === '@@Step') return { tag: '@@Step', proj: m => proj(msg.proj(coproj(m))) };
  return msg;
}

export function isMessage<Msg>(msg: PrimMsg<any, Msg, any>): msg is Msg {
  if (!msg || !msg['tag']) return true;
  return msg['tag'] === '@@Step' || msg['tag'] === '@@Ref' ? false : true;
}
