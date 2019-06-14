import * as sdom from '../../src';
const h = sdom.create<Date, never>();

const view = h.div(
  { style: `text-align: center` },
  h.h1({ style: date => `color: ` + colors[date.getSeconds() % 6] }, 'Local time'),
  h.p(date => date.toString()),
);

const colors = ['#F44336', '#03A9F4', '#4CAF50', '#3F51B5', '#607D8B', '#FF5722'];
const model = sdom.observable.valueOf(new Date());
const el = view.create(sdom.observable.create(model), sdom.noop);
document.body.appendChild(el);
setInterval(tick, 1000);

function tick() {
  sdom.observable.step(model, new Date());
}
