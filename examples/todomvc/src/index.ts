import { h, Patch, array, create, zoom, actuate, applyPatch, noop, RawPatch, preparePatch, nodeIndex } from '../../../src';
import * as todo from './todo';
import '../node_modules/todomvc-app-css/index.css';

// Model
export type Model = {
  title: string;
  todos: todo.Model[];
  filter: Filter;
};

// Filter
export type Filter = 'all'|'active'|'completed';

// Action
export type Action =
  | { tag: 'Edit', value: string }
  | { tag: 'Filter/set', filter: Filter }
  | { tag: 'ToggleAll' }
  | { tag: 'ClearCompleted' }
  | { tag: 'KeyDown', event: KeyboardEvent }
  | { tag: 'HashChange', hash: string }
  | { tag: '@Todo', idx: number, action: todo.Action }

// Update
export function update(action: Action, model: Model): RawPatch<Model> {
  switch (action.tag) {
    case 'Edit': return { $patch: { title: action.value } };
    case 'Filter/set': return [];
    case 'ToggleAll': {
      const checked = allChecked(model);
      return model.todos.map((_, idx) => ({ $at: ['todos', idx], patch: { $patch: { completed: !checked } } }));
    }
    case 'ClearCompleted': return [];
    case 'KeyDown': {
      if (action.event.keyCode === KEY_ENTER && model.title) return [
        { $patch: { title: '' } },
        { $at: 'todos', patch: { $push: todo.init(model.title) } },
      ];
      return [];
    }
    case 'HashChange': return [];
    case '@Todo': {
      if (action.action.tag === 'Destroy') return { $at: 'todos', patch: { $remove: action.idx } };
      if (action.action.tag === 'Editing/commit' && model.todos[action.idx].editing === '') return { $at: 'todos', patch: { $remove: action.idx } };
      return { $at: ['todos', action.idx], patch: todo.update(action.action, model.todos[action.idx]) };
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
      h.ul({ class: 'todo-list' }).childs(
        array<Model, Action, 'todos'>(
          'todos',
          todo.view.dimap(zoom('item'), (action, model, el) => ({ tag: '@Todo', action, idx: nodeIndex(el) } as Action))
        ),
      ),
      h.footer({ class: 'footer' }).childs(
        h.span({ class: 'todo-count'}).childs(h('string', countItemsLeft, ' items left')),
        h.ul({ class: 'filters' }).childs(
          h.li(h.a('All').attrs({ href: '#/', class: (m: Model) => m.filter === 'all' ? 'selected' : '' })),
          h.li(h.a('Active').attrs({ href: '#/active', class: (m: Model) => m.filter === 'active' ? 'selected' : '' })),
          h.li(h.a('Completed').attrs({ href: '#/completed', class: (m: Model) => m.filter === 'completed' ? 'selected' : '' })),
        ),
        h.button(`Clear completed`).attrs({ class: "clear-completed" }),
      ),
    ),
  ),

  h.footer({ class: 'info' }).childs(
    h.p('Double-click to edit a todo'),
    h.p('Template by ', h.a('Sindre Sorhus').attrs({ href: "http://sindresorhus.com" })),
    h.p('Created by ', h.a('Lagunov Vlad').attrs({ href: "http://todomvc.com" })),
    h.p('Part of ', h.a('TodoMVC').attrs({ href: "http://todomvc.com" })),
  ),
);

function countItemsLeft(model: Model): number {
  return model.todos.reduce((acc, todo) => todo.completed ? acc : acc + 1, 0);
}

function allChecked(model: Model): boolean {
  return model.todos.reduce((acc, todo) => todo.completed ? (acc && true) : false, true);
}


let model: Model = { filter: 'all', todos: [], title: '' };
const container = document.createElement('div');
document.body.appendChild(container);
const getModel = () => model;
const sdom = view.map((action) => {
  const rawPatch = update(action, model);
  const patch = preparePatch(model, rawPatch);
  model = applyPatch(model, patch);
  console.log('action', action);
  console.log('rawPatch', rawPatch);
  console.log('patch', patch);
  console.log('model', model);
  actuate(el, sdom, () => model, patch);
})
const el = create(sdom, getModel);
container.appendChild(el);

const KEY_ENTER = 13;
