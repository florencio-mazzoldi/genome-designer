import Block from '../models/Block';
import Project from '../models/Project';

import exampleWithAnnotations from '../inventory/examples/exampleWithAnnotations';
import dummyBlocks from '../inventory/andrea/parts';

const annotationExample = new Block(exampleWithAnnotations);

const [child1, child2, child3, child4, child5, child6, child7] = dummyBlocks;

const root1 = new Block({
  components: [annotationExample.id, child1.id, child2.id, child3.id],
});

export const blocks = [
  root1,
  annotationExample,
  new Block(child1),
  new Block(Object.assign({}, child2, {
    components: [child4.id, child5.id],
  })),
  new Block(child3),
  new Block(Object.assign({}, child4)),
  new Block(Object.assign({}, child5, {
    components: [child6.id, child7.id],
  })),
  new Block(Object.assign({}, child6)),
  new Block(Object.assign({}, child7)),
];

export const project = new Project({
  id: 'test',
  metadata: {
    name: 'My Test Project',
    description: 'Create a versatile and robust templating system for combinatorial recombinant designs using Yeast parts from EGF.',
  },
  components: [root1.id],
});
