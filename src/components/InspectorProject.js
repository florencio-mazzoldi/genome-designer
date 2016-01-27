import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { projectRename, projectMerge } from '../actions/projects';
import InputSimple from './InputSimple';

//for now, assumes only blocks. Later, may need to pass a type as well

export class InspectorProject extends Component {
  static propTypes = {
    instance: PropTypes.object.isRequired,
    projectRename: PropTypes.func.isRequired,
    projectMerge: PropTypes.func.isRequired,
  };

  setProjectName = (name) => {
    this.props.projectRename(this.props.instance.id, name);
  };

  setProjectDescription = (description) => {
    if (description !== this.props.instance.metadata.description) {
      this.props.projectMerge(this.props.instance.id, {metadata: {description}});
    }
  };

  render() {
    const { instance } = this.props;

    return (
      <div className="InspectorContent InspectorContentProject">
        <h4 className="InspectorContent-heading">Name</h4>
        <InputSimple placeholder="Project Name"
                     onChange={this.setProjectName}
                     value={instance.metadata.name}/>

        <h4 className="InspectorContent-heading">Description</h4>
        <InputSimple placeholder="Project Description"
                     useTextarea
                     onChange={this.setProjectDescription}
                     updateOnBlur
                     value={instance.metadata.description}/>
      </div>
    );
  }
}

export default connect(() => ({}), {
  projectRename,
  projectMerge,
})(InspectorProject);
