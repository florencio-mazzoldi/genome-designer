import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { inspectorToggleVisibility } from '../actions/inspector';

import InspectorBlock from '../components/InspectorBlock';
import InspectorProject from '../components/InspectorProject';

import '../styles/Inspector.css';
import '../styles/SidePanel.css';

export class Inspector extends Component {
  static propTypes = {
    isVisible: PropTypes.bool.isRequired,
    inspectorToggleVisibility: PropTypes.func.isRequired,
    currentBlocks: PropTypes.array,
    project: PropTypes.object,
    block: PropTypes.object,
  };

  toggle = (forceVal) => {
    this.props.inspectorToggleVisibility(forceVal);
    window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  };

  render() {
    const { isVisible, block, project } = this.props;

    return (
      <div className={'SidePanel Inspector' + (isVisible ? ' visible' : '')}>

        <div className="SidePanel-heading">
          <span className="SidePanel-heading-trigger Inspector-trigger"
                onClick={() => this.toggle()}/>
          <div className="SidePanel-heading-content">
            <span className="SidePanel-heading-title">Inspector</span>
            <a ref="close"
               className="SidePanel-heading-close"
               onClick={() => this.toggle(false)}/>
          </div>
        </div>

        <div className="SidePanel-content">
          {block ?
            (<InspectorBlock instance={block}/>) :
            (<InspectorProject instance={project}/>) }
        </div>
      </div>
    );
  }
}

function mapStateToProps(state, props) {
  const { isVisible } = state.inspector;
  const { currentBlocks, currentConstructId } = state.ui;
  const block = currentBlocks && currentBlocks.length ? state.blocks[currentBlocks[0]] : state.blocks[currentConstructId];

  const { projectId } = state.router.params;
  const project = state.projects[projectId];

  return {
    isVisible,
    currentBlocks,
    ui: state.ui,
    block,
    project,
  };
}

export default connect(mapStateToProps, {
  inspectorToggleVisibility,
})(Inspector);
