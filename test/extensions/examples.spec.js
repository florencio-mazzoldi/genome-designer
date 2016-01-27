import { expect } from 'chai';
import { runNode } from '../../extensions/compute/runNode';
const fs = require('fs');

describe('Nodes Extension', () => {
  const dnaFile = process.cwd() + '/temp.txt';
  const input = {DNA: dnaFile};
  it('should successfully run the Biopython example', function translateDNA(done) {
    this.timeout(8000); //this timeout is not needed if the test is run by itself (using it.only)
    fs.writeFile(dnaFile, 'AACTTGTCCACTGTA', err => {
      if (err) {
        expect(false).to.equal(true);
        done(err.message);
      }
      runNode('translate_dna_example', input, {})
      .then(result => {
        expect(result.Protein === 'NLSTV').to.equal(true);
        done();
      })
      .catch(err => {
        done(err.message);
      });
    });
  });
});
