import { h, Patch, Batch, array, create, zoom, actuate, KeyPatch, Replace, applyPatch, ArraySplice, noop } from '../../../src';
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
  | { tag: '@Todo', key: number, action: todo.Action }


// Update
export function update(action: Action): Patch<Model> {
  switch (action.tag) {
    case 'Edit': return new KeyPatch('title', new Replace('', action.value.toUpperCase()));
    case 'Filter/set': return new Batch([]);
    case 'ToggleAll': return new Batch([]);
    case 'ClearCompleted': return new Batch([]);
    case 'KeyDown': {
//      console.log(action.event.code);
      if (action.event.code === 'Enter') return new KeyPatch('todos', new ArraySplice(0, 0, [todo.init('sdkjfnsdjfn')]));
      return noop;
    }
    case 'HashChange': return new Batch([]);
    case '@Todo': return new Batch([]);
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
      h.input({ id: 'toggle-all', class: 'toggle-all', type: 'checkbox' }),
      h.label('Mark all as complete').attrs({ for: 'toggle-all' }),
      h.ul({ class: 'todo-list' }).childs(
        array<Model, Action, 'todos'>('todos', todo.view.dimap(zoom('item'), action => ({ tag: '@Todo', action }))),
      ),
      h.footer({ class: 'footer' }).childs(
        h.span({ class: 'todo-count'}).childs(h('string', (m: Model) => m.todos.length)),
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


let model: Model = { filter: 'all', todos: [], title: 'sdfsd' };
const container = document.createElement('div');
document.body.appendChild(container);
const sdom = view.map((action) => {
  const patch = update(action);
  model = applyPatch(model, patch);
  actuate(el, sdom, () => model, patch);
})
const el = create(sdom, () => model);
container.appendChild(el);
