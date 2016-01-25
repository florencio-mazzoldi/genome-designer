import UserInterface from '../scenegraph2d/userinterface';
import { sbol as sbolDragType } from '../../../constants/DragTypes';
import DnD from '../dnd/dnd';

// # of pixels of mouse movement before a drag is triggered.
const dragThreshold = 8;
// if within this threshold of a block edge the edge is selected versus
// the entire blocks
const edgeThreshold = 20;

/**
 * user interface overlay for construct viewer
 */
export default class ConstructViewerUserInterface extends UserInterface {
  constructor(sg) {
    super(sg);
    // register ourselves as a drop target
    DnD.registerTarget(this.el, {
      dragEnter: this.onDragEnter.bind(this),
      dragLeave: this.onDragLeave.bind(this),
      dragOver: this.onDragOver.bind(this),
      drop: this.onDrop.bind(this),
    });
  }

  /**
   * return the top most block at the given local ccordinates
   * @param  {Vector2D} point
   * @return {Part}
   */
  topNodeAt(point) {
    const hits = this.sg.findNodesAt(point);
    return hits.length ? hits.pop() : null;
  }
  /**
   * return the top most block at a given location
   * @param  {[type]} point [description]
   * @return {[type]}       [description]
   */
  topBlockAt(point) {
    const top = this.topNodeAt(point);
    return top ? this.layout.elementFromNode(top) : null;
  }
  /**
   * return the top most block at the given location and whether the point
   * is closer to the left or right edges
   * @param  {Vector2D} point [description]
   * @return {[type]}       [description]
   */
  topBlockAndVerticalEdgeAt(point) {
    const block = this.topBlockAt(point);
    if (block) {
      // get the AABB of the node representing the block
      const node = this.layout.nodeFromElement(block);
      const AABB = node.getAABB();
      return {
        block: block,
        edge: point.x < AABB.cx ? 'left' : 'right',
      };
    }
    // if no edit then return the right edge of the last block
    const count = this.construct.components.length;
    if (count) {
      return {
        block: this.construct.components[count - 1],
        edge: 'right',
      };
    }
    // construct is empty, we should an insertion point but for now we don't.
    return null;
  }
  /**
   * return the top most block at the given location and whether the point
   * is closer to the left or right edges ( if within a threshold, otherwise
   * just the block is returned )
   */
  topBlockAndOptionalVerticalEdgeAt(point) {
    const block = this.topBlockAt(point);
    if (block) {
      // get the AABB of the node representing the block
      const node = this.layout.nodeFromElement(block);
      const AABB = node.getAABB();
      let edge = null;
      if ((point.x - AABB.x) < edgeThreshold) {
        edge = 'left';
      }
      if ((point.x - AABB.x) > AABB.width - edgeThreshold) {
        edge = 'right';
      }
      return {block, edge}
    }
    // if no edit then return the right edge of the last block
    const count = this.construct.components.length;
    if (count) {
      return {
        block: this.construct.components[count - 1],
        edge: 'right',
      };
    }
    // construct is empty, we should an insertion point for the construct
    return null;
  }
  /**
   * accessor for the construct in our constructviewer owner
   */
  get construct() {
    return this.constructViewer.props.construct;
  }
  /**
   * mouse down handler
   */
  mouseUp(evt, point) {
    this.mouseSelect(evt, point);
  }
  /**
   * mouse section can occur by click or when a drag is started so it gets
   * its own method.
   */
  mouseSelect(evt, point) {
    evt.preventDefault();
    const block = this.topBlockAt(point);
    if (block) {
      // select the construct if not already the selected construct ( changing
      // the construct will remove blocks that are not part of the construct from the selections )
      if (this.constructViewer.props.construct.id !== this.constructViewer.props.ui.currentConstructId) {
        this.constructViewer.constructSelected(this.constructViewer.props.construct.id);
      }

      const node = this.layout.nodeFromElement(block);
      if (evt.shiftKey || window.__e2eShiftKey) {
        // range select
        this.constructViewer.blockAddToSelections([block]);
      } else
      if (evt.metaKey || evt.altKey){
        // toggle block in selections
        this.constructViewer.blockToggleSelected([block]);
      } else {
        // otherwise single select the block
        this.constructViewer.blockSelected([block]);
      }
    } else {
      // select construct if no block clicked and deselect all blocks
      this.constructViewer.blockSelected([]);
      this.constructViewer.constructSelected(this.constructViewer.props.constructId);
    }
  }

