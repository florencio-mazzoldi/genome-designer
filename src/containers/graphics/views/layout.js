import Box2D from '../geometry/box2d';
import Vector2D from '../geometry/vector2d';
import Node2D from '../scenegraph2d/node2d';
import Block2D from '../scenegraph2d/block2d';
import SBOL2D from '../scenegraph2d/sbol2d';
import kT from './layoutconstants';
import invariant from 'invariant';

// just for internal tracking of what type of block a node represents.
const blockType = 'block';
const sbolType = 'sbol';

/**
 * layout and scene graph manager for the construct viewer
 */
export default class Layout {

  constructor(constructViewer, sceneGraph, options) {
    // we need a construct viewer, a scene graph, a construct and options
    this.constructViewer = constructViewer;
    this.sceneGraph = sceneGraph;
    // extend this with options
    Object.assign(this, {
      layoutAlgorithm: kT.layoutWrap,
      baseColor: 'white',
    }, options);

    // prep data structures for layout
    this.rows = [];
    this.nodes2parts = {};
    this.parts2nodes = {};
    this.partTypes = {};
  }
  /**
   * size the scene graph to just accomodate all the nodes that are present.
   * @return {[type]} [description]
   */
  autoSizeSceneGraph() {
    const aabb = this.sceneGraph.getAABB();
    if (aabb) {
      this.sceneGraph.width = aabb.right + kT.insetX;
      this.sceneGraph.height = aabb.bottom + kT.insetY;
      this.sceneGraph.updateSize();
    }
  }
  /**
   * setup the bi drectional mapping between nodes / elements
   * @param  {[type]} part    [description]
   * @param  {[type]} node [description]
   * @return {[type]}      [description]
   */
  map(part, node) {
    this.nodes2parts[node.uuid] = part;
    this.parts2nodes[part] = node;
    this.partTypes[part] = this.isSBOL(part) ? sbolType : blockType;
  }

  /**
   * remove the part, node and unmap. Return the node ( its isn't disposed )
   * so that is can be reused.
   */
  removePart(part) {
    const node = this.nodeFromElement(part);
    invariant(node, 'expected a matching node');
    delete this.nodes2parts[node.uuid];
    delete this.parts2nodes[part];
    delete this.partTypes[part];
    node.parent.removeChild(node);
    return node;
  }
  /**
   * return the element from the data represented by the given node uuid
   * @param  {[type]} uuid [description]
   * @return {[type]}      [description]
   */
  elementFromNode(node) {
    return this.nodes2parts[node.uuid];
  }
  /**
   * reverse mapping from anything with an 'uuid' property to a node
   * @param  {[type]} element [description]
   * @return {[type]}         [description]
   */
  nodeFromElement(element) {
    return this.parts2nodes[element];
  }
  /**
   * create a node, if not already created for the given piece.
   * Add to our hash for tracking
   * @param  {[type]} part          [description]
   * @param  {[type]} appearance [description]
   * @return {[type]}            [description]
   */
  partFactory(part, appearance) {
    // if the part type has changed remove it before updating to a new node/glyph
    const partType = this.isSBOL(part) ? sbolType : blockType;
    if (this.partTypes[part] && this.partTypes[part] !== partType) {
      this.removePart(part);
    }

    if (!this.nodeFromElement(part)) {
      const props = Object.assign({}, {
        sg: this.sceneGraph,
      }, appearance);
      let node = null;
      if (this.isSBOL(part)) {
        props.sbolName = this.blocks[part].rules.sbol;
        node = new SBOL2D(props);
      } else {
        node = new Block2D(props);
      }
      this.sceneGraph.root.appendChild(node);
      this.map(part, node);
    }
  }
  /**
   * return one of the meta data properties for a part.
   */
  partMeta(part, meta) {
    return this.blocks[part].metadata[meta];
  }

  /**
   * return the property within the rule part of the blocks data
   * @param  {[type]} part [description]
   * @param  {[type]} name [description]
   * @return {[type]}      [description]
   */
  partRule(part, name) {
    return this.blocks[part].rules[name];
  }

