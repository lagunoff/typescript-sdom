import create from '../../src';
const h = create<Date, never>();

const view = h.div(
  { style: `text-align: center` },
  h.h1({ style: d => `color: ` + colors[d.getSeconds() % 6] }, 'Local time'),
  h.p(h.text(d => d.toString())),
);

const colors = ['#F44336', '#03A9F4', '#4CAF50', '#3F51B5', '#607D8B', '#FF5722'];
let model = new Date();
const el = view(null, model);
document.body.appendChild(el);
setInterval(tick, 1000);

function tick() {
  const prev = { input: model, output: el }, next = new Date();
  view(prev, next);
  model = next;
}
