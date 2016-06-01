import invariant from 'invariant';
import { registry, getSources } from '../inventory/registry';

const zip = (keys, vals) => keys.reduce(
  (acc, key, ind) => Object.assign(acc, { [key]: vals[ind] }), {}
);

//todo - ideally, farm these out separately without a Promise.all (dont wait for all to resolve)
export const search = (term, options, sourceList = []) => {
  const sources = getSources('search');

  invariant(typeof term === 'string', 'Term must be a string');
  invariant(Array.isArray(sourceList), 'must pass array for search source list');
  invariant(sourceList.every(source => sources.includes(source)), `sourceList contains source not in the list of supported sources: ${sourceList} // ${sources}`);

  const searchSources = (sourceList.length === 0) ? sources : sourceList;

  return Promise.all(
    searchSources.map(source => {
      //dont search if no term, just return empty set
      if (!term.length) {
        return Promise.resolve([]);
      }
      return registry[source].search(term, options);
    })
    )
    .then(results => zip(searchSources, results));
};

export const blast = () => {
  invariant(false, 'not implemented');
};
