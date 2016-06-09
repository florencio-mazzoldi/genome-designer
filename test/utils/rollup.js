import Project from '../../src/models/Project';
import Block from '../../src/models/Block';

import * as rollup from '../../server/data/rollup';

export const numberBlocksInRollup = 6;

/*
 Returns a Rollup in the form { project: project, blocks: [P,A,B,C,D,E] }
 */
export const createExampleRollup = () => {
  /**
   *
   * project
   *    |
   *    P
   *  /---\
   *  A     B
   * /-\   |
   * C  D  E
   */

  const blockC = Block.classless();
  const blockD = Block.classless();
  const blockE = Block.classless();
  const blockB = Block.classless({
    components: [blockE.id],
  });
  const blockA = Block.classless({
    components: [blockC.id, blockD.id],
  });
  const blockP = Block.classless({
    components: [blockA.id, blockB.id],
  });
  const project = Project.classless({
    components: [blockP.id],
  });

  const blocks = [blockP, blockA, blockB, blockC, blockD, blockE];

  //assign the project ID, as it should be there anyway, and will be there after writing
  blocks.forEach(block => Object.assign(block, { projectId: project.id }));

  const roll = rollup.createRollup(project, ...blocks);
  return roll;
};