  /**
   * return true if the block appears to be an SBOL symbol
   * @param  {[type]}  part [description]
   * @return {Boolean}      [description]
   */
  isSBOL(part) {
    return !!this.blocks[part].rules.sbol;
  }

  /**
   * return the part ID or if metadata is available use the name property if available.
   * If the part is an SBOL symbol then use the symbol name preferentially
   */
  partName(part) {
    return this.partMeta(part, 'name') || this.partRule(part, 'sbol') || 'block';
  }
  /**
   * create the banner / bar for the construct ( contains the triangle )
   * @return {[type]} [description]
   */
  bannerFactory() {
    if (!this.banner) {
      this.banner = new Node2D({
        sg: this.sceneGraph,
        fill: this.baseColor,
        stroke: this.baseColor,
        glyph: 'construct-banner',
      });
      this.sceneGraph.root.appendChild(this.banner);
    }
  }
  /**
   * create title as necessary
   * @param  {[type]} part [description]
   * @return {[type]}   [description]
   */
  titleFactory(part) {
    if (!this.titleNode) {
      this.titleNode = new Node2D(Object.assign({
        sg: this.sceneGraph,
      }, kT.titleAppearance));
      this.sceneGraph.root.appendChild(this.titleNode);
    }
  }
  /**
   * create the vertical bar as necessary
   * @return {[type]} [description]
   */
  verticalFactory() {
    if (!this.vertical) {
      this.vertical = new Node2D(Object.assign({
        sg: this.sceneGraph,
        fill: this.baseColor,
      }, kT.verticalAppearance));
      this.sceneGraph.root.appendChild(this.vertical);
    }
  }
  /**
   * create or recycle a row on demand. resetRows
   * should be called whenever the update starts so this method
   * can track which rows are still in play or ready to be disposed.
   * When the update is complete, call disposeRows() to get rid
   * of any unused rows
   * @return {[type]} [description]
   */
  rowFactory(bounds) {
    // re-use existing if possible
    let row = null;
    if (this.rows.length) {
      row = this.rows.shift();
    } else {
      row = new Node2D(Object.assign({
        sg: this.sceneGraph,
        fill: this.baseColor,
      }, kT.rowAppearance));
      this.sceneGraph.root.appendChild(row);
    }
    // set bounds
    row.set({bounds});

    // save into new rows so we know this row is in use
    this.newRows.push(row);
    return row;
  }
  /**
   * setup an array to track which rows are still being used
   */
  resetRows() {
    this.newRows = [];
  }
  /**
   * dispose and unused rows and move newRows to rows
   */
  disposeRows() {
    // cleanup unused rows
    while (this.rows.length) {
      this.sceneGraph.root.removeChild(this.rows.pop());
    }
    this.rows = this.newRows;
    this.newRows = null;
  }
  /**
   * store layout information on our cloned copy of the data, constructing
   * display elements as required
   * @return {[type]} [description]
   */
  update(construct, layoutAlgorithm, blocks, currentBlocks, currentConstructId) {
    this.construct = construct;
    this.currentConstructId = currentConstructId;
    this.layoutAlgorithm = layoutAlgorithm;
    this.blocks = blocks;
    this.currentBlocks = currentBlocks;

    switch (this.layoutAlgorithm) {
    case kT.layoutWrap:
      this.layoutWrap();
      break;

    case kT.layoutFull:
      this.layoutFull();
      break;

    case kT.layoutFit:
      this.layoutFit();
      break;

    default: throw new Error('Not a valid layout algorithm');
    }
    // auto size scene after layout
    this.autoSizeSceneGraph();
  }

