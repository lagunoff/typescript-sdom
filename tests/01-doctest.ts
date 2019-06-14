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
    const model = sdom.observable.valueOf(0);
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

describe("dimap", () => {
  it('test #1', () => {
     type Model1 = { btnTitle: string };
     type Msg1 = { tag: 'Clicked' };
     type Model2 = string;
     type Msg2 = 'Clicked';
     let latestMsg: any = void 0;
     const view01 = sdom.elem<Model2, Msg2>('button', (m: Model2) => m, { onclick: () => 'Clicked'});
     const view02 = sdom.dimap<Model1, Msg1, Model2, Msg2>(m => m.btnTitle, msg2 => ({ tag: 'Clicked' }))(view01);
     const el = view02.create(sdom.observable.of({ btnTitle: 'Click on me' }), msg => (latestMsg = msg));
     el.click();
     assert.instanceOf(el, HTMLButtonElement);
     assert.equal(el.textContent, 'Click on me');
     assert.deepEqual(latestMsg, { tag: 'Clicked' });
  });
});

describe("discriminate", () => {
  it('test #1', () => {
     type Tab = { tag: 'Details', info: string } | { tag: 'Comments', comments: string[] };
     type Model = { tab: Tab };
     const view = h.div(sdom.discriminate(m => m.tab.tag, {
         Details: h.p({ id: 'details' }, m => m.tab.info),
         Comments: h.p({ id: 'comments' }, m => m.tab.comments.join(', ')),
     }));
     const model = sdom.observable.valueOf({ tab: { tag: 'Details', info: 'This product is awesome' } });
     const el = view.create(sdom.observable.create(model), sdom.noop);
     assert.equal(el.childNodes[0].id, 'details'); 
     assert.equal(el.childNodes[0].textContent, 'This product is awesome');
     sdom.observable.step(model, { tab: { tag: 'Comments', comments: [] } });
     assert.equal(el.childNodes[0].id, 'comments');
  });
});