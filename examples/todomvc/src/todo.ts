import { h, Patch, SDOM, RawPatch } from '../../../src';

// Model
export type Model = {
  title: string;
  completed: boolean;
  editing: string|null;
};

// Init
export function init(title: string): Model {
  return { title, completed: false, editing: null };
}

// Action
export type Action =
  | { tag: 'Completed' }
  | { tag: 'Destroy' }
  | { tag: 'Editing/on', target: HTMLElement }
  | { tag: 'Editing/input', value: string }
  | { tag: 'Editing/cancel' }
  | { tag: 'Editing/commit' }

// Update
export function update(action: Action, model: Model): RawPatch<Model> {
  switch (action.tag) {
    case 'Completed': return { $patch: { completed: !model.completed } };
    case 'Destroy': return [];
    case 'Editing/on': return { $patch: { editing: model.title } };
    case 'Editing/input': return { $patch: { editing: action.value } };
    case 'Editing/cancel': return { $patch: { editing: null } };
    case 'Editing/commit': return { $patch: { title: model.editing || '', editing: null } };
  }
}

// View
export const view: SDOM<Model, Action> = h.li({ class: (m: Model) => m.completed ? 'completed' : '' }).childs(
  h.div({ class: 'view' }).childs(
    h.input({ class: 'toggle', type: 'checkbox' }).props({ checked: (m: Model) => m.completed }).on({
      click: e => ({ tag: 'Completed' }),
    }),
    h.label((m: Model) => m.title),
    h.button({ class: 'destroy '}).on({
      click: () => ({ tag: 'Destroy' }),
    }),
  ),
  h.input({ class: 'edit' }).props({ value: (m: Model) => m.editing !== null ? m.editing : m.title }).on({
    input: e => ({ tag: 'Editing/input', value: e['target']!['value'] }),
    blur: () => ({ tag: 'Editing/commit'}),
  }),
);
