import React, { Component, PropTypes } from 'react';
import SceneGraph2D from '../scenegraph2d/scenegraph2d';
import Vector2D from '../geometry/vector2d';
import Layout from './layout.js';
import {connect } from 'react-redux';
import {
  blockCreate,
  blockAddComponent,
  blockClone,
  blockSetSbol,
  blockRename,
  blockRemoveComponent,
} from '../../../actions/blocks';
import { sbol as sbolDragType } from '../../../constants/DragTypes';
import debounce from 'lodash.debounce';
import { nodeIndex } from '../utils';
import ConstructViewerMenu from './constructviewermenu';
import UserInterface from './constructvieweruserinterface';
import { inspectorToggleVisibility } from '../../../actions/inspector';
import {
   uiToggleCurrent,
   uiSetCurrent,
   uiAddCurrent,
   uiSetCurrentConstruct,
  } from '../../../actions/ui';

export class ConstructViewer extends Component {

  static propTypes = {
    projectId: PropTypes.string.isRequired,
    construct: PropTypes.object.isRequired,
    constructId: PropTypes.string.isRequired,
    layoutAlgorithm: PropTypes.string.isRequired,
    uiAddCurrent: PropTypes.func.isRequired,
    uiSetCurrent: PropTypes.func.isRequired,
    uiSetCurrentConstruct: PropTypes.func.isRequired,
    uiToggleCurrent: PropTypes.func.isRequired,
    inspectorToggleVisibility: PropTypes.func.isRequired,
    currentBlock: PropTypes.array,
    blockSetSbol: PropTypes.func,
    blockClone: PropTypes.func,
    blockAddComponent: PropTypes.func,
    blockRemoveComponent: PropTypes.func,
    blocks: PropTypes.object,
  };

  constructor(props) {
    super(props);
  }

  /**
   * setup the scene graph and layout component.
   */
  componentDidMount() {
    // select a base color based on our index in the parent
    const nindex = nodeIndex(this.dom);
    const baseColors = ['rgb(225, 163, 116)', 'rgb(199, 109, 107)', 'rgb(83, 155, 163)'];

    // create the scene graph we are going to use to display the construct
    this.sg = new SceneGraph2D({
      width: this.dom.clientWidth,
      height: this.dom.clientHeight,
      availableWidth: this.dom.clientWidth,
      availableHeight: this.dom.clientHeight,
      parent: this.sceneGraphEl,
      userInterfaceConstructor: UserInterface,
    });
    // create the layout object
    this.layout = new Layout(this, this.sg, {
      layoutAlgorithm: this.props.layoutAlgorithm,
      baseColor: baseColors[nindex % baseColors.length],
    });
    // the user interface will also need access to the layout component
    this.sg.ui.layout = this.layout;
    // getting more ugly, the UI needs access to ourselves, the constructviewer
    this.sg.ui.constructViewer = this;
    // initial render won't call componentDidUpdate so force an update to the layout/scenegraph
    this.update();
    // handle window resize to reflow the layout
    window.addEventListener('resize', debounce(this.windowResized.bind(this), 15));
  }

  /**
   * add the given item using an insertion point from the constructviewer user interface.
   * Insertion point may be null, in which the block is added at the end
   */
  addItemAtInsertionPoint(payload, insertionPoint) {
    const { item, type } = payload;
    if (type === sbolDragType) {
      // must have an insertion point for sbol
      if (insertionPoint) {
        // blocks with an sbol symbol can be dropped on an edge and get inserted
        // as a new block or can simply update the sbol symbol for the block at the drop site.
        if (insertionPoint.edge) {
          // insert new block
          const block = this.props.blockCreate({rules: {sbol: item.id,}});
          // get index of insertion allowing for the edge closest to the drop if provided
          const index = this.props.construct.components.indexOf(insertionPoint.block) + (insertionPoint.edge === 'right' ? 1 : 0);
          // add
          this.props.blockAddComponent(this.props.construct.id, block.id, index);
          // return the newly created block or the block dropped on
          return [block.id];
        } else {
          // drop on existing block
          this.props.blockSetSbol(insertionPoint.block, item.id);
          return [insertionPoint.block];
        }
      }
    } else {
      // get index of insertion allowing for the edge closest to the drop
      let index = this.props.construct.components.length;
      if (insertionPoint) {
        index = this.props.construct.components.indexOf(insertionPoint.block) + (insertionPoint.edge === 'right' ? 1 : 0);
      }
      // add all blocks in the payload
      const blocks = Array.isArray(payload.item) ? payload.item : [payload.item];
      const clones = [];
      blocks.forEach(block => {
        const clone = this.props.blockClone(block);
        this.props.blockAddComponent(this.props.construct.id, clone.id, index++);
        clones.push(clone.id);
      });
      // return all the newly inserted blocks
      return clones;
    }
  }