  /**
   * list of all selected blocks, based on our selected scenegraph blocks
   * @return {[type]} [description]
   */
  get selectedElements() {
    return this.selections.map((node) => {
      return this.layout.elementFromNode(node)
    });
  }

  /**
   * move drag handler, if the user initiates a drag of a block hand over
   * to the DND manager to handle
   */
  mouseDrag(evt, point, startPoint, distance) {
    if (distance > dragThreshold) {
      // start a block drag if we have one
      const block = this.topBlockAt(startPoint);
      if (block) {
        // cancel our own mouse operations for now
        this.mouseTrap.cancelDrag();
        // ensure the block being dragged is selected
        this.constructViewer.blockAddToSelections([block]);
        // get global point as starting point for drag
        const globalPoint = this.mouseTrap.mouseToGlobal(evt);
        // create proxy and drag
        const node = this.layout.nodeFromElement(block);
        // proxy representing 1 ore more blocks
        const proxy = this.makeDragProxy();
        // remove the blocks, unless meta key pressed
        const elements = this.selectedElements.slice(0);
        if (!evt.altKey) {
          elements.forEach(element => {
            this.constructViewer.removePart(element);
          });
        }
        // start the drag with the proxy and the removed block as the payload
        DnD.startDrag(proxy, globalPoint, {
          item: elements,
        });
      }
    }
  }
  /**
   * make a drag proxy by gathering all the selected blocks into a group ( up to
   * a limit )
   */
  makeDragProxy() {
    // create a div to hold the first five blocks at most
    const div = document.createElement('div');
    div.style.display = 'inline-block';
    div.style.position = 'relative';
    const nodes = this.selectedElements.map(e => this.layout.nodeFromElement(e));
    const limit = Math.min(5, nodes.length);
    let x = 0;
    let width = 0;
    let height = 0;
    for(var i = 0; i < limit; i += 1) {
      const node = nodes[i].el;
      const clone = node.cloneNode(true);
      clone.style.position = 'absolute';
      clone.style.left = `${x}px`;
      clone.style.top = `0px`;
      clone.style.transform = null;
      clone.style.opacity = (1 / limit) * (limit - i);
      div.appendChild(clone);
      width += node.clientWidth;
      height = Math.max(height, node.clientHeight);
      x += node.clientWidth;
    }
    div.style.width = `${width}px`;
    div.style.height = `${height}px`;
    return div;
  }

