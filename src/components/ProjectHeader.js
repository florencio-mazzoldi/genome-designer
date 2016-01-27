import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router';

import '../styles/ProjectHeader.css';

export default class ProjectHeader extends Component {
  static propTypes = {
    project: PropTypes.object.isRequired,
  };

  //because we dont need to persist this state, it can exist in the component
  state = {
    detailVisible: false,
  };

  handleToggleDetail = (event) => {
    this.setState({
      detailVisible: !this.state.detailVisible,
    });
  };

  render() {
    const { project } = this.props;

    return (
      <div className="ProjectHeader">
        <div className="ProjectHeader-info">
          <div className="ProjectHeader-breadcrumbs">
            <Link to={`/projects/`}
                  className="ProjectHeader-breadcrumb ProjectHeader-lead">Projects</Link>
            <span className="ProjectHeader-breadcrumb-separator">&#10095;</span>
            <Link to={`/project/${project.id}`}
                  className="ProjectHeader-breadcrumb ProjectHeader-title">{project.metadata.name}</Link>
          </div>
          <div className="ProjectHeader-description">{project.metadata.description}</div>
        </div>

        <div className="ProjectHeader-actions"></div>
      </div>
    );
  }
}
