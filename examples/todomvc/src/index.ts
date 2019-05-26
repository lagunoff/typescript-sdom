import { h, array, SDOM_DATA, text, dimap, id, unpack, SDOM } from '../../../src';
import * as todo from './todo';
import { Prop } from '../../../src/props';
import css from './css';

// Model
export type Model = {
  title: string;
  todos: ReturnType<typeof todo.init>[];
  filter: Filter;
};

// Filter
export type Filter = 'all'|'active'|'completed';

// Action
export type Action =
  | { tag: 'Input', value: string }
  | { tag: 'ToggleAll' }
  | { tag: 'ClearCompleted' }
  | { tag: 'KeyDown', event: KeyboardEvent }
  | { tag: 'HashChange', hash: string }
  | { tag: '@Todo', idx: number, action: todo.Action }

// Update
export function update(action: Action, model: Model): Model {
  switch (action.tag) {
    case 'Input': return { ...model, title: action.value };
    case 'ToggleAll': {
      const checked = allChecked(model);
      const todos = model.todos.map(t => ({ ...t, completed: !checked }));
      return { ...model, todos };
    }
    case 'ClearCompleted': {
      const todos = model.todos.filter(t => !t.completed);
      return { ...model, todos };
    }
    case 'KeyDown': {
      if (action.event.keyCode === KEY_ENTER && model.title) {
        const todos = [...model.todos, todo.init(model.title)];
        return { ...model, title: '', todos };
      }
      return model;
    }
    case 'HashChange': {
      if (action.hash === '#/completed') return { ...model, filter: 'completed' };
      if (action.hash === '#/active') return { ...model, filter: 'active' };
      return { ...model, filter: 'all' };
    }
    case '@Todo': {
      if (action.action.tag === 'Destroy') {
        const todos = model.todos.filter((_, idx) => idx !== action.idx);
        return { ...model, todos };
      }
      if (action.action.tag === 'Editing/commit' && model.todos[action.idx].editing === '') {
        const todos = model.todos.filter((_, idx) => idx !== action.idx);
        return { ...model, todos };
      }
      const todos = model.todos.slice();
      todos.splice(action.idx, 1, todo.update(action.action, todos[action.idx]));
      return { ...model, todos };
    };
  }
}

// View
export const view: SDOM<Model, Action> = h.div(
  h.section(
    { className: 'todoapp' },
    
    h.header(
      { className: 'header' },
      h.h1('Todos'),
      h.input({
        className: 'new-todo',
        placeholder: 'What needs to be done?',
        autofocus: true,
        value: (m: Model) => m.title,
        oninput: e => ({ tag: 'Input', value: e.target.value } as Action),
        onkeydown: event => ({ tag: 'KeyDown', event } as Action),
      }),
    ),

    h.section(
      { className: 'main' },
      h.input({
        id: 'toggle-all',
        className: 'toggle-all',
        type: 'checkbox',
        checked: allChecked,
        onclick: () => ({ tag: 'ToggleAll' }),
      }),
      
      h.label('Mark all as complete', { for: 'toggle-all' }),

      dimap(id, a => ({ tag: '@Todo', ...a }))(
        // @ts-ignore
        array('todos','ul', { className: 'todo-list' }, dimap(m => ({ ...m.item, hidden: !(m.model.filter === 'all' || (m.model.filter === 'completed' && m.item.completed) || (m.model.filter === 'active' && !m.item.completed)) }), id)(todo.view)),
      ),
      
      h.footer(
        { className: 'footer' },
        
        h.span({ className: 'todo-count'}, h('strong', text(countItemsLeft)), ' items left'),
        
        h.ul(
          { className: 'filters' },
          h.li(h.a('All', { href: '#/', className: selectedIf('all') })),
          h.li(h.a('Active', { href: '#/active', className: selectedIf('active') })),
          h.li(h.a('Completed', { href: '#/completed', className: selectedIf('completed') })),
        ),
        
        h.button('Clear completed', { className: 'clear-completed', onclick: () => ({ tag: 'ClearCompleted' }) })
      ),
    ),
  ),
  
  h.footer(
    { className: 'info' },
    h.p('Double-click to edit a todo'),
    h.p('Template by ', h.a('Sindre Sorhus', { href: 'http://sindresorhus.com' })),
    h.p('Created by ', h.a('Lagunov Vlad', { href: 'https://github.com/lagunoff' })),
    h.p('Part of ', h.a('TodoMVC', { href: 'http://todomvc.com' })),
  ),

  h('style', { type: 'text/css' }, css),
);

function countItemsLeft(model: Model): number {
  return model.todos.reduce((acc, todo) => todo.completed ? acc : acc + 1, 0);
}

function allChecked(model: Model): boolean {
  return model.todos.reduce((acc, todo) => todo.completed ? (acc && true) : false, true);
}

function selectedIf(filter: Filter): Prop<Model, string> {
  return m => m.filter === filter ? 'selected' : '';
}
 
function handleAction(action: Action) {
  const next = update(action, el[SDOM_DATA].model);
  if (next === el[SDOM_DATA].model) return;
  sdom({ el, model: el[SDOM_DATA].model }, next);
  console.log('action', action);
  console.log('prev.model', el[SDOM_DATA].model);
  console.log('next', next);
  console.log('-----------');
  el[SDOM_DATA].model = next;
}


let model: Model = { filter: 'all', todos: [], title: '' };
const container = document.createElement('div');
document.body.appendChild(container);
const sdom = dimap(id, handleAction)(view as any)
const el = sdom(null, model);
el[SDOM_DATA] = el[SDOM_DATA] || {};
el[SDOM_DATA].model = model;

window.onpopstate = function(event) {
  handleAction({ tag: 'HashChange', hash: location.hash });
};
container.appendChild(unpack(el));

const KEY_ENTER = 13;

HTMLInputElement
