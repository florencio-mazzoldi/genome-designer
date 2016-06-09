import fetch from 'isomorphic-fetch';
import { parseResults, parseFullResult } from './parseResults';
import queryString from 'query-string';

export const url = 'http://ec2-52-30-192-126.eu-west-1.compute.amazonaws.com:8003/collections';

export const name = 'Edinburgh Genome Foundry';
const collection = 'yeastfab';

export const search = (term, options = {}) => {
  const opts = Object.assign(
    {
      start: 0,
      entries: 50,
    },
    options,
    {
      collection,
    }
  );

  return fetch(`${url}/search/?query_text=${term}&${queryString.stringify(opts)}`)
    .then(resp => resp.json())
    .then(results => parseResults(results))
    .catch(err => {
      console.error(err);
      return [];
    });
};

export const get = (id) => {
  return fetch(`${url}/${collection}/parts/${id}`)
    .then(resp => resp.json())
    .then(result => parseFullResult(result));
};
