import chai from 'chai';
import fs from 'fs';
import * as api from '../../src/middleware/api';
const { expect } = chai;

const fileStoragePath = './storage/';

describe('Middleware', () => {
  //login() is tested in server/REST

  it('apiPath() returns an absolute URL to hit the server', () => {
    const fakepath = api.apiPath('somepath');
    expect(/http/.test(fakepath)).to.equal(true);
    expect(/somepath/.test(fakepath)).to.equal(true);
    expect(/api/.test(fakepath)).to.equal(true);
  });

  it('apiPath() paths are prefixed with /api/', () => {
    const fakepath = api.apiPath('somepath');
    expect(/api\/somepath/.test(fakepath)).to.equal(true);
  });

  it('getSessionKey() should return current session key', () => {
    expect(api.getSessionKey()).to.be.a.string;
  });

  it('getSessionKey() should be null before logging in'); //future

  //todo

  it('writeFile() should take path and string, and write file', function writeFileBasic(done) {
    this.timeout(5000);

    const filePath = 'test/writeMe';
    const fileContents = 'rawr';
    const storagePath = fileStoragePath + filePath;

    return api.writeFile(filePath, fileContents)
      .then((res) => {
        expect(res.status).to.equal(200);
        fs.readFile(storagePath, 'utf8', (err, file) => {
          expect(err).to.eql(null);
          expect(file).to.eql(fileContents);
          done();
        });
      });
  });

  it('writeFile() shuold delete if contents are null', function writeFileDelete(done) {
    this.timeout(5000);

    const filePath = 'test/deletable';
    const fileContents = 'oopsie';
    const storagePath = fileStoragePath + filePath;

    fs.writeFile(storagePath, fileContents, 'utf8', (err, write) => {
      api.writeFile(filePath, null).then((res) => {
        expect(res.status).to.equal(200);
        fs.readFile(storagePath, 'utf8', (err, read) => {
          expect(err.code).to.equal('ENOENT');
          done();
        });
      });
    });
  });

  it('readFile() should return fetch response object', function readFileTest(done) {
    this.timeout(5000);
    const filePath = 'test/readable';
    const fileContents = 'the contents!';
    const storagePath = fileStoragePath + filePath;

    fs.writeFile(storagePath, fileContents, 'utf8', (err, write) => {
      api.readFile(filePath)
        .then(result => {
          expect(result.status).to.equal(200);
          expect(typeof result.text).to.equal('function');
          return result.text();
        })
        .then(text => {
          expect(text).to.equal(fileContents);
          done();
        });
    });
  });

  it('should work with multiple files', function multipleFiles(done) {
    //only takes a long time the first time docker build is run
    this.timeout(500000);

    const file1Path = 'test/file1';
    const file1Contents = 'exhibit a';
    const storage1Path = fileStoragePath + file1Path;

    const file2Path = 'test/file2';
    const file2Contents = 'exhibit b';
    const storage2Path = fileStoragePath + file2Path;

    Promise
      .all([
        api.writeFile(file1Path, file1Contents),
        api.writeFile(file2Path, file2Contents),
      ])
      .then(files => {
        fs.readFile(storage1Path, 'utf8', (err, read) => {
          expect(read).to.equal(file1Contents);
        });
        fs.readFile(storage2Path, 'utf8', (err, read) => {
          expect(read).to.equal(file2Contents);
        });
      })
      .then(() => {
        return Promise.all([
          api.readFile(file1Path).then(resp => resp.text()),
          api.readFile(file2Path).then(resp => resp.text()),
        ]);
      })
      .then(files => {
        expect(files[0]).to.equal(file1Contents);
        expect(files[1]).to.equal(file2Contents);
        done();
      });
  });

  it('importBlock() should be able convert Genbank features to Block', function testFunc(done) {
    this.timeout(5000); //reading genbank can take long, esp when running along with other tests
    fs.readFile('./test/res/sampleGenbank.gb', 'utf8', (err, sampleStr) => {
      api.importBlock('genbank', sampleStr)
      .then(result => {
        return result.json();
      })
      .then(data => {
        expect(data.block !== undefined).to.equal(true);
        expect(data.blocks !== undefined).to.equal(true);
        expect(data.block.components.length === 2).to.equal(true);

        //check that CDS types were converted to Blocks
        expect(data.blocks[data.block.components[0]] !== undefined).to.equal(true);
        expect(data.blocks[data.block.components[1]] !== undefined).to.equal(true);
        expect(data.blocks[data.block.components[0]].metadata.tags.sbol === 'cds').to.equal(true);
        expect(data.blocks[data.block.components[1]].metadata.tags.sbol === 'cds').to.equal(true);

        //check that other features were imported as features for the main block
        expect(data.block.sequence.features.length === 2).to.equal(true);
        expect(data.block.sequence.features[1].type === 'rep_origin').to.equal(true);
        done();
      })
      .catch(err => {
        done(err);
      });
    });
  });

  it('exportBlock() should be able convert Block to Genbank', function testFunc(done) {
    this.timeout(5000); //reading genbank can take long, esp when running along with other tests
    fs.readFile('./test/res/sampleBlocks.json', 'utf8', (err, sampleBlocksJson) => {
      const sampleBlocks = JSON.parse(sampleBlocksJson);
      api.exportBlock('genbank', sampleBlocks)
      .then(result => {
        return result.json();
      })
      .then(result => {
        expect(result.indexOf('acggtt') !== -1).to.equal(true);
        expect(result.indexOf('block           5..6') !== -1).to.equal(true);
        done();
      })
      .catch(err => {
        done(err);
      });
    });
  });

  it('importProject() should be able convert feature file to Blocks', function testFunc(done) {
    this.timeout(10000); //reading a long csv file
    fs.readFile('./test/res/sampleFeatureFile.tab', 'utf8', (err, sampleFeatures) => {
      api.importProject('features', sampleFeatures)
      .then(result => {
        return result.json();
      })
      .then(result => {
        expect(result.project.components.length === 125).to.equal(true);
        expect(result.blocks[ result.project.components[19] ].metadata.name === '19:CBDcenA ').to.equal(true);
        done();
      })
      .catch(err => {
        done(err);
      });
    });
  });

  it('search() should be able search NCBI nucleotide DB', function testFunc(done) {
    this.timeout(20000);  //searching NCBI
    const input = {query: 'carboxylase', max: 2};
    return api.search('nucleotide', input)
    .then(result => {
      return result.json();
    })
    .then(output => {
      expect(output[0].metadata.name !== undefined).to.equal(true);
      expect(output[0].metadata.organism !== undefined).to.equal(true);
      expect(output.length === 2).to.equal(true);
      done();
    });
  });

  it('getManifests() should be able get extension information', done => {
    return api.getManifests('import')
    .then(result => {
      return result.json();
    })
    .then(output => {
      expect(output.features !== undefined).to.equal(true);
      expect(output.genbank !== undefined).to.equal(true);
      done();
    });
  });
});
