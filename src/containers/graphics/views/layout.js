import Box2D from '../geometry/box2d';
import Vector2D from '../geometry/vector2d';
import Line2D from '../geometry/line2d';
import Node2D from '../scenegraph2d/node2d';
import Role2D from '../scenegraph2d/role2d';
import ListItem2D from '../scenegraph2d/listitem2d';
import EmptyListItem2D from '../scenegraph2d/emptylistitem2d';
import LineNode2D from '../scenegraph2d/line2d';
import kT from './layoutconstants';
import objectValues from '../../../utils/object/values';
import invariant from 'invariant';

// just for internal tracking of what type of block a node represents.
const blockType = 'block';
const roleType = 'role';

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
      baseColor: 'white',
      showHeader: true,
      insetX: 0,
      insetY: 0,
      initialRowXLimit: -Infinity,
      rootLayout: true,
    }, options);

    // prep data structures for layout`
    this.rows = [];
    this.nodes2parts = {};
    this.parts2nodes = {};
    this.partUsage = {};
    this.nestedLayouts = {};
    this.connectors = {};
    this.listNodes = {};
    this.emptyMap = {};

    // this reference is incremented for each update. Blocks, lines are given
    // the latest reference whenever they are updated. Any elements without
    // the latest reference at the end of an update are no longer needed and
    // will be removed.
    this.updateReference = 0;
  }

  /**
   * size the scene graph to just accomodate all the nodes that are present.
   * This is only performed for the root layout ( nested constructs should not
   * perform this operation, as per the rootLayout property )
   * @return {[type]} [description]
   */
  autoSizeSceneGraph() {
    if (this.rootLayout) {
      // start with a box at 0,0, to ensure we capture the top left of the view
      // and ensure we at least use the available
      const aabb = this.getBlocksAABB();
      this.sceneGraph.width = Math.max(aabb.right, kT.minWidth);
      this.sceneGraph.height = Math.max(aabb.bottom, kT.minHeight) + kT.bottomPad;
      this.sceneGraph.updateSize();
    }
  }
  /**
   * return the AABB for our block nodes only, including any nested layouts
   */
  getBlocksAABB() {
    // always include top left and available width to anchor the bounds
    let aabb = new Box2D(0, 0, this.sceneGraph.availableWidth, 0);
    // we should only autosize the nodes representing parts
    objectValues(this.parts2nodes).forEach(node => {
      aabb = aabb.union(node.getAABB());
      // add in any part list items for this block
      const blockId = this.elementFromNode(node);
      objectValues(this.listNodes[blockId]).forEach(node => {
        aabb = aabb.union(node.getAABB());
      });
    });
    // add any nested constructs
    objectValues(this.nestedLayouts).forEach(layout => {
      aabb = layout.getBlocksAABB().union(aabb);
    });
    return aabb;
  }

  /**
   * setup the bi drectional mapping between nodes / elements
   */
  map(part, node) {
    this.nodes2parts[node.uuid] = part;
    this.parts2nodes[part] = node;
  }
  /**
   * flag the part as currently in use i.e. should be rendered.
   * Parts that are found to be no longer be in use are removed after rendering
   * along with associated nodes
   */
  usePart(part) {
    this.partUsage[part] = this.updateReference;
  }

  /**
   * drop any parts that don't match the current update reference
   * Also drop nodes associated with the part.
   */
  dropParts() {
    const keys = Object.keys(this.partUsage);
    keys.forEach(part => {
      if (this.partUsage[part] < this.updateReference) {
        const node = this.parts2nodes[part];
        if (node) {
          delete this.nodes2parts[node.uuid];
          delete this.parts2nodes[part];
          delete this.partUsage[part];
          node.parent.removeChild(node);
        }
        // drop any associated list items with the part.
        //this.dropPartListItems(part);
      }
    });
  }

  /**
   * create a list part for the block
   */
  listBlockFactory(blockId) {
    const block = this.blocks[blockId];
    const props = Object.assign({}, {
      dataAttribute: {name: 'nodetype', value: 'part'},
      sg: this.sceneGraph,
    }, kT.partAppearance);
    return new ListItem2D(props);
  }
  /**
   * create an empty list block
   */
  emptyListBlockFactory(blockId, parentNode) {
    let node = this.emptyMap[blockId];
    if (!node) {
      const props = Object.assign({}, {
        parent: parentNode,
        strokeWidth: 0,
        sg: this.sceneGraph,
      }, kT.partAppearance);
      node = this.emptyMap[blockId] = new EmptyListItem2D(props);
    }
    return node;
  }
  /**
   * drop nodes allocated with emptyListBlockFactory that are no longer needed
   * @return {[type]} [description]
   */
  dropEmptyBlocks() {
    Object.keys(this.emptyMap).forEach((parentBlockId) => {
      const node = this.emptyMap[parentBlockId];
      if (node.updateReference !== this.updateReference) {
        node.parent.removeChild(node);
        delete this.emptyMap[parentBlockId];
      }
    });
  }
  /**
   * create / update the list items for the block
   */
  updateListForBlock(block, pW) {
    // the node representing the parent block
    const parentNode = this.nodeFromElement(block.id);
    // get the focused list for this block, if any
    const focusedOptionId = this.focusedOptions[block.id];
    // get only the options that are enabled for this block
    const enabled = Object.keys(block.options).filter(opt => block.options[opt]);
    // if this is a template construct and the options are empty add a single empty options block
    if (enabled.length === 0 && this.construct.isTemplate()) {
        const node = this.emptyListBlockFactory(block.id, parentNode);
        node.set({
          bounds: new Box2D(0, kT.blockH + 1, pW, kT.optionH),
          fill: this.fillColor(block.id),
          updateReference: this.updateReference,
          listParentBlock: block,
          listParentNode: parentNode,
        });
    } else {
      // update all the list items
      enabled.forEach((blockId, index) => {
        // ensure we have a hash of list nodes for this block.
        let nodes = this.listNodes[block.id];
        if (!nodes) {
          nodes = this.listNodes[block.id] = {};
        }
        // get the block in the list
        const listBlock = this.getListBlock(blockId);

        // create node as necessary for this block
        let listNode = nodes[blockId];
        if (!listNode) {
          listNode = nodes[blockId] = this.listBlockFactory(blockId);
          parentNode.appendChild(listNode);
        }
        // update position and other visual attributes of list part
        listNode.set({
          bounds: new Box2D(0, kT.blockH + 1 + index * kT.optionH, pW, kT.optionH),
          text: listBlock.metadata.name,
          fill: this.fillColor(block.id),
          color: this.fontColor(block.id),
          updateReference: this.updateReference,
          listParentBlock: block,
          listParentNode: this.nodeFromElement(block.id),
          listBlock,
          optionSelected: focusedOptionId === blockId,
        });
      });
    }
  }

  /**
   * drop any list nodes that are not up tp date with the updateReference
   */
  dropListItems() {
    // outer loop will iterate over a hash of list node each block with list items
    Object.keys(this.listNodes).forEach(blockId => {
      const nodeHash = this.listNodes[blockId];
      Object.keys(nodeHash).forEach(key => {
        const node = nodeHash[key];
        if (node.updateReference !== this.updateReference) {
          node.parent.removeChild(node);
          delete nodeHash[key];
        }
      });
    });
  }

  /**
   * return the element from the data represented by the given node uuid.
   * This searches this construct and any nested construct to find the part
   */
  elementFromNode(node) {
    let part = this.nodes2parts[node.uuid];
    if (!part) {
      const nestedKeys = Object.keys(this.nestedLayouts);
      for (let i = 0; i < nestedKeys.length && !part; i += 1) {
        part = this.nestedLayouts[nestedKeys[i]].elementFromNode(node);
      }
    }
    return part;
  }
  /**
   * reverse mapping from anything with an 'uuid' property to a node
   * Looks into nested constructs as well.
   */
  nodeFromElement(element) {
    let node = this.parts2nodes[element];
    if (!node) {
      const nestedKeys = Object.keys(this.nestedLayouts);
      for (let i = 0; i < nestedKeys.length && !node; i += 1) {
        node = this.nestedLayouts[nestedKeys[i]].nodeFromElement(element);
      }
    }
    return node;
  }
  /**
   * return an array of {block, node} objects for this layout
   * and all nested layouts.
   */
  allNodesAndBlocks() {
    let list = Object.keys(this.parts2nodes).map(block => {
      return {block, node: this.parts2nodes[block]};
    });
    Object.keys(this.nestedLayouts).forEach(key => {
      list = list.concat(this.nestedLayouts[key].allNodesAndBlocks());
    });
    return list;
  }

  /**
   * create a node, if not already created for the given piece.
   * Add to our hash for tracking
   * @param  {[type]} part          [description]
   * @param  {[type]} appearance [description]
   * @return {[type]}            [description]
   */
  partFactory(part, appearance) {
    let node = this.nodeFromElement(part);
    if (!node) {
      const props = Object.assign({}, {
        dataAttribute: {name: 'nodetype', value: 'block'},
        sg: this.sceneGraph,
      }, appearance);
      props.roleName = this.isSBOL(part) ? this.blocks[part].rules.role : null;
      node = new Role2D(props);
      this.sceneGraph.root.appendChild(node);
      this.map(part, node);
    }
    // hide/or child expand/collapse glyph
    node.set({
      hasChildren: this.hasChildren(part),
    });
    // mark part as in use
    this.usePart(part);
  }
  /**
   * return one of the meta data properties for a part.
   */
  partMeta(part, meta) {
    return this.blocks[part].metadata[meta];
  }

  /**
   * used specified color, or filler color for filler block or light gray
   */
  fillColor(part) {
    const block = this.blocks[part];
    if (block.isFiller()) return '#4B505E';
    return block.metadata.color || 'lightgray';
  }
  /**
   * filler blocks get a special color
   */
  fontColor(part) {
    const block = this.blocks[part];
    if (block.isFiller()) return '#6B6F7C';
    return '#1d222d';
  }

  /**
   * return the property within the rule part of the blocks data
   */
  partRule(part, name) {
    return this.blocks[part].rules[name];
  }

  /**
   * return true if the block appears to be an SBOL symbol
   */
  isSBOL(part) {
    return !!this.blocks[part].rules.role;
  }

  /**
   * return true if the given block has children
   */
  hasChildren(blockId) {
    const block = this.blocks[blockId];
    invariant(block, 'expect to be able to find the block');
    return block.components && block.components.length;
  }

  /**
   * return the first child of the given block or null if it has no children
   */
  firstChild(blockId) {
    const block = this.blocks[blockId];
    invariant(block, 'expect to be able to find the block');
    return block.components && block.components.length ? block.components[0] : null;
  }

  /**
   * return the two nodes that we need to graphically connect to show a connection.
   * The given block is the source block
   */
  connectionInfo(sourceBlockId) {
    const destinationBlockId = this.firstChild(sourceBlockId);
    invariant(destinationBlockId, 'expected a child if this method is called');
    return {
      sourceBlock: this.blocks[sourceBlockId],
      destinationBlock: this.blocks[destinationBlockId],
      sourceNode: this.nodeFromElement(sourceBlockId),
      destinationNode: this.nodeFromElement(destinationBlockId),
    };
  }

  /**
   * return the part ID or if metadata is available use the name property if available.
   * If the part is an SBOL symbol then use the symbol name preferentially
   */
  partName(part) {
    return this.blocks[part].getName();
  }
  /**
   * create the banner / bar for the construct ( contains the triangle )
   * @return {[type]} [description]
   */
  bannerFactory() {
    if (this.showHeader && !this.banner) {
      this.banner = new Node2D({
        sg: this.sceneGraph,
        glyph: 'construct-banner',
        bounds: new Box2D(this.insetX, this.insetY, this.sceneGraph.availableWidth - this.insetX, kT.bannerHeight),
      });
      this.sceneGraph.root.appendChild(this.banner);
    }
    if (this.banner) {
      this.banner.set({
        fill: this.baseColor,
        stroke: this.baseColor,
      });
    }
  }
  /**
   * create title as necessary
   * @param  {[type]} part [description]
   * @return {[type]}   [description]
   */
  titleFactory() {
    if (this.showHeader) {
      if (!this.titleNode) {
        // node that carries the text
        this.titleNode = new Node2D(Object.assign({
          dataAttribute: {name: 'nodetype', value: 'construct-title'},
          sg: this.sceneGraph,
        }, kT.titleAppearance));
        // add the context menu dots
        this.titleNodeDots = new Node2D({
          sg: this.sceneGraph,
          glyph: 'dots',
        });
        this.titleNode.appendChild(this.titleNodeDots);
        this.sceneGraph.root.appendChild(this.titleNode);
      }

      // update title to current position and text and width, also add gray text
      // to indicate template if appropriate
      let text = this.construct.getName('New Construct');
      if (this.construct.isTemplate()) {
        text += '<span style="color:gray">&nbsp;Template</span>';
      }
      const width = this.titleNode.measureText(text).x + kT.textPad + kT.contextDotsW;

      this.titleNode.set({
        text: text,
        color: this.baseColor,
        bounds: new Box2D(this.insetX, this.insetY + kT.bannerHeight, width, kT.titleH),
      });

      // set dots to the right of the text
      this.titleNodeDots.set({
        bounds: new Box2D(width - kT.contextDotsW, (kT.titleH - kT.contextDotsH) / 2, kT.contextDotsW, kT.contextDotsH),
        visible: this.titleNode.hover,
        dotColor: this.baseColor,
      });
    }
  }
  /**
   * create the vertical bar as necessary and update its color
   */
  verticalFactory() {
    if (!this.vertical) {
      this.vertical = new Node2D(Object.assign({
        sg: this.sceneGraph,
      }, kT.verticalAppearance));
      this.sceneGraph.root.appendChild(this.vertical);
    }
    this.vertical.set({
      fill: this.baseColor,
    });
  }
  /**
   * create or recycle a row on demand.
   */
  rowFactory(bounds) {
    // re-use existing if possible
    let row = this.rows.find(row => row.updateReference !== this.updateReference);
    if (!row) {
      row = new Node2D(Object.assign({
        sg: this.sceneGraph,
        strokeWidth: 0,
      }, kT.rowAppearance));
      this.sceneGraph.root.appendChild(row);
      this.rows.push(row);
    }
    // set bounds and update to current color
    row.set({
      bounds: bounds,
      fill: this.baseColor,
      strokeWidth: 0,
      updateReference: this.updateReference,
    });
    return row;
  }

  /**
   * a map of the extant layout objects, so we can dispose unused ones after layout
   */
  resetNestedConstructs() {
    this.newNestedLayouts = {};
  }
  /**
   * dispose and unused rows
   */
  disposeRows() {
    // keep rows still in use, remove the others
    const keepers = [];
    this.rows.forEach(row => {
      if (row.updateReference === this.updateReference) {
        keepers.push(row);
      } else {
        this.sceneGraph.root.removeChild(row);
      }
    });
    this.rows = keepers;
  }

  /**
   * dispose any nested constructs no longer referenced.
   */
  disposeNestedLayouts() {
    Object.keys(this.nestedLayouts).forEach(key => {
      this.nestedLayouts[key].dispose();
    });
    this.nestedLayouts = this.newNestedLayouts;
  }
  /**
   * store layout information on our cloned copy of the data, constructing
   * display elements as required
   * @return {[type]} [description]
   */
  update(options) {
    this.options = options;
    this.construct = options.construct;
    this.blocks = options.blocks;
    this.currentConstructId = options.currentConstructId;
    this.currentBlocks = options.currentBlocks;
    this.focusedOptions = options.focusedOptions || {};
    invariant(this.construct && this.blocks && this.currentBlocks && this.focusedOptions, 'missing required options');

    this.baseColor = this.construct.metadata.color;

    // perform layout and remember how much vertical was required
    const heightUsed = this.layoutWrap();

    // update connections etc after layout
    this.postLayout();

    // auto size scene after layout
    this.autoSizeSceneGraph();

    // nest layouts need to the vertical space required
    return heightUsed;
  }

  /**
   * one of several different layout algorithms
   * @return {[type]} [description]
   */
  layoutWrap() {
    return this.layout({
      xlimit: this.sceneGraph.availableWidth - this.insetX - kT.rightPad,
      condensed: false,
    });
  }
  /**
   */

  measureText(node, str) {
    return node.getPreferredSize(str);
  }
  /**
   * return the point where layout of actual blocks begins
   * @return {[type]} [description]
   */
  getInitialLayoutPoint() {
    return new Vector2D(this.insetX + kT.rowBarW, this.insetY + (this.showHeader ? kT.bannerHeight + kT.titleH + kT.rowBarH : kT.rowBarH));
  }

  /**
   * get list block from ether
   */
  getListBlock(id) {
    const item = this.blocks[id];
    invariant(item, 'list item not found');
    return item;
  }
  /**
   * layout, configured with various options:
   * xlimit: maximum x extent
   * @return {[type]} [description]
   */
  layout(layoutOptions) {
    // set the new reference key
    this.updateReference += 1;
    // shortcut
    const ct = this.construct;
    // construct the banner if required
    this.bannerFactory();
    // create and update title
    this.titleFactory();
    // maximum x position
    const mx = layoutOptions.xlimit;
    // reset nested constructs
    this.resetNestedConstructs();
    // layout all the various components, constructing elements as required
    // and wrapping when a row is complete
    const initialPoint = this.getInitialLayoutPoint();
    const startX = initialPoint.x;
    let xp = startX;
    const startY = initialPoint.y;
    let yp = startY;

    // used to determine when we need a new row
    let row = null;

    // additional vertical space consumed on every row for nested constructs
    let nestedVertical = 0;

    // additional height required by the tallest list on the row
    let maxListHeight = 0;

    // width of first row is effected by parent block, so we have to track
    // which row we are on.
    let rowIndex = 0;
    // display only non hidden blocks
    const components = ct.components.filter(part => !this.blocks[part].isHidden());
    // layout all non hidden blocks
    components.forEach(part => {

      // create a row bar as neccessary
      if (!row) {
        row = this.rowFactory(new Box2D(this.insetX, yp - kT.rowBarH, 0, kT.rowBarH));
      }
      // resize row bar to current row width
      const rowStart = this.insetX;
      const rowEnd = rowIndex === 0 ? Math.max(xp, this.initialRowXLimit) : xp;
      const rowWidth = rowEnd - rowStart;
      row.set({translateX: rowStart + rowWidth / 2, width: rowWidth});

      // create the node representing the part
      this.partFactory(part, kT.partAppearance);

      // get the node representing this part and the actual block from the part id.
      const node = this.nodeFromElement(part);
      const block = this.blocks[part];
      const name = this.partName(part);
      const listN = Object.keys(block.options).filter(opt => block.options[opt]).length;

      // set role part name if any
      node.set({
        roleName: this.isSBOL(part) ? block.rules.role : null,
      });

      // measure element text or used condensed spacing
      let td = this.measureText(node, name);

      // measure the max required width of all list blocks
      Object.keys(block.options).filter(opt => block.options[opt]).forEach(blockId => {
        let width = this.measureText(node, this.getListBlock(blockId).metadata.name).x;
        width += kT.optionDotW;
        td.x = Math.max(td.x, width);
      });

      // if position would exceed x limit then wrap
      if (xp + td.x > mx) {
        xp = startX;
        yp += kT.rowH + nestedVertical + maxListHeight;
        nestedVertical = 0;
        maxListHeight = 0;
        row = this.rowFactory(new Box2D(xp, yp - kT.rowBarH, 0, kT.rowBarH));
        rowIndex += 1;
      }

      // update maxListHeight based on how many list items this block has
      maxListHeight = Math.max(maxListHeight, listN * kT.blockH);
      invariant(isFinite(maxListHeight) && maxListHeight >= 0, 'expected a valid number');

      // update part, including its text and color and with height to accomodate list items
      node.set({
        bounds: new Box2D(xp, yp, td.x, kT.blockH),
        text: name,
        fill: this.fillColor(part),
        color: this.fontColor(part),
      });

      // update any list parts for this blocks
      this.updateListForBlock(block, td.x);

      // render children ( nested constructs )
      if (this.hasChildren(part) && node.showChildren) {
        // establish the position
        const nestedX = this.insetX + kT.nestedInsetX;
        const nestedY = yp + nestedVertical + kT.blockH + kT.nestedInsetY;
        // get or create the layout object for this nested construct
        let nestedLayout = this.nestedLayouts[part];
        if (!nestedLayout) {
          nestedLayout = this.nestedLayouts[part] = new Layout(this.constructViewer, this.sceneGraph, {
            showHeader: false,
            insetX: nestedX,
            insetY: nestedY,
            rootLayout: false,
          });
        }

        // update base color of nested construct skeleton
        nestedLayout.baseColor = block.metadata.color || this.baseColor;

        // update minimum x extent of first rowH
        nestedLayout.initialRowXLimit = this.getConnectionRowLimit(part);

        // ensure layout has the latest position ( parent may have moved )
        nestedLayout.insetX = nestedX;
        nestedLayout.insetY = nestedY;

        // layout with same options as ourselves
        nestedVertical += nestedLayout.update({
          construct: this.blocks[part],
          blocks: this.blocks,
          currentBlocks: this.currentBlocks,
          currentConstructId: this.currentConstructId}) + kT.nestedInsetY;

        // remove from old collection so the layout won't get disposed
        // and add to the new set of layouts
        this.newNestedLayouts[part] = nestedLayout;
        delete this.nestedLayouts[part];
      }
      // set next part position
      xp += td.x;
    });

    // ensure final row has the final row width
    if (row) {
      const rowStart = this.insetX;
      const rowEnd = rowIndex === 0 ? Math.max(xp, this.initialRowXLimit) : xp;
      const rowWidth = rowEnd - rowStart;
      row.set({translateX: rowStart + rowWidth / 2, width: rowWidth});
    }

    // cleanup any dangling rows
    this.disposeRows();

    // cleanup and dangling nested constructs
    this.disposeNestedLayouts();

    // drop unused parts and nodes
    this.dropParts();

    // drop unused list items
    this.dropListItems();

    // drop unused empty block placeholders
    this.dropEmptyBlocks();

    // create/show vertical bar
    this.verticalFactory();

    // position and size vertical bar
    const heightUsed = yp - startY + kT.blockH;
    this.vertical.set({
      bounds: new Box2D(this.insetX, startY, kT.rowBarW, heightUsed),
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
    if (this.sceneGraph.ui) {
      this.sceneGraph.ui.setSelections(selectedNodes);
    }

    // for nesting return the height consumed by the layout
    return heightUsed + nestedVertical + kT.rowBarH;
  }

  /**
   * update connections after the layout
   */
  postLayout() {
    // update / make all the parts
    this.construct.components.forEach(part => {
      // render children ( nested constructs )
      if (this.hasChildren(part) && this.nodeFromElement(part).showChildren) {
        // update / create connection
        this.updateConnection(part);
      }
    });
    // dispose dangling connections
    this.disposeConnections();
  }

  // the connector drops from the center of the source part, so the initial
  // row limit for the child is the right edge of this point
  getConnectionRowLimit(sourcePart) {
    const cnodes = this.connectionInfo(sourcePart);
    const sourceRectangle = cnodes.sourceNode.getAABB();
    return sourceRectangle.center.x + kT.rowBarW / 2;
  }
  /**
   * update / create the connection between the part which must be the
   * parent of a nested construct.
   */
  updateConnection(part) {
    const cnodes = this.connectionInfo(part);
    // the source and destination node id's are used to as the cache key for the connectors
    const key = `${cnodes.sourceBlock.id}-${cnodes.destinationBlock.id}`;
    // get or create connection line
    let connector = this.connectors[key];
    if (!connector) {
      const line = new LineNode2D({
        line: new Line2D(new Vector2D(), new Vector2D()),
        strokeWidth: kT.rowBarW,
        sg: this.sceneGraph,
        parent: this.sceneGraph.root,
        dataAttribute: {name: 'connection', value: cnodes.sourceBlock.id},
      });
      connector = {line};
      this.connectors[key] = connector;
    }
    // update connector position
    const sourceRectangle = cnodes.sourceNode.getAABB();
    const destinationRectangle = cnodes.destinationNode.getAABB();
    connector.line.set({
      stroke: this.partMeta(cnodes.sourceBlock.id, 'color'),
      line: new Line2D(sourceRectangle.center, new Vector2D(sourceRectangle.center.x, destinationRectangle.y)),
    });
    // ensure the connectors are always behind the blocks
    connector.line.sendToBack();

    // update its reference
    connector.updateReference = this.updateReference;
  }

  /**
   * remove any connections that are no longer in use
   */
  disposeConnections() {
    Object.keys(this.connectors).forEach(key => {
      const connector = this.connectors[key];
      if (connector.updateReference !== this.updateReference) {
        this.removeNode(connector.line);
        delete this.connectors[key];
      }
    });
  }

  /**
   * remove any nodes we have created from the scenegraph. Recursively remove
   * the nodes of nested constructs as well
   */
  dispose() {
    invariant(!this.disposed, 'Layout already disposed');
    this.disposed = true;
    this.removeNode(this.banner);
    this.removeNode(this.titleNode);
    this.removeNode(this.vertical);
    this.rows.forEach( node => {
      this.removeNode(node);
    });
    Object.keys(this.parts2nodes).forEach(part => {
      this.removeNode(this.parts2nodes[part]);
    });
    Object.keys(this.connectors).forEach(key => {
      this.removeNode(this.connectors[key].line);
    });
    this.disposeNestedLayouts();
  }

  /**
   * remove a node
   */
  removeNode(node) {
    if (node && node.parent) {
      node.parent.removeChild(node);
    }
  }

}
