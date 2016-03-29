import { expect } from 'chai';
import path from 'path';
import { importProject } from '../../plugins/convert/import';
import { exportProject } from '../../plugins/convert/export';
import BlockDefinition from '../../src/schemas/Block';
import ProjectDefinition from '../../src/schemas/Project';

const fs = require('fs');

describe('Plugins', () => {
  describe('Genbank Plugin', () => {
    it('should import Genbank file with contiguous entries as a project', function importGB(done) {
        fs.readFile(path.resolve(__dirname, '../res/sampleGenbankContiguous.gb'), 'utf8', (err, sampleStr) => {
            importProject('genbank', sampleStr)
                .then(output => {
                    expect(output.project).not.to.equal(undefined);
                    expect(ProjectDefinition.validate(output.project)).to.equal(true);
                    expect(output.project.metadata.name).to.equal('EU912544');
                    expect(output.project.metadata.description).to.equal('Cloning vector pDM313, complete sequence.')
                    expect(output.project.components.length).to.equal(1);
                    const parentBlock = output.blocks[output.project.components[0]];
                    expect(parentBlock.components.length).to.equal(4);
                    expect(parentBlock.metadata.name).to.equal('EU912544');
                    expect(parentBlock.metadata.description).to.equal('Cloning vector pDM313, complete sequence.');
                    expect(parentBlock.metadata.mol_type).to.equal('other DNA');
                    expect(parentBlock.metadata.start).to.equal(0);
                    expect(parentBlock.metadata.end).to.equal(119);
                    expect(parentBlock.metadata.gi).to.equal('198078160');
                    expect(parentBlock.metadata.note).to.equal('GFP-tag for C-terminal fusion');
                    expect(parentBlock.metadata.data_file_division).to.equal('SYN');
                    expect(parentBlock.metadata.type).to.equal('source');
                    expect(parentBlock.metadata.date).to.equal('06-FEB-2009');
                    expect(output.blocks[parentBlock.components[0]].metadata.type).to.equal('promoter');
                    expect(output.blocks[parentBlock.components[0]].rules.sbol).to.equal('promoter');
                    expect(output.blocks[parentBlock.components[1]].metadata.type).to.equal('CDS');
                    expect(output.blocks[parentBlock.components[1]].rules.sbol).to.equal('cds');
                    expect(output.blocks[parentBlock.components[2]].metadata.type).to.equal('terminator');
                    expect(output.blocks[parentBlock.components[3]].metadata.type).to.equal('rep_origin');
                    for (var key in output.blocks) {
                      expect(BlockDefinition.validate(output.blocks[key])).to.equal(true);
                    };
                    done();
                })
                .catch(done);
        });
    });

    it('should import Genbank file with holes as a project', function importGB(done) {
      fs.readFile(path.resolve(__dirname, '../res/sampleGenbankContiguousWithHoles.gb'), 'utf8', (err, sampleStr) => {
        importProject('genbank', sampleStr)
          .then(output => {
            expect(output.project).not.to.equal(undefined);
            expect(output.project.components.length === 1).to.equal(true);
            const parentBlock = output.blocks[output.project.components[0]];
            expect(parentBlock.components.length).to.equal(7);
            expect(output.blocks[parentBlock.components[0]].metadata.type).to.equal('filler');
            expect(output.blocks[parentBlock.components[1]].metadata.type).to.equal('promoter');
            expect(output.blocks[parentBlock.components[2]].metadata.type).to.equal('filler');
            expect(output.blocks[parentBlock.components[3]].metadata.type).to.equal('CDS');
            expect(output.blocks[parentBlock.components[4]].metadata.type).to.equal('filler');
            expect(output.blocks[parentBlock.components[5]].metadata.type).to.equal('terminator');
            expect(output.blocks[parentBlock.components[6]].metadata.type).to.equal('rep_origin');
            for (var key in output.blocks) {
              expect(BlockDefinition.validate(output.blocks[key])).to.equal(true);
            };
            done();
          })
          .catch(done);
      });
    });

    it('should import Genbank file with holes in features as a project', function importGB(done) {
      fs.readFile(path.resolve(__dirname, '../res/sampleGenbankSimpleNested.gb'), 'utf8', (err, sampleStr) => {
        importProject('genbank', sampleStr)
          .then(output => {
            expect(output.project).not.to.equal(undefined);
            expect(output.project.components.length === 1).to.equal(true);
            const parentBlock = output.blocks[output.project.components[0]];
            expect(parentBlock.components.length).to.equal(2);
            var firstBlock = output.blocks[parentBlock.components[0]];
            expect(firstBlock.metadata.type).to.equal('block');
            expect(firstBlock.components.length).to.be.equal(3);
            expect(output.blocks[firstBlock.components[0]].metadata.type).to.equal('promoter');
            expect(output.blocks[firstBlock.components[1]].metadata.type).to.equal('CDS');
            expect(output.blocks[firstBlock.components[2]].metadata.type).to.equal('filler');
            var secondBlock = output.blocks[parentBlock.components[1]];
            expect(secondBlock.metadata.type).to.equal('block');
            expect(secondBlock.components.length).to.be.equal(4);
            expect(output.blocks[secondBlock.components[0]].metadata.type).to.equal('CDS');
            expect(output.blocks[secondBlock.components[1]].metadata.type).to.equal('filler');
            expect(output.blocks[secondBlock.components[2]].metadata.type).to.equal('terminator');
            expect(output.blocks[secondBlock.components[3]].metadata.type).to.equal('rep_origin');
            for (var key in output.blocks) {
              expect(BlockDefinition.validate(output.blocks[key])).to.equal(true);
            };
            done();
          })
          .catch(done);
      });
    });

    it('should import Genbank file with multiple entries as a project', function importGB(done) {
      fs.readFile(path.resolve(__dirname, '../res/sampleMultiGenbank.gb'), 'utf8', (err, sampleStr) => {
        importProject('genbank', sampleStr)
          .then(output => {
            expect(output.project).not.to.equal(undefined);
            expect(ProjectDefinition.validate(output.project)).to.equal(true);
            expect(output.project.metadata.name).to.equal('EU912543');
            expect(output.project.metadata.description).to.equal('Cloning vector pDM313, complete sequence.')
            expect(output.project.components.length).to.equal(3);
            done();
          })
          .catch(done);
      });
    });

    it('should fail on bad Genbank format', function importGB(done) {
      fs.readFile(path.resolve(__dirname, '../res/badFormatGenbank.gb'), 'utf8', (err, sampleStr) => {
        importProject('genbank', sampleStr)
          .then(output => {
            expect(output).to.equal('Invalid Genbank format.');
            done();
          })
          .catch(done);
      });
    });

    it('should export simple project to Genbank', function exportGB(done) {
      fs.readFile(path.resolve(__dirname, '../res/simpleProject.json'), 'utf8', (err, sampleProjectJson) => {
        const sampleProject = JSON.parse(sampleProjectJson);
        exportProject('genbank', sampleProject)
          .then(result => {
            console.log(result)
            expect(result).to.contain('LOCUS');
            done();
          })
          .catch(done);
      });
    });

    it.skip('should export project to multi-record Genbank', function exportGB(done) {
      fs.readFile(path.resolve(__dirname, '../res/sampleProject.json'), 'utf8', (err, sampleProjJson) => {
        const sampleProj = JSON.parse(sampleProjJson);
        exportProject('genbank', sampleProj)
          .then(result => {
            //LOCUS 1, LOCUS 2, LOCUS 3, and LOCUS 4
            expect((result.match(/\/\//g) || []).length).to.equal(4);
            expect((result.match(/LOCUS\s+\d/g) || []).length).to.equal(4);
            done();
          })
          .catch(done);
      });
    });
  });
});

