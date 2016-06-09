import { assert, expect } from 'chai';
import uuid from 'node-uuid';
import Block from '../../../src/models/Block';
import Project from '../../../src/models/Project';
import * as rollup from '../../../server/data/rollup';
import * as persistence from '../../../server/data/persistence';
import * as querying from '../../../server/data/querying';

import { createExampleRollup } from '../../utils/rollup';

describe('Server', () => {
  describe('Data', () => {
    describe('Rollup', () => {
      const userId = uuid.v4();
      const roll = createExampleRollup();
      const project = roll.project;
      const projectId = project.id;
      const [blockP, blockA, blockB, blockC, blockD, blockE] = roll.blocks;
      before(() => {
        return persistence.projectCreate(projectId, project, userId);
      });

      it('createRollup() has structure { project: project, blocks: [...blocks] }', () => {
        expect(roll.project).to.eql(project);
        expect(roll.blocks.length).to.equal(6);
      });

      it('writeProjectRollup() writes a whole rollup', () => {
        return rollup.writeProjectRollup(projectId, roll, userId)
          .then(() => Promise
            .all([
              persistence.projectGet(projectId),
              persistence.blockGet(blockA.id, projectId),
              persistence.blockGet(blockE.id, projectId),
            ])
            .then(([gotProject, gotA, gotE]) => {
              expect(gotProject).to.eql(project);
              expect(gotA).to.eql(blockA);
              expect(gotE).to.eql(blockE);
            })
          );
      });

      it('getProjectRollup() returns rollup given an ID', () => {
        return rollup.getProjectRollup(projectId)
          .then(roll => {
            expect(roll.project).to.eql(project);
            expect(roll.blocks.length).to.equal(6);
          });
      });

      it('writeProjectRollup() discards old blocks', () => {
        const blockF = new Block({projectId});
        const newComponentsBlockA = blockA.components.slice();
        newComponentsBlockA.shift(); //remove C
        newComponentsBlockA.push(blockF.id); //add F
        const editBlockA = Object.assign({}, blockA, {components: newComponentsBlockA});

        const newRoll = rollup.createRollup(project, blockP, editBlockA, blockB, blockD, blockE, blockF);
        return rollup.writeProjectRollup(projectId, newRoll, userId)
          .then(() => Promise
            .all([
              persistence.projectGet(projectId),
              persistence.blockGet(blockA.id, projectId),
              persistence.blockGet(blockF.id, projectId),
              persistence.blockGet(blockC.id, projectId),
            ])
            .then(([gotProject, gotA, gotF, gotC]) => {
              expect(gotProject).to.eql(project);
              expect(gotA).to.eql(editBlockA);
              expect(gotF).to.eql(blockF);
              expect(gotC).to.eql(null);
            })
            .then(() => querying.getAllBlockIdsInProject(projectId))
            .then(ids => expect(ids.length).to.equal(6))
          );
      });

      it('writeProjectRollup rejects if a block is invalid', (done) => {
        const badBlock = Object.assign(Block.classless(), { parents: { sha: 'invalidSha'} });
        const badRoll = createExampleRollup();
        badRoll.blocks.push(badBlock);

        return rollup.writeProjectRollup(projectId, badRoll, userId)
          .catch(err => {
            done();
          });
      });

      it('writeProjectRollup rejects if project is invalid', (done) => {
        const badProject = Object.assign(Project.classless(), { parents: { sha: 'invalidSha'} });
        const badRoll = createExampleRollup();
        badRoll.project = badProject;

        return rollup.writeProjectRollup(projectId, badRoll, userId)
          .catch(err => {
            done();
          });
      });
    });
  });
});
