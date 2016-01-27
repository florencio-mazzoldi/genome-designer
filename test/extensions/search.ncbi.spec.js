import { expect } from 'chai';
import { searchString } from '../../extensions/search/search';
const query = 'carboxylase';

describe('NCBI Search extension', () => {
  it('should be able to search the Nucleotide DB', function nucleotide(done) {
    this.timeout(10000);  //searching NCBI... so might take long, depending on internet
    searchString('nucleotide', query, 2)
    .then(output => {
      expect(output[0].metadata.name !== undefined).to.equal(true);
      expect(output[0].metadata.organism !== undefined).to.equal(true);
      expect(output.length === 2).to.equal(true);
      done();
    });
  });
});
