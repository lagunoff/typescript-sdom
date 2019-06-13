require('jsdom-global')();
const assert = require('chai').assert;
import * as sdom from '../src';
const h = sdom.create();


// --[ src/sdom.ts ]--
describe("attach", () => {
  it('test #1', () => {
    const view = h.div(h.h1('Hello world!', { id: 'greeting' }));
    const inst = sdom.attach(view, document.body, {});
    assert.equal(document.getElementById('greeting').textContent, 'Hello world!');
  });
});

describe("elem", () => {
  it('test #1', () => {
    const view = sdom.elem('a', { href: '#link' });
    const el = view.create(sdom.observable.of({}), sdom.noop);
    assert.instanceOf(el, HTMLAnchorElement);
    assert.equal(el.hash, '#link');
  });
});

describe("text", () => {
  it('test #1', () => {
    const view = sdom.text(n => `You have ${n} unread messages`);
    const model = { value: 0, subscriptions: [] };
    const el = view.create(sdom.observable.create(model), sdom.noop);
    assert.instanceOf(el, Text);
    assert.equal(el.nodeValue, 'You have 0 unread messages');
    sdom.observable.step(model, 5);
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
    const el = view.create(sdom.observable.of({ list }), sdom.noop);
    assert.instanceOf(el, HTMLUListElement);
    assert.equal(el.childNodes[3].innerHTML, 'Four');
  });
});