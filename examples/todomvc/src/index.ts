import { h, Patch, array, create, actuate, applyPatch, noop, RawPatch, preparePatch, nodeIndex, Jet } from '../../../src';
import * as I from '../../../src/incremental';
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
export function update(action: Action, model: Model): RawPatch<Model> {
  switch (action.tag) {
    case 'Edit': return { $patch: { title: action.value } };
    case 'ToggleAll': {
      const checked = allChecked(model);
      return model.todos.map((_, idx) => ({ $at: ['todos', idx], patch: { $patch: { completed: !checked } } }));
    }
    case 'ClearCompleted': {
      return { $at: 'todos', patch: { $batch: model.todos.reduceRight((acc, todo, idx) => (todo.completed && acc.push({ $remove: idx }), acc), [] as any) } };
    }
    case 'KeyDown': {
      if (action.event.keyCode === KEY_ENTER && model.title) return [
        { $patch: { title: '' } },
        { $at: 'todos', patch: { $push: todo.init(model.title) } },
      ];
      return [];
    }
    case 'HashChange': {
      if (action.hash === '#/completed') return { $patch: { filter: 'completed' } };
      if (action.hash === '#/active') return { $patch: { filter: 'active' } };
      return { $patch: { filter: 'all' } };
    }
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
      // @ts-ignore
      array<Model, Action, 'todos'>(
        'todos', 'ul', { class: 'todo-list' },
        todo.view.dimap(projectItem, (action, model, el) => ({ tag: '@Todo', action, idx: nodeIndex(el) } as Action)),
      ),
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

function projectItem(m: Jet<{ item: Model['todos'][number], model: Model }>) {
  const filter = m.key('model', 'filter');
  const isCompleted = I.if_then_else(m.key('item', 'completed'), Jet.of('completed'), Jet.of('active'));
  const visible = I.if_then_else(
    I.eq(filter, Jet.of('all')),
    Jet.of(true),
    I.eq(filter, isCompleted),
  );
                                     
  return I.merge(m.key('item'), I.record({
    hidden: I.neg(visible),
  }));
}
 
function handleAction(action: Action) {
  const rawPatch = update(action, model);
  const patch = preparePatch(model, rawPatch);
  actuate(el, sdom, new Jet(model, patch));
  model = applyPatch(model, patch, true);
  console.log('action', action);
  console.log('rawPatch', rawPatch);
  console.log('patch', patch);
  console.log('model', model);
  console.log('-----------');
}


let model: Model = { filter: 'all', todos: [], title: '' };
const container = document.createElement('div');
document.body.appendChild(container);
const getModel = () => model;
const sdom = view.map(handleAction)
const el = create(sdom, getModel);
window.onpopstate = function(event) {
  handleAction({ tag: 'HashChange', hash: location.hash });
};
container.appendChild(el);

const KEY_ENTER = 13;
