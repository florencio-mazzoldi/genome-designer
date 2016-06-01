import invariant from 'invariant';
import * as egf from './egf/index';
import * as igem from './igem/index';
import * as ncbi from './ncbi/index';
import * as genbank from './genbank/index';

export const registry = {
  egf,
  igem,
  ncbi,
  genbank,
};

export const register = (source) => {
  invariant(false, 'not supported yet');

  //todo - checks
  invariant(typeof source.name === 'string', 'name is required');
  invariant(!source.search || typeof source.search === 'function');
  invariant(!source.source || typeof source.get === 'function'); //get is necessary if it is searchable
  invariant(!source.sourceUrl || typeof source.sourceUrl === 'function');

  //todo - add to registry
};

//can pass string of function each registry should have, to serve as filter
export const getSources = (withFunction = false) => Object.keys(registry).filter(key => !withFunction || typeof registry[key][withFunction] === 'function');
