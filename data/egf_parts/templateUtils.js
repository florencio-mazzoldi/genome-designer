import invariant from 'invariant';
import connectors from './connectors';
import parts from './parts';
import Block from '../../src/models/Block';
import { merge } from 'lodash';

//note that technically, these keys are strings, and passing a number will cast to a string as the key
export const templateSymbols = {
  1: 'structural',
  2: 'insulator',
  3: 'promoter',
  4: 'rnaStability',
  5: 'regulatory',
  6: 'cds',
  7: 'cds',
  8: 'structural',
  '8a': 'structural',
  '8b': 'structural',
  9: 'cds',
  10: 'regulatory',
  11: 'terminator',
  12: 'insulator',
  13: 'restrictionEnzyme',
  14: 'promoter',
  15: 'cds',
  16: 'terminator',
  17: 'restrictionEnzyme',
  18: 'promoter',
  19: 'cds',
  20: 'structural',
  21: 'cds',
  22: 'terminator',
  23: 'insulator',
  24: 'structural',
  25: 'originReplication',
};

const termIsPartPos = term => Number.isInteger(term) || term === '8a' || term === '8b';
const stringIsConnector = (string) => (/^[a-zA-Z](-[a-zA-Z]{1,2})?( BsaI\-.)?$/gi).test(string);

// pass position number, return map for block options
export const getOptionParts = (pos, optionId) => {
  return parts.filter(part => part.metadata.egfPosition === `${pos}`)
    .reduce((acc, part, index) => Object.assign(acc, { [part.id]: (optionId ? optionId === part.id : true) }), {});
};

// create list block with parts
export const list = (pos, optionId) => {
  const listBlock = new Block({
    metadata: {
      name: `Position ${pos}`,
    },
    rules: {
      role: templateSymbols[pos], //role as metadata, since constructs shouldn't have a role
      list: true,
    },
    options: getOptionParts(pos, optionId),
    notes: {
      Position: pos,
    },
  });

  return listBlock;
};

// create block which is connector
// string with numbers for positions
// letters for name ('A-C')
export const conn = (term) => {
  const isPos = !isNaN(parseInt(term[0], 10));
  return connectors.find(conn => isPos ?
    conn.metadata.egfPosition === `${term}` :
    conn.metadata.name.toUpperCase() === `conn ${term}`.toUpperCase()
  );
};

//specific part by name or shortname
//frozen, can clone it yourself if you want to
export const part = (term) => {
  return parts.find(part => {
    return part.metadata.name.toLowerCase() === term ||
      part.metadata.shortName.toLowerCase() === term;
  });
};

//pass numbers for parts, strings as '#' or '#-#' for connectors (or e.g. 'A-B BsaI-X', see regex above), otherwise a part name
//todo - need to handle linkers
export const makeComponents = (...terms) => {
  return terms
    .map(term => termIsPartPos(term) ? //eslint-disable-line no-nested-ternary
      list(term) :
      stringIsConnector(term) ?
        conn(term) :
        part(term));
};

//pass in actual list of compoennts
export const templateFromComponents = (components, toMerge = {}) => {
  invariant(components.every(comp => Block.validate(comp)), 'must pass valid blocks');

  return new Block(merge({},
    toMerge,
    {
      components: components.map(comp => comp.id),
      rules: {
        fixed: true,
      },
    },
  ));
};