  /**
   * a drag entered the construct viewer
   */
  onDragEnter(globalPoint, payload) {
    this.hideEdgeInsertionPoint();
    this.hideBlockInsertionPoint();
  }
  /**
   * drag left the construct viewer
   */
  onDragLeave() {
    this.hideEdgeInsertionPoint();
    this.hideBlockInsertionPoint();
  }
  /**
   * drag over event
   */
  onDragOver(globalPosition, payload) {
    // convert global point to local space via our mousetrap
    const localPosition = this.mouseTrap.globalToLocal(globalPosition, this.el);
    // there is a different highlight / UX experience depending on what is being dragged
    const { item, type } = payload;
    if (type === sbolDragType) {
      // sbol symbol so we highlight the targeted block
      const hit = this.topBlockAndOptionalVerticalEdgeAt(localPosition);
      if (hit) {
        if (hit.edge) {
          this.showInsertionPointForEdge(hit.block, hit.edge);
        } else {
          this.showInsertionPointForBlock(hit.block);
        }
      } else {
        this.showDefaultInsertPoint();
      }

    } else {
      // block, so we highlight the insertion point
      const hit = this.topBlockAndVerticalEdgeAt(localPosition);
      if (hit) {
        this.showInsertionPointForEdge(hit.block, hit.edge);
      } else {
        this.showDefaultInsertPoint();
      }
    }
  }
  /**
   * user dropped the payload on us at the given position. Defer the insertion
   * to our actual constructViewer which has all the necessary props
   */
  onDrop(globalPosition, payload) {
    const blocks = this.constructViewer.addItemAtInsertionPoint(payload, this.insertion);
    this.constructViewer.blockSelected(blocks);
    this.constructViewer.constructSelected(this.constructViewer.props.constructId);
  }
  /**
   * show the insertion point at the top left of an empty construct.
   */
  showDefaultInsertPoint() {
    // insertion point may alternate so ensure we remove the block cursor
    this.hideBlockInsertionPoint();
    const point = this.layout.getInitialLayoutPoint();
    this.showInsertionPointForEdgeAt(point.x, point.y);
  }
  /**
   * show the insertion point at the given edge of the given block...usually
   * used when dropping a new block(s) into the construct
   */
  showInsertionPointForEdge(block, edge) {
    // insertion point may alternate so ensure we remove the block cursor
    this.hideBlockInsertionPoint();

    // get node representing this part and its AABB
    const node = this.layout.nodeFromElement(block);
    const AABB = node.getAABB();
    const xposition = edge === 'left' ? AABB.x : AABB.right;
    this.showInsertionPointForEdgeAt(xposition - 1, AABB.y + 1);

    // save the current insertion point
    this.insertion = {block, node, edge};
  }
  /**
   * create and show insertion point for edge at the given position
   */
  showInsertionPointForEdgeAt(x, y) {
    // create insertion point as necessary
    if (!this.insertionEdgeEl) {
      this.insertionEdgeEl = document.createElement('div');
      this.insertionEdgeEl.className = 'edge-insertion-point';
      this.el.appendChild(this.insertionEdgeEl);
    }
    this.insertionEdgeEl.style.left = x + 'px';
    this.insertionEdgeEl.style.top = y + 'px';
  }
 /**
  * show the insertion point over the given block, usually used when dropping
  * an SBOL symbol onto an existing block.
  */
  showInsertionPointForBlock(block, edge) {
    // insertion point may alternate so ensure we remove the block cursor
    this.hideEdgeInsertionPoint();
    // create insertion point as necessary
    if (!this.insertionBlockEl) {
      this.insertionBlockEl = document.createElement('div');
      this.insertionBlockEl.className = 'block-insertion-point';
      this.el.appendChild(this.insertionBlockEl);
    }
    // get node representing this part and its AABB
    const node = this.layout.nodeFromElement(block);
    const AABB = node.getAABB();
    // position insertion element at the appropriate edge
    this.insertionBlockEl.style.left = AABB.x + 'px';
    this.insertionBlockEl.style.top = AABB.y + 'px';
    this.insertionBlockEl.style.width = AABB.w + 'px';
    this.insertionBlockEl.style.height = AABB.h + 'px';

    // save the current insertion point
    this.insertion = {block, node};
  }
  /**
   * return the current insertion point if any
   * @return {[type]} [description]
   */
  getInsertionPoint() {
    return this.insertion;
  }
  /**
   * hide / deletion insertion point element
   */
  hideBlockInsertionPoint() {
    if (this.insertionBlockEl) {
      this.el.removeChild(this.insertionBlockEl);
      this.insertionBlockEl = null;
    }
    this.insertion = null;
  }
  hideEdgeInsertionPoint() {
    if (this.insertionEdgeEl) {
      this.el.removeChild(this.insertionEdgeEl);
      this.insertionEdgeEl = null;
    }
    this.insertion = null;
  }
}