  /**
   * one of several different layout algorithms
   * @return {[type]} [description]
   */
  layoutWrap() {
    this.layout({
      xlimit: this.sceneGraph.availableWidth - kT.insetX,
      condensed: false,
    });
  }
  layoutFull() {
    this.layout({
      xlimit: Number.MAX_VALUE,
      condensed: false,
    });
  }
  layoutFit() {
    this.layout({
      xlimit: this.sceneGraph.availableWidth - kT.insetX,
      condensed: true,
    });
  }
  /**
   * measure the given text or return its condensed size
   */
  measureText(node, str, condensed) {
    return node.getPreferredSize(str, condensed);
  }
  /**
   * return the point where layout of actual blocks begins
   * @return {[type]} [description]
   */
  getInitialLayoutPoint() {
    return new Vector2D(kT.insetX + kT.rowBarW, kT.insetY + kT.titleH + kT.rowBarH);
  }
  /**
   * layout, configured with various options:
   * xlimit: maximum x extent
   * @return {[type]} [description]
   */
  layout(layoutOptions) {
    // shortcut
    const ct = this.construct;
    // construct the banner
    this.bannerFactory();
    this.banner.set({
      bounds: new Box2D(0, 0, this.sceneGraph.availableWidth, kT.bannerHeight),
    });
    // top left of our area to render in
    const xs = kT.insetX;
    const ys = kT.insetY;
    // maximum x position
    const mx = layoutOptions.xlimit;
    // reset row factory
    this.resetRows();
    // create title as neccessary and position
    this.titleFactory(ct);
    // update title to current position and text
    const isSelectedConstruct = this.construct.id === this.currentConstructId;
    this.titleNode.set({
      bounds: new Box2D(xs, ys, this.sceneGraph.availableWidth, kT.titleH),
      text: ct.metadata.name || ct.id,
      color: isSelectedConstruct ? 'white' : this.baseColor,
    });
    // layout all the various components, constructing elements as required
    // and wrapping when a row is complete
    let xp = xs + kT.rowBarW;
    let yp = ys + kT.titleH + kT.rowBarH;

    // used to determine when we need a new row
    let row = null;
    // update / make all the parts
    ct.components.forEach(part => {
      // create a row bar as neccessary
      if (!row) {
        row = this.rowFactory(new Box2D(xs, yp - kT.rowBarH, 0, kT.rowBarH));
      }
      // resize row bar to current row width
      const rw = xp - xs;
      row.set({translateX: xs + rw / 2, width: rw});

      // create the node representing the part
      this.partFactory(part, kT.partAppearance);

      // measure element text or used condensed spacing
      const td = this.measureText(this.nodeFromElement(part), this.partName(part), layoutOptions.condensed);

      // if position would exceed x limit then wrap
      if (xp + td.x > mx) {
        xp = xs + kT.rowBarW;
        yp += kT.rowH;
        row = this.rowFactory(new Box2D(xs, yp - kT.rowBarH, 0, kT.rowBarH));
      }

      // update part, including its text and color
      this.nodeFromElement(part).set({
        bounds: new Box2D(xp, yp, td.x, kT.blockH),
        text: this.partName(part),
        fill: this.partMeta(part, 'color'),
      });

      if (this.isSBOL(part)) {
        this.nodeFromElement(part).set({
          sbolName: this.blocks[part].rules.sbol,
        });
      }

      // set next part position
      xp += td.x;
    });

    // ensure final row has the final row width
    if (row) {
      const rw = xp - xs;
      row.set({translateX: xs + rw / 2, width: rw});
    }

    // cleanup any dangling rows
    this.disposeRows();

    // create/show vertical bar
    this.verticalFactory();

    // position and size vertical bar
    const vh = (this.rows.length - 1) * kT.rowH + kT.blockH;
    this.vertical.set({
      bounds: new Box2D(xs, ys + kT.titleH + kT.rowBarH, kT.rowBarW, vh),
    });
    // filter the selections so that we eliminate those block we don't contain
    let selectedNodes = [];
    if (this.currentBlocks) {
      const containedBlockIds = this.currentBlocks.filter(blockId => {
        return !!this.nodeFromElement(blockId);
      });
      // get nodes for selected blocks
      selectedNodes = containedBlockIds.map(blockId => {
        return this.nodeFromElement(blockId);
      });
    }
    // apply selections to scene graph
    this.sceneGraph.ui.setSelections(selectedNodes);
  }
}
