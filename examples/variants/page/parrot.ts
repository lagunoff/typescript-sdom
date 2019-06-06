import create from '../../../src';

const h = create<Model, Action>();

// Model
export type Model = {};

// Action
export type Action = never;

// Twitter embedding
const innerHTML = `<blockquote class="twitter-tweet"><p lang="en" dir="ltr">what kind of dog is this? <a href="https://t.co/e6Jm2vUasm">pic.twitter.com/e6Jm2vUasm</a></p>&mdash; cockatoos (@cockatoos) <a href="https://twitter.com/cockatoos/status/1132618815014133760?ref_src=twsrc%5Etfw">May 26, 2019</a></blockquote>`;

// View
export const view = h.div(
  // @ts-ignore
  { innerHTML },
  h('script', { async: true, src: "https://platform.twitter.com/widgets.js", charset: "utf-8" }),
);
