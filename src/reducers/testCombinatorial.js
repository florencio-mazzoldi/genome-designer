import Block from '../models/Block';
import Project from '../models/Project';

import parts from '../inventory/andrea/parts';

const lists = ['1', '2', '3', '4', '5', '6', '7', '8'].map(pos => {
  const firstpart = parts.find(part => part.metadata.egfPosition === pos);

  return new Block({
    metadata: {
      name: `Position ${pos}`,
    },
    options: [
      firstpart.id,
    ],
    rules: {
      list: true,
      filter: {
        'metadata.egfPosition': pos,
      },
    },
  });
});

const construct = new Block({
  metadata: {
    name: 'My Template',
  },
  rules: {
    fixed: true,
  },
  components: lists.map(list => list.id),
});

const proj = new Project({
  id: 'combinatorial',
  components: [construct.id],
});

export const blocks = [
  construct,
  ...lists,
];

export const project = proj;