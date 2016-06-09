import * as ActionTypes from '../constants/ActionTypes';
import * as instanceMap from '../store/instanceMap';
import { blocks as testBlocks } from './testProject';
import { blocks as combiBlocks } from './testCombinatorial';

const initialState = {};

//testing = combinatorial
combiBlocks.forEach(block => Object.assign(initialState,
  { [block.id]: block }
));
instanceMap.saveBlock(...combiBlocks);

if (process.env.NODE_ENV === 'test') {
  testBlocks.forEach(block => Object.assign(initialState,
    { [block.id]: block }
  ));
}

export default function blocks(state = initialState, action) {
  switch (action.type) {
  case ActionTypes.BLOCK_CREATE :
  case ActionTypes.BLOCK_MERGE :
  case ActionTypes.BLOCK_RENAME :
  case ActionTypes.BLOCK_SET_COLOR :
  case ActionTypes.BLOCK_CLONE :
  case ActionTypes.BLOCK_LOAD :
  case ActionTypes.BLOCK_STASH :
  case ActionTypes.BLOCK_FREEZE :
  case ActionTypes.BLOCK_SET_ROLE :
  case ActionTypes.BLOCK_ADD_ROLE :
  case ActionTypes.BLOCK_ANNOTATE :
  case ActionTypes.BLOCK_REMOVE_ANNOTATION :
  case ActionTypes.BLOCK_SET_SEQUENCE :
  case ActionTypes.BLOCK_OPTION_ADD :
  case ActionTypes.BLOCK_OPTION_REMOVE :
  case ActionTypes.BLOCK_OPTION_TOGGLE :
  case ActionTypes.BLOCK_COMPONENT_ADD :
  case ActionTypes.BLOCK_COMPONENT_MOVE :
  case ActionTypes.BLOCK_COMPONENT_REMOVE :
    //can pass either block {} or blocks [], precedence for blocks array
    const { block, blocks } = action;

    if (Array.isArray(blocks)) {
      instanceMap.saveBlock(...blocks);
      const toMerge = blocks.reduce((acc, block) => Object.assign(acc, { [block.id]: block }), {});
      return Object.assign({}, state, toMerge);
    }

    instanceMap.saveBlock(block);
    return Object.assign({}, state, { [block.id]: block });

  case ActionTypes.BLOCK_DETACH :
  case ActionTypes.BLOCK_DELETE :
    const { blockId, blockIds } = action;
    const nextState = Object.assign({}, state);

    if (Array.isArray(blockIds)) {
      blockIds.forEach(blockId => { delete nextState[blockId]; });
      return nextState;
    }

    delete nextState[blockId];
    return nextState;

  default :
    return state;
  }
}
