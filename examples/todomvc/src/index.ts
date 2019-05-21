import { h, array, actuate, SDOM_DATA } from '../../../src';
import * as todo from './todo';
import '../node_modules/todomvc-app-css/index.css';

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
  | { tag: 'Edit', value: string }
  | { tag: 'ToggleAll' }
  | { tag: 'ClearCompleted' }
  | { tag: 'KeyDown', event: KeyboardEvent }
  | { tag: 'HashChange', hash: string }
  | { tag: '@Todo', idx: number, action: todo.Action }

// Update
export function update(action: Action, model: Model): Model {
  switch (action.tag) {
    case 'Edit': return { ...model, title: action.value };
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
export const view = h.div<Model, Action>(
  h.section({ class: 'todoapp' }).childs(
    h.header({ class: 'header' }).childs(
      h.h1('Todos'),
      h.input({ class: 'new-todo', placeholder: 'What needs to be done?', autofocus: true }).props({ value: (m: Model) => m.title }).on({
        input: e => ({ tag: 'Edit', value: e['target']!['value'] }),
        keydown: event => ({ tag: 'KeyDown', event }),
      }),
    ),

    h.section({ class: 'main' }).childs(
      h.input({ id: 'toggle-all', class: 'toggle-all', type: 'checkbox' }).props({ checked: allChecked }).on({
        click: () => ({ tag: 'ToggleAll' }),
      }),
      h.label('Mark all as complete').attrs({ for: 'toggle-all' }),
      // @ts-ignore
      array<Model, todo.Action, 'todos'>(
        'todos', 'ul', { class: 'todo-list' },
        todo.view.comap(m => ({ ...m.item, hidden: false })),
      ).map(a => ({ tag: '@Todo', ...a })),
      h.footer({ class: 'footer' }).childs(
        h.span({ class: 'todo-count'}).childs(h('strong', countItemsLeft), ' items left'),
        h.ul({ class: 'filters' }).childs(
          h.li(h.a('All').attrs({ href: '#/', class: (m: Model) => m.filter === 'all' ? 'selected' : '' })),
          h.li(h.a('Active').attrs({ href: '#/active', class: (m: Model) => m.filter === 'active' ? 'selected' : '' })),
          h.li(h.a('Completed').attrs({ href: '#/completed', class: (m: Model) => m.filter === 'completed' ? 'selected' : '' })),
        ),
        h.button(`Clear completed`).attrs({ class: "clear-completed" }).on({
          click: () => ({ tag: 'ClearCompleted' })
        }),
      ),
    ),
  ),

  h.footer({ class: 'info' }).childs(
    h.p('Double-click to edit a todo'),
    h.p('Template by ', h.a('Sindre Sorhus').attrs({ href: "http://sindresorhus.com" })),
    h.p('Created by ', h.a('Lagunov Vlad').attrs({ href: "https://github.com/lagunoff" })),
    h.p('Part of ', h.a('TodoMVC').attrs({ href: "http://todomvc.com" })),
  ),
);

function countItemsLeft(model: Model): number {
  return model.todos.reduce((acc, todo) => todo.completed ? acc : acc + 1, 0);
}

function allChecked(model: Model): boolean {
  return model.todos.reduce((acc, todo) => todo.completed ? (acc && true) : false, true);
}
 
function handleAction(action: Action) {
  const next = update(action, el[SDOM_DATA].model);
  if (next === el[SDOM_DATA].model) return;
  actuate(() => {}, { el, model }, next, sdom);
  console.log('action', action);
  console.log('prev.model', el[SDOM_DATA].model);
  console.log('next', next);
  console.log('-----------');
  el[SDOM_DATA].model = next;
}


let model: Model = { filter: 'all', todos: [], title: '' };
const container = document.createElement('div');
document.body.appendChild(container);
const sdom = view.map(handleAction)
const el = actuate(() => {}, null, model, sdom);
el[SDOM_DATA] = el[SDOM_DATA] || {};
el[SDOM_DATA].model = model;
window.onpopstate = function(event) {
  handleAction({ tag: 'HashChange', hash: location.hash });
};
container.appendChild(el);

const KEY_ENTER = 13;
