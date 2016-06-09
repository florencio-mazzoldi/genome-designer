import * as ActionTypes from '../constants/ActionTypes';
import * as BlockSelector from '../selectors/blocks';
import invariant from 'invariant';
import safeValidate from '../schemas/fields/safeValidate';
import { id as idValidatorCreator } from '../schemas/fields/validators';
import Block from '../models/Block';
import Project from '../models/Project';

const idValidator = (id) => safeValidate(idValidatorCreator(), true, id);

export const focusProject = (inputProjectId = null) => {
  return (dispatch, getState) => {
    //testing - can re-enable when remove 'combinatorial' project
    //const projectId = idValidator(inputProjectId) ? inputProjectId : null;
    const projectId = inputProjectId;

    dispatch({
      type: ActionTypes.FOCUS_PROJECT,
      projectId,
    });
    return projectId;
  };
};

export const focusConstruct = (inputConstructId) => {
  return (dispatch, getState) => {
    //null is valid to unselect all constructs
    const constructId = idValidator(inputConstructId) ? inputConstructId : null;

    //prune blocks if outside current construct
    const currentBlocks = getState().focus.blockIds;
    if (constructId && currentBlocks.length) {
      const children = dispatch(BlockSelector.blockGetComponentsRecursive(constructId));
      const blockIds = currentBlocks.filter(blockId => {
        return children.some(block => block.id === blockId);
      });
      dispatch({
        type: ActionTypes.FOCUS_BLOCKS,
        blockIds,
      });
    }

    dispatch({
      type: ActionTypes.FOCUS_CONSTRUCT,
      constructId,
    });
    return constructId;
  };
};

export const focusBlocks = (blockIds) => {
  return (dispatch, getState) => {
    invariant(Array.isArray(blockIds), 'must pass array to focus blocks');
    invariant(blockIds.every(block => idValidator(block)), 'must pass array of block IDs');

    if (blockIds.length) {
      const firstBlockId = blockIds[0];
      const construct = dispatch(BlockSelector.blockGetParentRoot(firstBlockId));
      // null => no parent => construct (or detached)... undefined could be soething else
      //const constructId = !!construct ? construct.id : (construct !== null ? firstBlockId : undefined);
      const constructId = construct ? construct.id : undefined;
      if (constructId !== getState().focus.constructId || constructId === firstBlockId) {
        dispatch({
          type: ActionTypes.FOCUS_CONSTRUCT,
          constructId,
        });
      }
    }

    dispatch({
      type: ActionTypes.FOCUS_BLOCKS,
      blockIds,
    });
    return blockIds;
  };
};

export const focusBlocksAdd = (blocksIdsToAdd) => {
  return (dispatch, getState) => {
    invariant(Array.isArray(blocksIdsToAdd), 'must pass array to focus blocks');
    invariant(blocksIdsToAdd.every(block => idValidator(block)), 'must pass array of block IDs');

    const base = getState().focus.blockIds;
    const blockIds = [...new Set([...base, ...blocksIdsToAdd])];

    return dispatch(focusBlocks(blockIds));
  };
};

export const focusBlocksToggle = (blocksToToggle) => {
  return (dispatch, getState) => {
    invariant(Array.isArray(blocksToToggle), 'must pass array to focus blocks');

    const currentBlockIds = getState().focus.blockIds;
    const blockSet = new Set(currentBlockIds);

    blocksToToggle.forEach(block => {
      if (blockSet.has(block)) {
        blockSet.delete(block);
      } else {
        blockSet.add(block);
      }
    });
    const blockIds = [...blockSet];

    return dispatch(focusBlocks(blockIds));
  };
};

//pass model, takes precedence
export const focusForceBlocks = (blocks) => {
  return (dispatch, getState) => {
    invariant(blocks.every(block => Block.validate(block, false)), 'each block must pass validation to focus it');

    dispatch({
      type: ActionTypes.FOCUS_FORCE_BLOCKS,
      blocks,
    });
    return blocks;
  };
};

//pass model, takes precedence
export const focusForceProject = (project) => {
  return (dispatch, getState) => {
    invariant(Project.validate(project, false), 'must pass a valid project');

    dispatch({
      type: ActionTypes.FOCUS_FORCE_PROJECT,
      project,
    });
    return project;
  };
};

export const focusPrioritize = (level = 'project') => {
  return (dispatch, getState) => {
    invariant(['project', 'construct', 'block'].indexOf(level) >= 0, 'must pass a valid type to give priority to');

    dispatch({
      type: ActionTypes.FOCUS_PRIORITIZE,
      level,
    });
    return level;
  };
};

export const focusBlockOption = (blockId, optionId) => {
  return (dispatch, getState) => {
    invariant(idValidator(blockId) && idValidator(optionId), 'must pass valid block ID and optionId');

    const oldOptions = getState().focus.options;
    const options = Object.assign({}, oldOptions, { [blockId]: optionId });

    dispatch({
      type: ActionTypes.FOCUS_BLOCK_OPTION,
      options,
    });
    return options;
  };
};
