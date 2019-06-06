require('jsdom-global')();
const assert = require('chai').assert;
import { h } from '../src';
import { elem, array, attach, text } from '../src/sdom';


// --[ src/sdom.ts ]--
describe("attach", () => {
  it('test #1', () => {
    const view = h.div(h.h1('Hello world!', { id: 'greeting' }));
    const inst = attach(view, document.body, {});
    assert.equal(document.getElementById('greeting').textContent, 'Hello world!');
  });
});

describe("elem", () => {
  it('test #1', () => {
    const view = elem('a', { href: '#link' });
    const el = view.create({});
    assert.instanceOf(el, HTMLAnchorElement);
    assert.equal(el.hash, '#link');
  });
});

describe("text", () => {
  it('test #1', () => {
    const view = text(n => `You have ${n} unread messages`);
    let model = 0;
    const el = view.create(model);
    assert.instanceOf(el, Text);
    assert.equal(el.nodeValue, 'You have 0 unread messages');
    view.update(el, model, 5);
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
    const el = view.create({ list });
    assert.instanceOf(el, HTMLUListElement);
    assert.equal(el.childNodes[3].innerHTML, 'Four');
  });
});