  /**
   * remove the given block, which we assume if part of our construct
   */
  removePart(partId) {
    const node = this.layout.removePart(partId);
    this.props.blockRemoveComponent(this.props.construct.id, partId);
    return node;
  }

  /**
   * rename one of our blocks
   * @param  {[type]} blockId [description]
   * @param  {[type]} newName [description]
   * @return {[type]}         [description]
   */
  blockRename(blockId, newName) {

  }

  /**
   * select the given block
   */
  constructSelected(id) {
    this.props.uiSetCurrentConstruct(id, this.props.blocks);
    this.props.inspectorToggleVisibility(true);
  }

  /**
   * select the given block
   */
  blockSelected(partIds) {
    this.props.uiSetCurrent(partIds);
    this.props.inspectorToggleVisibility(true);
  }

  /**
   * select the given block
   */
  blockToggleSelected(partIds) {
    this.props.uiToggleCurrent(partIds);
    this.props.inspectorToggleVisibility(true);
  }

  /**
   * add the given part by ID to the selections
   */
  blockAddToSelections(partIds) {
    this.props.uiAddCurrent(partIds);
    this.props.inspectorToggleVisibility(true);
  }

  /**
   * window resize, update layout and scene graph with new dimensions
   * @return {[type]} [description]
   */
  windowResized() {
    this.sg.availableWidth = this.dom.clientWidth;
    this.sg.availableHeight = this.dom.clientHeight;
    this.forceUpdate();
  }

  /**
   * accessor for our DOM node.
   * @return {[type]} [description]
   */
  get dom() {
    return React.findDOMNode(this);
  }
  /**
   * accessor that fetches the actual scene graph element within our DOM
   * @return {[type]} [description]
   */
  get sceneGraphEl() {
    return this.dom.querySelector('.sceneGraph');
  }

  /**
   * update scene graph after the react component updates
   */
  componentDidUpdate() {
    this.update();
  }

  /**
   * update the layout and then the scene graph
   */
  update() {
    this.layout.update(this.props.construct, this.props.layoutAlgorithm, this.props.blocks, this.props.ui.currentBlocks, this.props.ui.currentConstructId);
    this.sg.update();
    this.sg.ui.update();
  }

  /**
   * render the component, the scene graph will render later when componentDidUpdate is called
   */
  render() {

    const rendered = (
      <div className="construct-viewer" key={this.props.construct.id}>
        <ConstructViewerMenu constructId={this.props.constructId} layoutAlgorithm={this.props.layoutAlgorithm}/>
        <div className="sceneGraphContainer">
          <div className="sceneGraph"/>
        </div>
      </div>
    );
    return rendered;
  }
}

function mapStateToProps(state, props) {
  const { projectId } = state.router.params;
  return {
    projectId,
    ui: state.ui,
    construct: state.blocks[props.constructId],
    blocks: state.blocks,
  };
}

export default connect(mapStateToProps, {
  blockCreate,
  blockClone,
  blockAddComponent,
  blockRemoveComponent,
  blockSetSbol,
  blockRename,
  uiAddCurrent,
  uiSetCurrent,
  uiSetCurrentConstruct,
  uiToggleCurrent,
  inspectorToggleVisibility,
})(ConstructViewer);
