import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import invariant from 'invariant';
import { inspectorToggleVisibility } from '../actions/ui';

import InspectorBlock from '../components/Inspector/InspectorBlock';
import InspectorProject from '../components/Inspector/InspectorProject';

import '../styles/Inspector.css';
import '../styles/SidePanel.css';

export class Inspector extends Component {
  static propTypes = {
    showingGrunt: PropTypes.bool,
    isVisible: PropTypes.bool.isRequired,
    readOnly: PropTypes.bool.isRequired,
    inspectorToggleVisibility: PropTypes.func.isRequired,
    blocks: PropTypes.array,
    project: PropTypes.object,
  };

  toggle = (forceVal) => {
    this.props.inspectorToggleVisibility(forceVal);
  };

  render() {
    const { showingGrunt, isVisible, blocks, project, readOnly } = this.props;

    // inspect instances, or construct if no instance or project if no construct or instances
    const inspect = blocks && blocks.length
      ? <InspectorBlock instances={blocks} readOnly={readOnly}/>
      : <InspectorProject instance={project} readOnly={readOnly}/>;

    return (
      <div className={'SidePanel Inspector no-vertical-scroll' +
      (isVisible ? ' visible' : '') +
      (readOnly ? ' readOnly' : '') +
      (showingGrunt ? ' gruntPushdown' : '')}>

        <div className="SidePanel-heading">
          <button tabIndex="-1" className="button-nostyle SidePanel-heading-trigger Inspector-trigger"
                  onClick={() => this.toggle()}/>
          <div className="SidePanel-heading-content">
            <span className="SidePanel-heading-title">Inspector</span>
            <button tabIndex="-1" className="button-nostyle SidePanel-heading-close"
                    onClick={() => this.toggle(false)}/>
          </div>
        </div>

        <div className="SidePanel-content">
          {inspect}
        </div>
      </div>
    );
  }
}

function mapStateToProps(state, props) {
  const { isVisible } = state.ui.inspector;
  const { forceBlocks, blockIds, forceProject, constructId } = state.focus;
  const { projectId } = props; //from routing

  //blocks
  let blocks = [];
  if (forceBlocks.length) {
    blocks = forceBlocks;
  } else if (blockIds && blockIds.length) {
    blocks = blockIds.map(blockId => state.blocks[blockId]);
  } else if (!!constructId) {
    blocks = [state.blocks[constructId]];
  }
  invariant(blocks.every(el => !!el), 'cannot pass empty instances to inspector');

  //project
  const project = forceProject || state.projects[projectId];

  //readonly
  const readOnly = blocks.length ?
  !!forceBlocks.length || blocks.some(instance => instance.isFrozen()) :
    !!forceProject;

  //UI adjustment
  const showingGrunt = !!state.ui.modals.gruntMessage;

  return {
    showingGrunt,
    isVisible,
    readOnly,
    blocks,
    project,
  };
}

export default connect(mapStateToProps, {
  inspectorToggleVisibility,
})(Inspector);
