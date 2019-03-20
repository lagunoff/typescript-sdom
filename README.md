# Work-in-progress nothing works yet

Virtual DOM vs SDOM
```ts
type Model = { text: string; active: boolean };

const virtualdom = (model: Model) => h.div({ class: model.active ? 'active' : '' }).child(
    h.span(model.text)
);

const sdom = h.div({ class: model => model.active ? 'active' : '' }).child(
    h.span(model => model.text)
);
```

## Links
- [https://github.com/paf31/purescript-sdom](https://github.com/paf31/purescript-sdom)
- [https://blog.functorial.com/posts/2018-03-12-You-Might-Not-Need-The-Virtual-DOM.html](https://blog.functorial.com/posts/2018-03-12-You-Might-Not-Need-The-Virtual-DOM.html)
