import Block from '../models/Block';
import Project from '../models/Project';

import parts from '../inventory/andrea/parts';
import { templates, allBlocks } from '../inventory/andrea/templates';

const lists = ['1', '2', '3', '4', '5', '6', '7', '8'].map(pos => {
  const filtered = parts.filter(part => part.metadata.egfPosition === pos);
  const options = filtered.reduce((acc, part, index) => Object.assign(acc, { [part.id]: !!(index % 2) }), {});

  return new Block({
    metadata: {
      name: `Position ${pos}`,
    },
    options,
    rules: {
      list: true,
      filter: {
        'metadata.egfPosition': pos,
      },
    },
  });
});

[0, 2, 4].forEach(index => {
  lists.splice(index, 0, new Block({
    metadata: {
      name: `Hidden Block`,
    },
    rules: {
      hidden: true,
    },
  }));
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
  metadata: {
    name: 'Combinatorial Demo',
  },
  components: [construct.id, ...templates.map(template => template.id)],
});

export const blocks = [
  construct,
  ...lists,
  ...allBlocks,
];

export const project = proj;
