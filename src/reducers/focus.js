import * as ActionTypes from '../constants/ActionTypes';
import { LOCATION_CHANGE } from 'react-router-redux';
import invariant from 'invariant';

export const initialState = {
  forceProject: null, //forced model
  forceBlocks: [], //forced models
  projectId: null, //current project. Set by projectPage. preferred over route query.
  blockIds: [], //ids of selection
  constructId: null, //id of current
  level: 'project', //what to give priority to (when defined)
  options: {}, //map {listBlockId : selectedOptionId}
};

export default function inventory(state = initialState, action) {
  switch (action.type) {
  case ActionTypes.FOCUS_FORCE_PROJECT:
    const { project } = action;
    return Object.assign({}, state, {
      forceBlocks: [],
      blockIds: [],
      constructId: null,
      forceProject: project,
      level: 'project',
    });

  case ActionTypes.FOCUS_FORCE_BLOCKS:
    const { blocks } = action;
    invariant(Array.isArray(blocks), 'must pass array to FOCUS_FORCE_BLOCKS');
    return Object.assign({}, state, {
      forceBlocks: blocks,
      forceProject: null,
      blockIds: [],
      constructId: null,
      level: 'block',
    });

  case ActionTypes.FOCUS_PROJECT:
    const { projectId } = action;
    return Object.assign({}, state, {
      forceProject: null,
      forceBlocks: [],
      projectId: projectId,
      level: 'project',
    });

  case ActionTypes.FOCUS_CONSTRUCT:
    const { constructId } = action;
    return Object.assign({}, state, {
      forceProject: null,
      forceBlocks: [],
      constructId: constructId,
      level: 'construct',
    });

  case ActionTypes.FOCUS_BLOCKS :
    const { blockIds } = action;
    invariant(Array.isArray(blockIds), 'must pass array to FOCUS_BLOCKS');
    return Object.assign({}, state, {
      forceProject: null,
      forceBlocks: [],
      blockIds: blockIds,
      level: 'block',
    });

  case ActionTypes.FOCUS_PRIORITIZE :
    const { level } = action;
    return Object.assign({}, state, {
      level,
    });

  case ActionTypes.FOCUS_BLOCK_OPTION :
    const { options } = action;
    return Object.assign({}, state, {
      options,
    });

  case LOCATION_CHANGE :
    //project page sets project ID properly, running after the state changes
    return Object.assign({}, initialState);

  default :
    return state;
  }
}
