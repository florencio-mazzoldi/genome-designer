import Glyph2D from '../glyph2d';

export default class RectangleGlyph2D extends Glyph2D {

  /**
   * Simple HTML based rectangle. The only complexity is that we carefully
   * adjust the size to accomodate the stroke ( which is rendered using a border property).
   * HTML borders are either inside or outside the elenent, for compatibility
   * with canvas/svg with make the border straddle the edges.
   * @param {Node2D} node - the node for which we render ourselves
   */
  constructor(node) {
    super(node);
    this.el = document.createElement('div');
    this.el.className = 'glyph';
    this.node.el.appendChild(this.el);
  }

  /**
   * render latest changes
   */
  update() {
    const sw = this.node.strokeWidth;
    this.el.style.left = -(sw / 2) + 'px';
    this.el.style.top = -(sw / 2) + 'px';
    this.el.style.width = (this.node.width + sw) + 'px';
    this.el.style.height = (this.node.height + sw) + 'px';
    this.el.style.backgroundColor = this.node.fill;
    this.el.style.border = sw ? `${sw}px solid ${this.node.stroke}` : 'none';
  }
}
