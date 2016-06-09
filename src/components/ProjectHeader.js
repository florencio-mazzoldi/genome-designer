import React, { Component, PropTypes } from 'react';
import {connect } from 'react-redux';
import { inspectorToggleVisibility } from '../actions/ui';
import { focusPrioritize } from '../actions/focus';

import '../styles/ProjectHeader.css';

class ProjectHeader extends Component {
  static propTypes = {
    project: PropTypes.object.isRequired,
    isFocused: PropTypes.bool.isRequired,
    inspectorToggleVisibility: PropTypes.func.isRequired,
    focusPrioritize: PropTypes.func.isRequired,
  };

  onClick = () => {
    this.props.inspectorToggleVisibility(true);
    this.props.focusPrioritize('project');
  };

  render() {
    const { project, isFocused } = this.props;

    return (
      <div className={'ProjectHeader' + (isFocused ? ' focused' : '')}
           onClick={this.onClick}>
        <div className="ProjectHeader-info">
          <div className="ProjectHeader-title">{project.metadata.name || 'Untitled Project'}</div>
          <div className="ProjectHeader-description">{project.metadata.description}</div>
        </div>

        <div className="ProjectHeader-actions"></div>
      </div>
    );
  }
}

function mapStateToProps(state, props) {
  return {
    isFocused: state.focus.level === 'project' && !state.focus.forceProject,
  };
}

export default connect(mapStateToProps, {
  inspectorToggleVisibility,
  focusPrioritize,
})(ProjectHeader);
