import { attach, Nested } from '../../../src';
import create from '../../../src';
import * as todo from './todo';
import { Prop } from '../../../src/props';
import css from './css';

const h = create<Model, Msg>();

// Model
export type Model = {
  title: string;
  todos: todo.Model[];
  filter: Filter;
};

// Filter
export type Filter = 'all'|'active'|'completed';

// Msg
export type Msg =
  | { tag: 'Input', value: string }
  | { tag: 'ToggleAll' }
  | { tag: 'ClearCompleted' }
  | { tag: 'KeyDown/enter' }
  | { tag: 'Hash/change', hash: string }
  | { tag: '@Todo', idx: number, msg: todo.Msg }

// Update
export function update(msg: Msg, model: Model): Model {
  switch (msg.tag) {
    case 'Input': return { ...model, title: msg.value };
    case 'ToggleAll': {
      const checked = allChecked(model);
      const todos = model.todos.map(t => ({ ...t, completed: !checked }));
      return { ...model, todos };
    }
    case 'ClearCompleted': {
      const todos = model.todos.filter(t => !t.completed);
      return { ...model, todos };
    }
    case 'KeyDown/enter': {
      if (model.title) {
        const todos = [...model.todos, todo.init(model.title)];
        return { ...model, title: '', todos };
      }
      return model;
    }
    case 'Hash/change': {
      const filter = filterFromHash(msg.hash);
      return { ...model, filter };
    }
    case '@Todo': {
      if (msg.msg.tag === 'Destroy') {
        const todos = model.todos.filter((_, idx) => idx !== msg.idx);
        return { ...model, todos };
      }
      if (msg.msg.tag === 'Editing/commit' && model.todos[msg.idx].editing === '') {
        const todos = model.todos.filter((_, idx) => idx !== msg.idx);
        return { ...model, todos };
      }
      const todos = model.todos.slice();
      todos.splice(msg.idx, 1, todo.update(msg.msg, todos[msg.idx]));
      return { ...model, todos };
    };
  }
}

// View
export const view = h.div(
  h.section(
    { className: 'todoapp' },
    
    h.header(
      { className: 'header' },
      
      h.h1('Todos'),
      
      h.input({
        className: 'new-todo',
        placeholder: 'What needs to be done?',
        autofocus: true,
        value: m => m.title,
        oninput: e => ({ tag: 'Input', value: e.currentTarget.value }),
        onkeydown: e => e.keyCode === KEY_ENTER ? { tag: 'KeyDown/enter' } : void 0,
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

      h.array('ul', { className: 'todo-list' })(
        m => m.todos,
        h => h.dimap<todo.Props, todo.Msg>(
          todoSelector,
          msg => idx => ({ tag: '@Todo', msg, idx })
        )(todo.view)
      ),
      
      h.footer(
        { className: 'footer' },
        
        h.span({ className: 'todo-count'}, h('strong', m => countItemsLeft(m) + ' items left')),
        
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

function todoSelector(m: Nested<Model, todo.Model>): todo.Props {
  return { ...m.here, hidden: !(m.parent.filter === 'all' || (m.parent.filter === 'completed' && m.here.completed) || (m.parent.filter === 'active' && !m.here.completed)) };
}

function filterFromHash(hash: string): Filter {
  if (hash === '#/completed') return 'completed';
  if (hash === '#/active') return 'active';
  return 'all';
}

function dispatch(msg: Msg) {
  const next = update(msg, inst.currentModel);
  inst.step(next);
  console.log('msg', msg);
  console.log('model', next);
  console.log('-----------');
}

const todosJson = localStorage.getItem('todomvc-typescript-sdom');
const todos: todo.Model[] = todosJson ? JSON.parse(todosJson) : [];
const filter = filterFromHash(location.hash);
const init: Model = { title: '', filter, todos };
const inst = attach(view, document.body, init, dispatch);

window.onpopstate = () => {
  dispatch({ tag: 'Hash/change', hash: location.hash });
};

window.onbeforeunload = () => {
  localStorage.setItem('todomvc-typescript-sdom', JSON.stringify(inst.currentModel.todos));
};

const KEY_ENTER = 13;
