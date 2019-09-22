import { Interpreter, messages } from '../../../src';

export type MakeProps<In, Props> = {
  [K in keyof Props]: (input: In) => Props[K]
}

export function simpleInterpreter<In, Out, Msg>(update: (msg: Msg, m: In) => Out): Interpreter<In, Out, Msg, never> {
  return (_, sink) => msg => {
    if (messages.isMessage(msg)) {
      sink({ tag: '@@Step', proj: input => update(msg, input) });
    } else {
      sink(msg);
    }
  };
}
