import { h, SDOM, text } from '../../../src';

// Model
export type Model = {
  title: string;
  completed: boolean;
  editing: string|null;
  hidden: boolean;
};

// Init
export function init(title: string): Omit<Model, 'hidden'> {
  return { title, completed: false, editing: null };
}

// Action
export type Action =
  | { tag: 'Completed' }
  | { tag: 'Destroy' }
  | { tag: 'Editing/on', event: Event }
  | { tag: 'Editing/input', value: string }
  | { tag: 'Editing/cancel' }
  | { tag: 'Editing/commit' }

// Update
export function update(action: Action, model: ReturnType<typeof init>): ReturnType<typeof init> {
  switch (action.tag) {
    case 'Completed': return { ...model, completed: !model.completed };
    case 'Destroy': return model;
    case 'Editing/on': {
      const rootEl: HTMLElement = action.event.currentTarget as any;
      const inputEl = rootEl.parentElement!.querySelector('input.edit') as HTMLInputElement|null;
      setTimeout(() => inputEl && inputEl.focus(), 100);
      return { ...model, editing: model.title };
    }
    case 'Editing/input': return { ...model, editing: action.value };
    case 'Editing/cancel': return { ...model, editing: null };
    case 'Editing/commit': {
      if (model.editing === null) return model;
      return { ...model, title: model.editing || '', editing: null };
    }
  }
}

const rootClass = (m: Model) => [m.completed ? 'completed' : '', m.editing !== null ? 'editing' : ''].filter(Boolean).join(' ');
const rootStyle = (m: Model) => m.hidden ? 'display: none;' : '';

// View
export const view = h.li(
  { className: rootClass, style: rootStyle },

  h.div(
    { className: 'view', ondblclick: event => ({ tag: 'Editing/on', event }) },
    
    h.input({
      className: 'toggle',
      type: 'checkbox',
      checked: (m: Model) => m.completed,
      onclick: () => ({ tag: 'Completed' }),
    }),
    
    h.label(text((m: Model) => m.title)),
    
    h.button({ className: 'destroy', onclick: () => ({ tag: 'Destroy' }) }),
  ),
  
  h.input<Model, Action>({
    className: 'edit',
    value: (m: Model) => m.editing !== null ? m.editing : m.title,
    oninput: e => ({ tag: 'Editing/input', value: e['target']!['value'] }),
    onblur: () => ({ tag: 'Editing/commit' }),
    onkeydown: handleKeydown,
  }),
) as SDOM<Model, Action>;

function handleKeydown(event: KeyboardEvent): Action|void {
  if (event.keyCode === KEY_ENTER) return { tag: 'Editing/commit' };
  if (event.keyCode === KEY_ESCAPE) return { tag: 'Editing/cancel' };
}

const KEY_ENTER = 13;
const KEY_ESCAPE = 27;


export type Omit<T, U extends keyof T> = { [K in Exclude<keyof T, U>]: T[K] };
