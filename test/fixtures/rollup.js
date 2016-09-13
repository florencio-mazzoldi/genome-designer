import invariant from 'invariant';
import { merge } from 'lodash';
import Block from '../../src/models/Block';
import Project from '../../src/models/Project';
import * as rollup from '../../server/data/rollup';
import * as persistence from '../../server/data/persistence';
import { createExampleRollup, createSequencedRollup, createListRollup } from '../utils/rollup';

/**
 * only for testing... all created with test user account
 * create a project with some example constructs
 *
 * 0 - hierarchy, no sequence, no lists
 *
 *     project
 *       |
 *       P
 *  /----|-----\
 *  A     B    F
 * /-\   |
 * C  D  E
 *
 * 1 - flat, all blocks have sequence
 *
 * project
 * |
 * A
 * |
 * B*-C*-D*-E*-F*-G*
 *
 * 2 - template with lists (e.g. EGF) TODO!!!!
 *
 */
export const createExampleProject = () => {
  invariant(process.env.NODE_ENV === 'test', 'can only be used in testing environment');

  //handle construct 0, assign rest onto this
  const roll = createExampleRollup();

  //construct 1
  const sequenceRoll = createSequencedRollup();
  roll.project.components.push(...sequenceRoll.project.components);
  Object.assign(roll.blocks, sequenceRoll.blocks);

  //construct 2
  const listRoll = createListRollup();
  roll.project.components.push(...listRoll.project.components);
  Object.assign(roll.blocks, listRoll.blocks);

  //write everything
  return Promise.all([
    rollup.writeProjectRollup(roll.project.id, roll, '0'),
    ...Object.keys(sequenceRoll.sequences).map(seqMd5 => persistence.sequenceWrite(seqMd5, sequenceRoll.sequences[seqMd5])),
    ...Object.keys(listRoll.sequences).map(seqMd5 => persistence.sequenceWrite(seqMd5, listRoll.sequences[seqMd5])),
  ])
    .then(() => roll);
};

export default createExampleProject;
