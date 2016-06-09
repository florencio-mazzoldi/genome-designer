import Vector2D from '../geometry/vector2d';
import Node2D from './node2d';
import kT from '../views/layoutconstants.js';

/**
 * basic rectangular node
 */
export default class ListItem2D extends Node2D {

  constructor(props) {
    super(Object.assign({}, props, {
      glyph: 'listitem',
      textAlign: 'left',
      textIndent: kT.textPad + kT.optionDotW,
      color: '#1D222D',
    }));
  }
  /**
   * mostly for debugging
   * @return {String}
   */
  toString() {
    return 'LIST: ' + this.text;
  }

  /**
   * List items are sized by parent
   */
  getPreferredSize(str) {
    throw new Error('Not valid to call on a list item');
  }

}
