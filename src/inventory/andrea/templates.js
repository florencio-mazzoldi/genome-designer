import connectors from './connectors';
import parts from './parts';
import Block from '../../models/Block';
import { merge } from 'lodash';

const blocksCreated = [];

// number
const getOptionParts = (pos) => {
  return parts.filter(part => part.metadata.egfPosition === `${pos}`)
    .reduce((acc, part, index) => Object.assign(acc, { [part.id]: index === 0 }), {});
};

// string
// string with numbers for positions
// letters for name ('A-C')
const getConnector = (term) => {
  const isPos = !isNaN(parseInt(term[0], 10));
  return connectors.find(conn => isPos ?
    conn.metadata.egfPosition === `${term}` :
    conn.metadata.name === `conn ${term.toUpperCase()}`
  );
};

// create list block with parts
const p = (pos) => { //eslint-disable-line id-length
  const listBlock = new Block({
    metadata: {
      name: `Position ${pos}`,
    },
    rules: {
      list: true,
    },
    options: getOptionParts(pos),
  });

  blocksCreated.push(listBlock);
  return listBlock;
};

// create block which is connector
// todo - should update connectors themselves to be frozen
const c = (term) => { //eslint-disable-line id-length
  const merged = merge({},
    getConnector(term),
    {
      metadata: {
        color: '#bababa',
      },
      rules: {
        frozen: true,
        hidden: true,
      },
    },
  );
  delete merged.id;
  const connector = new Block(merged);

  blocksCreated.push(connector);
  return connector;
};

//pass strings for connectors, and numbers for parts
//todo - need to handle hidden blocks (linkers)
//todo - seems need to handle allowing specific parts, not only lists
const makeComponents = (terms) => {
  return terms
    .map(term => Number.isInteger(term) ? p(term) : c(term))
    .map(block => block.id);
};

const templateFromComponents = (components, toMerge = {}) => {
  return new Block(merge({},
    toMerge,
    {
      components,
      rules: {
        fixed: true,
      },
    },
  ));
};

const template1 = templateFromComponents(
  makeComponents(['a-c', 3, 'd-f', 6, 7, 'h-k', 11, 'l-y', 25]),
  { metadata: { name: 'Template 1' } },
);

const template2 = templateFromComponents(
  makeComponents([1, 2, 3, 'd-f', 6, 7, 'h-k', 11, 'l-n', 14, 15, 16, 'q-r', 18, 19, 20, 't-v', 22, 23, 24, 'x-z']),
  { metadata: { name: 'Template 9' } },
);

export const templates = [template1, template2];

export const allBlocks = [...connectors, ...parts, ...blocksCreated, ...templates];
