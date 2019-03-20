import { h, Patch, SDOM, Batch } from '../../../src';

// Model
export type Model = {
  title: string;
  completed: boolean;
  editing: string|null;
};

// Props
export type Props = {
  dispatch(action: Action): void;
};

// Action
export type Action =
  | { tag: 'Completed' }
  | { tag: 'Destroy' }
  | { tag: 'Editing/on', target: HTMLElement }
  | { tag: 'Editing/input', value: string }
  | { tag: 'Editing/cancel' }
  | { tag: 'Editing/commit' }

// Update
export function update(action: Action): Patch<Model> {
  switch (action.tag) {
    case 'Completed': return new Batch([]);
    case 'Destroy': return new Batch([]);
    case 'Editing/on': return new Batch([]);
    case 'Editing/input': return new Batch([]);
    case 'Editing/cancel': return new Batch([]);
    case 'Editing/commit': return new Batch([]);
  }
}

// View
export function view(props: Props): SDOM<Model> {
  const { dispatch } = props;
  
  return h.li({ class: (m: Model) => m.completed ? 'completed' : '' }).childs(
    h.div({ class: 'view' }).childs(
      h.input({ class: 'toggle', type: 'checkbox' }).props({ checked: (m: Model) => m.completed }).on({
        check: e => dispatch({ tag: 'Completed' }),
      }),
      h.label((m: Model) => m.title),
      h.button({ class: 'destroy '}).on({
        click: () => dispatch({ tag: 'Destroy' }),
      }),
    ),
    h.input({ class: 'edit' }).props({ value: (m: Model) => m.editing || m.title }).on({
      input: e => dispatch({ tag: 'Editing/input', value: e['target']!['value'] }),
      blur: () => dispatch({ tag: 'Editing/commit'}),
    }),
  );
}
