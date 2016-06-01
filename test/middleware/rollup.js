import chai from 'chai';
import * as api from '../../src/middleware/data';
import { range } from 'lodash';
const { assert, expect } = chai;
import {
  fileExists,
  fileRead,
  fileWrite,
  fileDelete,
  directoryExists,
  directoryMake,
  directoryDelete
} from '../../server/utils/fileSystem';
import Block from '../../src/models/Block';

import * as commitMessages from '../../server/data/commitMessages';
import * as filePaths from '../../server/utils/filePaths';
import * as rollup from '../../server/data/rollup';
import * as versioning from '../../server/data/versioning';
import * as persistence from '../../server/data/persistence';

import { createExampleRollup } from '../utils/rollup';

describe('Middleware', () => {
  describe('Rollup', () => {
    //create a test project to load
    const userId = '0'; //for test environment
    const roll = createExampleRollup();
    const project = roll.project;
    const projectId = project.id;

    before(() => rollup.writeProjectRollup(projectId, roll, userId));

    it('listProjects() lists available projects', () => {
      return api.listProjects()
        .then(projects => {
          const found = projects.find(proj => proj.id === projectId);
          expect(found).to.be.defined;
          expect(found).to.eql(project);
        });
    });

    it('loadProject() loads a project rollup', () => {
      return api.loadProject(projectId)
        .then(gotRoll => {
          expect(gotRoll.project).to.eql(project);
          assert(gotRoll.blocks.every(block => {
            return roll.blocks.some(initialBlock => initialBlock.id === block.id);
          }));
        });
    });

    it('saveProject() saves a project and blocks, can be loaded by persistence', () => {
      const roll = createExampleRollup();
      const project = roll.project;
      const projectId = project.id;
      const [blockP, blockA, blockB, blockC, blockD, blockE] = roll.blocks;

      return api.saveProject(projectId, roll)
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
          }));
    });

    it('saveProject() creates a commit', () => {
      const a_roll = createExampleRollup();
      const a_projectId = a_roll.project.id;
      const b_roll = Object.assign(createExampleRollup(), { project: a_roll.project });

      const a_path = filePaths.createProjectDataPath(a_projectId);
      let a_log;

      return api.saveProject(a_projectId, a_roll)
        .then(() => versioning.log(a_path))
        .then(log => {
          a_log = log;
        })
        .then(() => api.saveProject(a_projectId, b_roll))
        .then(() => versioning.log(a_path))
        .then(log => {
          assert(typeof log.length === 'number', 'log error in wrong format, got ' + log);
          expect(a_log.length + 1).to.equal(log.length);
        });
    });

    it('snapshot() creates a snapshot commit, returns the sha', () => {
      const roll = createExampleRollup();
      const project = roll.project;
      const projectId = project.id;
      const commitMessage = 'my fancy message';

      return api.snapshot(projectId, commitMessage, roll)
        .then(commit => {
          assert(commit.message.indexOf(commitMessages.SNAPSHOT) >= 0, 'wrong commit message type, shoudl be snapshot');
          assert(commit.message.indexOf(commitMessage) >= 0, 'commit message missing');
        });
    });

    it('can save a huge project (10mb or so)', () => {
      const roll = createExampleRollup();
      const project = roll.project;

      const newBlocks = range(1000).map(() => new Block());

      roll.blocks = roll.blocks.concat(newBlocks);

      return api.saveProject(project.id, roll);
    });
  });
});
