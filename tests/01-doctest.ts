require('jsdom-global')();
const assert = require('chai').assert;
import { h } from '../src';
import { elem, array, attach } from '../src/sdom';


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
    const el = view(null, {});
    assert.instanceOf(el, HTMLAnchorElement);
    assert.equal(el.hash, '#link');
  });
});

describe("array", () => {
  it('test #1', () => {
    const view = h.array('ul', { class: 'list' })(
      m => m.list,
      h => h.li(h.text(m => m.here)),
    );
    const list = ['One', 'Two', 'Three', 'Four'];
    const el = view(null, { list });
    assert.instanceOf(el, HTMLUListElement);
    assert.equal(el.childNodes[3].innerHTML, 'Four');
  });
});