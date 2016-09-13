import md5 from 'md5';
import { range } from 'lodash';
import Project from '../../src/models/Project';
import Block from '../../src/models/Block';
import rollupFromArray from '../../src/utils/rollup/rollupFromArray';
import { generateRandomSequence } from '../utils/sequence';

export const numberBlocksInRollup = 7;

/*
 Returns a Rollup in the form { project: project, blocks: {P,A,B,C,D,E,F} }
 parent most block has 3 components so easier to find
 */
export const createExampleRollup = () => {
  /**
   *
   *     project
   *       |
   *       P
   *  /----|-----\
   *  A     B    F
   * /-\   |
   * C  D  E
   */

  const blockC = Block.classless();
  const blockD = Block.classless();
  const blockE = Block.classless();
  const blockF = Block.classless();
  const blockB = Block.classless({
    components: [blockE.id],
  });
  const blockA = Block.classless({
    components: [blockC.id, blockD.id],
  });
  const blockP = Block.classless({
    components: [blockA.id, blockB.id, blockF.id],
  });
  const project = Project.classless({
    components: [blockP.id],
  });

  const blocks = [blockP, blockA, blockB, blockC, blockD, blockE, blockF];

  //assign the project ID, as it should be there anyway, and will be there after writing
  blocks.forEach(block => Object.assign(block, { projectId: project.id }));

  const roll = rollupFromArray(project, ...blocks);
  return roll;
};

//note - slightly abnormal signature (since for tests), returns sequences on the rollup as well
/*
 * project
 * |
 * A
 * |
 * B*-C*-D*-E*-F*-G*
 */
export const createSequencedRollup = () => {
  const numSeqs = numberBlocksInRollup - 1;
  const sequences = range(numSeqs).map(() => generateRandomSequence());
  const sequenceMd5s = sequences.map(seq => md5(seq));
  const sequenceMap = sequenceMd5s.reduce((acc, seqMd5, index) => {
    return Object.assign(acc, { [seqMd5]: sequences[index] });
  }, {});

  const blocks = range(numSeqs).map((index) => Block.classless({
    sequence: {
      md5: sequenceMd5s[index],
    },
  }));

  const construct = Block.classless({
    components: blocks.map(block => block.id),
  });

  const project = Project.classless({
    components: [construct.id],
  });

  const roll = rollupFromArray(project, ...blocks, construct);
  Object.assign(roll, { sequences: sequenceMap });
  return roll;
};

//creates project with 4 list blocks, each with 5 options (all active, all with a random sequence)
export const createListRollup = () => {
  const numListBlocks = 4;
  const numOptions = 5;
  const totalBlocks = numListBlocks * numOptions;

  const sequences = range(totalBlocks).map(() => generateRandomSequence());
  const sequenceMd5s = sequences.map(seq => md5(seq));
  const sequenceMap = sequenceMd5s.reduce((acc, seqMd5, index) => {
    return Object.assign(acc, { [seqMd5]: sequences[index] });
  }, {});

  const options = range(totalBlocks).map((index) => Block.classless({
    sequence: {
      md5: sequenceMd5s[index],
    },
  }));

  const listBlocks = range(numListBlocks).map(index => {
    const opts = options.slice(index * numOptions, (index + 1) * numOptions);
    const optionIds = opts.map(opt => opt.id);

    return Block.classless({
      options: optionIds.reduce((acc, optionId) => Object.assign(acc, { [optionId]: true }), {}),
    });
  });

  const project = Project.classless({
    components: listBlocks.map(block => block.id),
  });

  const roll = rollupFromArray(project, ...listBlocks, ...options);
  Object.assign(roll, { sequences: sequenceMap });
  return roll;
};