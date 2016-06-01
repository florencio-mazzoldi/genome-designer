import Glyph2D from '../glyph2d';

import kT from '../../../views/layoutconstants';
import { setAttribute } from '../../../utils';

export default class RoleGlyph2D extends Glyph2D {

  /**
   * represents a block with, possibly an SBOL symbol and a context menu
   * that is shown only on hover.
   */
  constructor(node) {
    super(node);
    // basic div block
    this.el = document.createElement('div');
    this.el.className = 'glyph';
    // add our outer container to the node element
    this.node.el.appendChild(this.el);
  }

  /**
   * render latest changes
   */
  update() {
    // basic rectangle
    const sw = this.node.strokeWidth;
    this.el.style.left = -(sw / 2) + 'px';
    this.el.style.top = -(sw / 2) + 'px';
    this.el.style.width = (this.node.width + sw) + 'px';
    this.el.style.height = (this.node.height + sw) + 'px';
    this.el.style.backgroundColor = this.node.fill;
    this.el.style.borderLeft = sw ? `${sw}px solid ${this.node.stroke}` : 'none';
    this.el.style.borderRight = sw ? `${sw}px solid ${this.node.stroke}` : 'none';
  }
}
