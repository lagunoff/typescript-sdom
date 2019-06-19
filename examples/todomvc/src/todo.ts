import create from '../../../src/index';

const h = create<Props, Msg>();

// Model
export type Model = {
  title: string;
  completed: boolean;
  editing: string|null;
};

// Msg
export type Msg =
  | { tag: 'Completed' }
  | { tag: 'Destroy' }
  | { tag: 'Editing/on', event: MouseEvent }
  | { tag: 'Editing/input', value: string }
  | { tag: 'Editing/cancel' }
  | { tag: 'Editing/commit' }

// Extra fields to `Model` provided by parent component. Much like
// props in ReactJS https://github.com/lagunoff/typescript-sdom/blob/fc943d5ff5297cbf64977f1e20275bf1d438a406/examples/todomvc/src/index.ts#L150
export type Props = Model & {
  hidden: boolean;
}

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

const rootClass = (m: Props) => [m.completed ? 'completed' : '', m.editing !== null ? 'editing' : ''].filter(Boolean).join(' ');
const rootStyle = (m: Props) => m.hidden ? 'display: none;' : '';

// View
export const view = h.li(
  { className: rootClass, style: rootStyle },

  h.div(
    { className: 'view', ondblclick: event => ({ tag: 'Editing/on', event }) },
    
    h.input({
      className: 'toggle',
      type: 'checkbox',
      checked: m => m.completed,
      onclick: () => ({ tag: 'Completed' }),
    }),
    
    h.label(m => m.title),
    
    h.button({ className: 'destroy', onclick: () => ({ tag: 'Destroy' }) }),
  ),
  
  h.input({
    className: 'edit',
    value: m => m.editing !== null ? m.editing : m.title,
    oninput: e => ({ tag: 'Editing/input', value: e.currentTarget.value }),
    onblur: () => ({ tag: 'Editing/commit' }),
    onkeydown: handleKeydown,
  }),
);

function handleKeydown(event: KeyboardEvent): Msg|void {
  if (event.keyCode === KEY_ENTER) return { tag: 'Editing/commit' };
  if (event.keyCode === KEY_ESCAPE) return { tag: 'Editing/cancel' };
}

const KEY_ENTER = 13;
const KEY_ESCAPE = 27;


export type Omit<T, U extends keyof T> = { [K in Exclude<keyof T, U>]: T[K] };
