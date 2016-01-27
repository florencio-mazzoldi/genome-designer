import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { pushState } from 'redux-router';
import ConstructViewer from './graphics/views/constructviewer';
import ProjectDetail from '../components/ProjectDetail';
import ProjectHeader from '../components/ProjectHeader';
import Inventory from './Inventory';
import Inspector from './Inspector';

import '../styles/ProjectPage.css';
import '../styles/SceneGraphPage.css';

class ProjectPage extends Component {
  static propTypes = {
    project: PropTypes.object.isRequired,
    projectId: PropTypes.string.isRequired,
    constructs: PropTypes.array.isRequired,
    pushState: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.layoutAlgorithm = 'wrap';
  }

  onLayoutChanged = () => {
    this.layoutAlgorithm = this.refs.layoutSelector.value;
    this.forceUpdate();
  };

  render() {
    const { project, constructs } = this.props;

    //todo - need error handling here. Should be in route transition probably?
    //right now there is some handling in GlobalNav when using ProjectSelect. Doesn't handle request of the URL.
    if (!project || !project.metadata) {
      this.props.pushState('/');
      return <p>todo - need to handle this (direct request)</p>;
    }

    const constructViewers = constructs.map(construct => {
      return (
        <ConstructViewer key={construct.id}
                         constructId={construct.id}
                         layoutAlgorithm={this.layoutAlgorithm}/>
      );
    });

    return (
      <div className="ProjectPage">
        <Inventory />

        <div className="ProjectPage-content">

          <ProjectHeader project={project}/>

          <div className="ProjectPage-constructs">
            {constructViewers}
          </div>

          <ProjectDetail project={project}/>
        </div>

        <Inspector />
      </div>
    );
  }
}

function mapStateToProps(state) {
  const { projectId, constructId } = state.router.params;
  const project = state.projects[projectId];

  if (!project) {
    return {};
  }

  const constructs = project.components.map(componentId => state.blocks[componentId]);

  return {
    projectId,
    constructId,
    project,
    constructs,
  };
}

export default connect(mapStateToProps, {
  pushState,
})(ProjectPage);

/* old wrap menu, leave for now.
<div
  style={{margin: '1rem 0 1rem 1rem',
  paddingRight: '1rem',
  textAlign: 'right',
  position: 'absolute',
  top: '0',
  right: '0'}}>
  <select ref="layoutSelector" onChange={this.onLayoutChanged}>
    <option value="wrap">Wrap</option>
    <option value="full">Full</option>
    <option value="fit">Fit</option>
  </select>
</div>
 */
