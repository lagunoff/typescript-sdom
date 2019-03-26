import { h, Patch, SDOM, RawPatch } from '../../../src';
import { Filter } from './';

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
export function update(action: Action, model: ReturnType<typeof init>): RawPatch<ReturnType<typeof init>> {
  switch (action.tag) {
    case 'Completed': return { $patch: { completed: !model.completed } };
    case 'Destroy': return [];
    case 'Editing/on': {
      const rootEl: HTMLElement = action.event.currentTarget as any;
      const inputEl = rootEl.parentElement!.querySelector('input.edit') as HTMLInputElement|null;
      setTimeout(() => inputEl && inputEl.focus(), 100);
      return { $patch: { editing: model.title } };
    }
    case 'Editing/input': return { $patch: { editing: action.value } };
    case 'Editing/cancel': return { $patch: { editing: null } };
    case 'Editing/commit': {
      if (model.editing === null) return [];
      return { $patch: { title: model.editing || '', editing: null } };
    }
  }
}

const rootClass = (m: Model) => [m.completed ? 'completed' : '', m.editing !== null ? 'editing' : ''].filter(Boolean).join(' ');
const rootStyle = (m: Model) => m.hidden ? 'display: none;' : '';

// View
export const view: SDOM<Model, Action> = h.li({ class: rootClass, style: rootStyle }).childs(
  h.div({ class: 'view' }).on({
    dblclick: event => ({ tag: 'Editing/on', event }),
  }).childs(
    h.input({ class: 'toggle', type: 'checkbox' }).props({ checked: (m: Model) => m.completed }).on({
      click: () => ({ tag: 'Completed' }),
    }),
    h.label((m: Model) => m.title),
    h.button({ class: 'destroy' }).on({
      click: () => ({ tag: 'Destroy' }),
    }),
  ),
  h.input({ class: 'edit' }).props({ value: (m: Model) => m.editing !== null ? m.editing : m.title }).on({
    input: e => ({ tag: 'Editing/input', value: e['target']!['value'] }),
    blur: () => ({ tag: 'Editing/commit' }),
    keydown: handleKeydown,
  }),
);

function handleKeydown(event: KeyboardEvent): Action|void {
  if (event.keyCode === KEY_ENTER) return { tag: 'Editing/commit' };
  if (event.keyCode === KEY_ESCAPE) return { tag: 'Editing/cancel' };
}

const KEY_ENTER = 13;
const KEY_ESCAPE = 27;


export type Omit<T, U extends keyof T> = { [K in Exclude<keyof T, U>]: T[K] };
