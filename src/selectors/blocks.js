import invariant from 'invariant';
import BlockDefinition from '../schemas/Block';
import { values, flatten } from 'lodash';

/***************************************
 * Parent accessing / store knowledge-requiring
 ***************************************/

const _getBlockFromStore = (blockId, store) => {
  return store.blocks[blockId] || null;
};

const _getParentFromStore = (blockId, store, def = null) => {
  const id = Object.keys(store.blocks).find(id => {
    const block = _getBlockFromStore(id, store);
    return block.components.indexOf(blockId) > -1;
  });
  return !!id ? store.blocks[id] : def;
};

//todo - move to object
const _getChildrenShallow = (blockId, store) => {
  const block = _getBlockFromStore(blockId, store);
  return block.components.map(id => _getBlockFromStore(id, store));
};

//todo - move to object
const _getAllChildren = (rootId, store, children = []) => {
  const kids = _getChildrenShallow(rootId, store);
  if (kids.length) {
    children.push(...kids);
    kids.forEach(kid => _getAllChildren(kid.id, store, children));
  }
  return children;
};

const _getAllChildrenByDepth = (rootId, store, children = {}, depth = 1) => {
  const kids = _getChildrenShallow(rootId, store);
  if (kids.length) {
    kids.forEach(kid => {
      children[kid.id] = depth;
      _getAllChildrenByDepth(kid.id, store, children, depth + 1);
    });
  }
  return children;
};

const _filterToLeafNodes = (blocks) => blocks.filter(child => !child.components.length);

const _getParents = (blockId, state) => {
  const parents = [];
  let parent = _getParentFromStore(blockId, state);
  while (parent) {
    parents.push(parent);
    parent = _getParentFromStore(parent.id, state);
  }
  return parents;
};

const _getSiblings = (blockId, state) => {
  const parent = _getParentFromStore(blockId, state, {});
  return (parent.components || []).map(id => _getBlockFromStore(id, state));
};

//returns map of { optionId : option }
const _getOptions = (blockId, state, includeUnselected = false) => {
  const block = _getBlockFromStore(blockId, state);
  invariant(block.isList(), 'must pass a list block to get its options');

  return block.getOptions(includeUnselected)
    .reduce((acc, optionId) => Object.assign(acc, {
      [optionId]: _getBlockFromStore(optionId, state),
    }), {});
};

// flattens component hierarchy
// returns flat array of blocks, not touching list blocks
const _flattenConstruct = (blockId, state) => {
  const block = _getBlockFromStore(blockId, state);
  if (!block.components.length) {
    return [block];
  }

  const components = block.components
    .map(compId => _getBlockFromStore(compId, state));

  return flatten(components.map(component => component.isConstruct() ?
    _flattenConstruct(component.id, state) :
    [component]
  ));
};

export const blockGet = (blockId) => {
  return (dispatch, getState) => {
    return _getBlockFromStore(blockId, getState());
  };
};

//first parent is direct parent, last parent is construct
//returns blocks, not ids
export const blockGetParents = (blockId) => {
  return (dispatch, getState) => {
    const store = getState();
    return _getParents(blockId, store);
  };
};

//i.e. get construct, or null if it is the construct (or detached)
export const blockGetParentRoot = (blockId) => {
  return (dispatch, getState) => {
    const parents = _getParents(blockId, getState());
    return parents.length ? parents.pop() : null;
  };
};

export const blockGetChildrenRecursive = (blockId) => {
  return (dispatch, getState) => {
    return _getAllChildren(blockId, getState());
  };
};

export const blockGetChildrenByDepth = (blockId) => {
  return (dispatch, getState) => {
    return _getAllChildrenByDepth(blockId, getState());
  };
};

//get all non-constructs
//todo - move to object
export const blockGetLeaves = (blockId) => {
  return (dispatch, getState) => {
    return _filterToLeafNodes(_getAllChildren(blockId, getState()));
  };
};

export const blockGetSiblings = (blockId) => {
  return (dispatch, getState) => {
    const state = getState();
    return _getSiblings(blockId, state);
  };
};

//this could be optimized...
const _getBoundingBlocks = (state, ...blockIds) => {
  const construct = _getParentFromStore(blockIds[0], state);
  const depthMap = _getAllChildrenByDepth(construct.id, state);
  const idsToDepth = blockIds.reduce((acc, id) => Object.assign(acc, { [id]: depthMap[id] }), {});
  const highestLevel = blockIds.reduce((acc, id) => Math.min(acc, idsToDepth[id]), Number.MAX_VALUE);
  const blocksIdsAtHighest = blockIds.filter(id => idsToDepth[id] === highestLevel);
  const highSiblings = _getSiblings(blocksIdsAtHighest[0], state);

  //dumb search of all children of siblings to see if focused block present
  const relevantSiblings = highSiblings.filter(sibling => {
    if (blockIds.indexOf(sibling.id) >= 0) {
      return true;
    }
    const kids = _getAllChildren(sibling.id, state);
    return kids.some(kid => blockIds.indexOf(kid.id) >= 0);
  });
  const relevantSiblingIds = relevantSiblings.map(sib => sib.id);

  //get the bounds of highest level siblings: [firstId, lastId]
  return [
    highSiblings.find(sib => relevantSiblingIds.indexOf(sib.id) >= 0),
    highSiblings.slice().reverse().find(sib => relevantSiblingIds.indexOf(sib.id) >= 0),
  ];
};

