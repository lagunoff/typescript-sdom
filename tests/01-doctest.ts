require('jsdom-global')();
const assert = require('chai').assert;
import * as sdom from '../src';
const h = sdom.create();


// --[ src/index.ts ]--
describe("create", () => {
  it('test #1', () => {
     type Model = { counter: number };
     type Msg = 'Click';
     const h = sdom.create<Model, Msg>();
     const view = h.div(
         h.p(m => `You clicked ${m.counter} times`),
         h.button('Click here', { onclick: () => 'Click' }),
     );
     const model = { value: { counter: 0 } };
     const el = view.create(sdom.store.create(model), sdom.noop);
     assert.instanceOf(el.childNodes[0], HTMLParagraphElement);
     assert.instanceOf(el.childNodes[1], HTMLButtonElement);
  });
});

describe("attach", () => {
  it('test #1', () => {
    const view = h.div(h.h1('Hello world!', { id: 'greeting' }));
    const inst = sdom.attach(view, document.body, {});
    assert.equal(document.getElementById('greeting').textContent, 'Hello world!');
  });
});

describe("element", () => {
  it('test #1', () => {
    const view = sdom.element('a', { href: '#link' });
    const el = view.create(sdom.store.of({}), msg => {});
    assert.instanceOf(el, HTMLAnchorElement);
    assert.equal(el.hash, '#link');
  });
});

describe("text", () => {
  it('test #1', () => {
    const view = sdom.text(n => `You have ${n} unread messages`);
    const model = { value: 0 };
    const el = view.create(sdom.store.create(model), sdom.noop);
    assert.instanceOf(el, Text);
    assert.equal(el.nodeValue, 'You have 0 unread messages');
    sdom.store.next(model, 5);
    assert.equal(el.nodeValue, 'You have 5 unread messages');
  });
});

describe("array", () => {
  it('test #1', () => {
    const view = h.array('ul', { class: 'list' })(
      m => m.list,
      h => h.li(m => m.here),
    );
    const list = ['One', 'Two', 'Three', 'Four'];
    const el = view.create(sdom.store.of({ list }), msg => {});
    assert.instanceOf(el, HTMLUListElement);
    assert.equal(el.childNodes[3].innerHTML, 'Four');
  });
});

describe("discriminate", () => {
  it('test #1', () => {
    type Tab = 'Details'|'Comments';
    type Model = { tab: Tab, details: string; comments: string[] };
    const view = h.div(sdom.discriminate(m => m.tab, {
        Details: h.p({ id: 'details' }, m => m.details),
        Comments: h.p({ id: 'comments' }, m => m.comments.join(', ')),
    }));
    const model = { value: { tab: 'Details', details: 'This product is awesome', comments: [`No it's not`] } };
    const el = view.create(sdom.store.create(model), sdom.noop);
    assert.equal(el.childNodes[0].id, 'details'); 
    assert.equal(el.childNodes[0].textContent, 'This product is awesome');
    sdom.store.next(model, { ...model.value, tab: 'Comments' });
    assert.equal(el.childNodes[0].id, 'comments');
  });
});