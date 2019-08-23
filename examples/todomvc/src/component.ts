import { Nested, Interpreter, SDOM, messages, mapMessage } from '../../../src';
import { mapStore } from '../../../src/store';

export type MakeProps<Ctx, Model, Descr> = {
  [K in keyof Descr]: (m: Nested<Ctx, Model>) => Descr[K];
};

export const withInterpreter = <Model, Msg1, Msg2, Elem extends Node>(int: Interpreter<Nested<any, Model>, Msg1, Msg2, Elem>): <Props>(view: <Ctx>(p: MakeProps<Ctx, Model, Props>) => SDOM<Nested<Ctx, Model>, Msg1, Elem>) => <Ctx>(p: MakeProps<Ctx, Model, Props>) => SDOM<Nested<Ctx, Model>, Msg2, Elem> => view => props => ({
  create(store, sink){
    // @ts-ignore
    return view(props).create(store, int(store, sink));
  }
});

export const withDefault = <Model, Msg, Elem extends Node>(defaultModel: Model): <Props>(view: <Ctx>(p: MakeProps<Ctx, Model, Props>) => SDOM<Nested<Ctx, Model>, Msg, Elem>) => <Ctx>(p: MakeProps<Ctx, Model|undefined, Props>) => SDOM<Nested<Ctx, Model|undefined>, Msg, Elem> => view => props => ({
  create(store, sink){
    const modelProj = (m: Nested<any, any>) => {
      if (m.here === undefined) return ({ parent: m.parent, here: defaultModel });
      return m;
    };
    const modelCoproj = (m: Nested<any, any>) => {
      if (m.here === defaultModel) return ({ parent: m.parent, here: undefined });
      return m;
    };
    // @ts-ignore
    return view(props).create(mapStore(modelProj, store), msg => sink(messages.dimapModel(modelCoproj, modelProj, msg)));
  }
});

export function simpleInterpreter<Model, Msg>(update: (msg: Msg, model: Model) => Model): Interpreter<Nested<any, Model>, Msg, never> {
  return (_, sink) => msg => {
    if (messages.isMessage(msg)) {
      sink({ tag: '@SDOM/Step', proj: model => ({ parent: model.parent, here: update(msg, model.here) }) });
    } else {
      sink(msg);
    }
  };
}
