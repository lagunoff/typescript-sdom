export type Prop<Model, T> = T|((m: Model) => T);
export type EventProp<Model, Action> = (e: Event, m: Model) => Action|void;

export type Props<Model, Action> = {
  className?: Prop<Model, string>;  style?: Prop<Model, string>;  classList?: Record<string, boolean|((m: Model) => boolean)>
  title?: Prop<Model, string>;
  selected?: Prop<Model, boolean>;
  hidden?: Prop<Model, boolean>;
  value?: Prop<Model, string>;
  defaultValue?: Prop<Model, string>;
  accept?: Prop<Model, string>;
  acceptCharset?: Prop<Model, string>;
  action?: Prop<Model, string>;
  autocomplete?: Prop<Model, 'on'|'off'>;
  autosave?: Prop<Model, string>;
  disabled?: Prop<Model, boolean>;
  enctype?: Prop<Model, string>;
  formation?: Prop<Model, string>;
  list?: Prop<Model, string>;
  maxlength?: Prop<Model, string>;
  minlength?: Prop<Model, string>;
  method?: Prop<Model, string>;
  multiple?: Prop<Model, boolean>;
  novalidate?: Prop<Model, boolean>;
  pattern?: Prop<Model, string>;
  readonly?: Prop<Model, boolean>;
  required?: Prop<Model, boolean>;
  size?: Prop<Model, string>;
  for?: Prop<Model, string>;
  form?: Prop<Model, string>;
  max?: Prop<Model, string>;
  min?: Prop<Model, string>;
  step?: Prop<Model, string>;
  cols?: Prop<Model, string>;
  rows?: Prop<Model, string>;
  wrap?: Prop<Model, string>;
  target?: Prop<Model, string>;
  download?: Prop<Model, string>;
  poster?: Prop<Model, string>;
  downloadAs?: Prop<Model, string>;
  hreflang?: Prop<Model, string>;
  media?: Prop<Model, string>;
  ping?: Prop<Model, string>;
  rel?: Prop<Model, string>;
  ismap?: Prop<Model, string>;
  usemap?: Prop<Model, string>;
  shape?: Prop<Model, string>;
  coords?: Prop<Model, string>;
  src?: Prop<Model, string>;
  height?: Prop<Model, string>;
  width?: Prop<Model, string>;
  alt?: Prop<Model, string>;
  autoplay?: Prop<Model, string>;
  controls?: Prop<Model, boolean>;
  loop?: Prop<Model, boolean>;  preload?: Prop<Model, string>;
  default?: Prop<Model, boolean>;
  kind?: Prop<Model, string>;
  srclang?: Prop<Model, string>;
  sandbox?: Prop<Model, string>;
  seamless?: Prop<Model, string>;
  srcdoc?: Prop<Model, string>;
  reversed?: Prop<Model, string>;
  start?: Prop<Model, string>;
  align?: Prop<Model, string>;
  colspan?: Prop<Model, string>;
  rowspan?: Prop<Model, string>;
  headers?: Prop<Model, string>;
  scope?: Prop<Model, string>;
  async?: Prop<Model, string>;
  charset?: Prop<Model, string>;
  content?: Prop<Model, string>;
  defer?: Prop<Model, string>;
  httpEquiv?: Prop<Model, string>;
  language?: Prop<Model, string>;
  scoped?: Prop<Model, string>;
  type?: Prop<Model, string>;
  name?: Prop<Model, string>;
  href?: Prop<Model, string>;
  id?: Prop<Model, string>;
  placeholder?: Prop<Model, string>;
  checked?: Prop<Model, boolean>;
  autofocus?: Prop<Model, boolean>;  ondblclick?: EventProp<Model, Action>;
  onclick?: EventProp<Model, Action>;
  onblur?: EventProp<Model, Action>;
  onfocus?: EventProp<Model, Action>;
  oninput?: EventProp<Model, Action>;
  onkeydown?: EventProp<Model, Action>;
};

export const attributes = {
  for: '',
};
