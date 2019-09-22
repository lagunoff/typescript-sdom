import * as sdom from '../../../src/index';
import { simpleInterpreter } from './component';
import { Interpreter, SDOM } from '../../../src/index';

// Model
export type Model = {
  title: string;
  completed: boolean;
  editing: string|null;
};

// Extra data provided by parent component. Much like props in ReactJS
export type Props = {
  model: Model;
  hidden: boolean;
};

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
export function update(msg: Msg, { model }: Props): Model {
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
export const interpereter = simpleInterpreter(update);

// View
const h = sdom.create<Props, Model, Msg>();
const rootClass = (m: Props) => [m.model.completed ? 'completed' : '', m.model.editing !== null ? 'editing' : ''].filter(Boolean).join(' ');
const rootStyle = (m: Props) => m.hidden ? 'display: none;' : '';

export const view = h.li(
  { className: rootClass, style: rootStyle },

  h.div(
    { className: 'view', ondblclick: event => ({ tag: 'Editing/on', event }) },
    
    h.input({
      className: 'toggle',
      type: 'checkbox',
      checked: m => m.model.completed,
      onclick: { tag: 'Completed' },
    }),
    
    h.label(m => m.model.title),
    
    h.button({ className: 'destroy', onclick: { tag: 'Destroy' } }),
  ),
  
  h.input({
    className: 'edit',
    value: m => m.model.editing !== null ? m.model.editing : m.model.title,
    oninput: e => ({ tag: 'Editing/input', value: e.currentTarget.value }),
    onblur: { tag: 'Editing/commit' },
    onkeydown: handleKeydown,
  }),
);

function handleKeydown(event: KeyboardEvent): Msg|void {
  if (event.keyCode === KEY_ENTER) return { tag: 'Editing/commit' };
  if (event.keyCode === KEY_ESCAPE) return { tag: 'Editing/cancel' };
}

const KEY_ENTER = 13;
const KEY_ESCAPE = 27;
