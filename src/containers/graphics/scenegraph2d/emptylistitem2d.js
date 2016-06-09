import Vector2D from '../geometry/vector2d';
import Node2D from './node2d';
import kT from '../views/layoutconstants.js';

/**
 * basic rectangular node
 */
export default class EmptyListItem2D extends Node2D {

  constructor(props) {
    super(Object.assign({}, props, {
      glyph: 'listitem',
      textAlign: 'center',
      text: 'Empty List',
      color: 'gray',
    }));
  }

  /**
   * List items are sized by parent
   */
  getPreferredSize(str) {
    throw new Error('Not valid to call on an empty list item');
  }
}