export const blockGetBounds = (...blockIds) => {
  return (dispatch, getState) => {
    return _getBoundingBlocks(getState(), ...blockIds);
  };
};

export const blockGetRange = (...blockIds) => {
  return (dispatch, getState) => {
    const state = getState();
    const bounds = _getBoundingBlocks(state, ...blockIds);
    const siblings = _getSiblings(bounds[0].id, state);
    const [boundStart, boundEnd] = bounds.map(boundBlock => siblings.findIndex(sibling => sibling.id === boundBlock.id));
    return siblings.slice(boundStart, boundEnd + 1);
  };
};

export const blockGetIndex = (blockId) => {
  return (dispatch, getState) => {
    const parent = _getParentFromStore(blockId, getState(), {});
    return Array.isArray(parent.components) ? parent.components.indexOf(blockId) : -1;
  };
};

const _checkSingleBlockIsSpec = (block) => {
  invariant(!block.isList() && !block.isConstruct(), 'list blocks + constructs are not specs');
  return block.sequence.length > 0;
};

export const blockIsSpec = (blockId) => {
  return (dispatch, getState) => {
    const store = getState();
    const flattened = _flattenConstruct(blockId, store);

    return flattened.every(block => {
      if (block.isList()) {
        //only want selected options
        const options = values(_getOptions(block.id, store, false));
        return options.length > 0 && options.every(selectedBlock => _checkSingleBlockIsSpec(selectedBlock));
      }
      return _checkSingleBlockIsSpec(block);
    });
  };
};

export const blockIsValid = (model) => {
  return (dispatch, getState) => {
    return BlockDefinition.validate(model);
  };
};

export const blockHasSequence = blockId => {
  return (dispatch, getState) => {
    const block = _getBlockFromStore(blockId, getState());
    return !!block && block.hasSequence();
  };
};

/*
deprecated filters for now
//expects object block.rules.filter
export const blockGetFiltered = filters => {
  return (dispatch, getState) => {
    invariant(typeof filters === 'object', 'must pass ovject of filters');
    const blockState = getState().blocks;

    return Object.keys(blockState)
      .map(id => blockState[id])
      .filter(block => {
        return Object.keys(filters).every(key => {
          const value = filters[key];
          return pathGet(block, key) === value;
        });
      });
  };
};
*/

//given a construct, returns an array of parts that have sequence / are list blocks, including hidden blocks
export const blockFlattenConstruct = (blockId) => {
  return (dispatch, getState) => {
    return _flattenConstruct(blockId, getState());
  };
};

/*
 returns 2D array - based on position - of block combinations (including hidden blocks), e.g.

 given:
 A: { sequence }                                        //single part
 B: { options: {2: true, 3: true, 4: true, 5: false } } //list block with 3 selected options
 C: { options: { 6: true } }                            //list block, one option

 generates:
 [
   [A],
   [block2, block3, block4],
   [block6],
 ]
 */
export const blockGetPositionalCombinations = (blockId, includeUnselected = false) => {
  return (dispatch, getState) => {
    invariant(dispatch(blockIsSpec(blockId)), 'block must be a spec to get combinations');

    const state = getState();

    //generate 2D array, outer array for positions, inner array with lists of parts
    return _flattenConstruct(blockId, state)
      .map(block => block.isList() ?
        values(_getOptions(block.id, state, includeUnselected)) :
        [block]
      );
  };
};

/*
 returns 2D array of all possible constructs, flattened, and with options unfurled, including hidden blocks

 given:
 A: { sequence }                                        //single part
 B: { options: {2: true, 3: true, 4: true, 5: false } } //list block with 3 selected options
 C: { options: { 6: true } }                            //list block, one option

 generates:
 [
   [A, block2, block6],
   [A, block3, block6],
   [A, block4, block6],
 ]
 */
//todo - parameters for limiting number combinations, how to select them
export const blockGetCombinations = (blockId, parameters = {}) => {
  return (dispatch, getState) => {
    const positions = dispatch(blockGetPositionalCombinations(blockId, false));

    //guarantee both accumulator (and positions) array have at least one item to map over
    const first = positions.shift();

    //iterate through positions, essentially generating tree with * N branches for N options at position
    return positions.reduce((acc, position) => {
      // for each extant construct, create one variant which adds each part respectively
      // flatten them for return and repeat!
      return flatten(position.map(option => acc.map(partialConstruct => partialConstruct.concat(option))));
    }, [first]);
  };
};

