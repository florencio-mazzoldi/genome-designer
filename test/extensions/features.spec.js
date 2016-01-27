import { expect } from 'chai';
import { importProject } from '../../extensions/convert/import';
import { exportProject } from '../../extensions/convert/export';

const fs = require('fs');

describe('Features Extensions', () => {
  it('should be able convert feature file to Blocks', done => {
    fs.readFile('./test/res/sampleFeatureFile.tab', 'utf8', (err, sampleFeatures) => {
      importProject('features', sampleFeatures).
      then(result => {
        expect(result.project.components.length === 125).to.equal(true);
        expect(result.blocks[ result.project.components[19] ].metadata.name === '19:CBDcenA ').to.equal(true);
        done();
      })
      .catch(err => {
        done(err);
      });
    });
  });

  it('should be able convert a Project to a feature file', done => {
    const sampleProj = {
      components: ['1', '2', '3'],
    };
    const sampleBlocks = {
      '1': {
        metadata: {
          name: '1',
          tags: {
            type: 'promoter',
          },
        },
        components: [],
        sequence: {
          sequence: 'aaa',
        },
      },
      '2': {
        metadata: {
          name: '2',
          tags: {
            type: 'rbs',
          },
        },
        components: [],
        sequence: {
          sequence: 'ccc',
        },
      },
      '3': {
        metadata: {
          name: '3',
          tags: {
            type: 'cds',
          },
        },
        components: [],
        sequence: {
          sequence: 'ggg',
        },
      },
      '4': {
        metadata: {
          name: '4',
          tags: {
            type: 'terminator',
          },
        },
        components: [],
        sequence: {
          sequence: 'ttt',
        },
      },
    };
    const expectedResult = `1	aaa	promoter	#ffffff
2	ccc	rbs	#ffffff
3	ggg	cds	#ffffff
4	ttt	terminator	#ffffff`;
    return exportProject('features', { project: sampleProj, blocks: sampleBlocks })
    .then(result => {
      expect(result === expectedResult).to.equal(true);
      done();
    });
  });
});
