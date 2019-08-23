import * as sdom from '../../../src/index';
import { Nested } from '../../../src/index';
import { MakeProps, withInterpreter, simpleInterpreter, withDefault } from './component';

// Model
export type Model = {
  title: string;
  completed: boolean;
  editing: string|null;
};

// Extra data provided by parent component. Much like props in ReactJS
export type Props<Ctx> = MakeProps<Ctx, Model, {
  hidden: boolean;
}>;

// Msg
export type Msg =
  | { tag: 'Completed' }
  | { tag: 'Destroy' }
  | { tag: 'Editing/on', event: MouseEvent }
  | { tag: 'Editing/input', value: string }
  | { tag: 'Editing/cancel' }
  | { tag: 'Editing/commit' }

// Init
export function init(title: string): Model {
  return { title, completed: false, editing: null };
}

// Update
export function update(msg: Msg, model: Model): Model {
  switch (msg.tag) {
    case 'Completed': return { ...model, completed: !model.completed };
    case 'Destroy': return model;
    case 'Editing/on': {
      const rootEl: HTMLElement = msg.event.currentTarget as any;
      const inputEl = rootEl.parentElement!.querySelector('input.edit') as HTMLInputElement|null;
      setTimeout(() => inputEl && inputEl.focus(), 100);
      return { ...model, editing: model.title };
    }
    case 'Editing/input': return { ...model, editing: msg.value };
    case 'Editing/cancel': return { ...model, editing: null };
    case 'Editing/commit': {
      if (model.editing === null) return model;
      return { ...model, title: model.editing || '', editing: null };
    }
  }
}

// View
export function view<Ctx>(props: Props<Ctx>) {
  type PublicModel = Nested<Ctx, Model>;
  
  const h = sdom.create<PublicModel, Msg>();
  const rootClass = (m: PublicModel) => [m.here.completed ? 'completed' : '', m.here.editing !== null ? 'editing' : ''].filter(Boolean).join(' ');
  const rootStyle = (m: PublicModel) => props.hidden(m) ? 'display: none;' : '';

  return h.li(
    { className: rootClass, style: rootStyle },

    h.div(
      { className: 'view', ondblclick: event => ({ tag: 'Editing/on', event }) },
      
      h.input({
        className: 'toggle',
        type: 'checkbox',
        checked: m => m.here.completed,
        onclick: { tag: 'Completed' },
      }),
      
      h.label(m => m.here.title),
      
      h.button({ className: 'destroy', onclick: { tag: 'Destroy' } }),
    ),
    
    h.input({
      className: 'edit',
      value: m => m.here.editing !== null ? m.here.editing : m.here.title,
      oninput: e => ({ tag: 'Editing/input', value: e.currentTarget.value }),
      onblur: { tag: 'Editing/commit' },
      onkeydown: handleKeydown,
    }),
  );
}

export const interpereter = simpleInterpreter(update);

export default withDefault(0 as any as Model)(withInterpreter(interpereter)(view));

function handleKeydown(event: KeyboardEvent): Msg|void {
  if (event.keyCode === KEY_ENTER) return { tag: 'Editing/commit' };
  if (event.keyCode === KEY_ESCAPE) return { tag: 'Editing/cancel' };
}

const KEY_ENTER = 13;
const KEY_ESCAPE = 27;


export type Omit<T, U extends keyof T> = { [K in Exclude<keyof T, U>]: T[K] };
