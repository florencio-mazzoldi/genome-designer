import React, { PropTypes, Component } from 'react';
import autosaveInstance from '../../store/autosave/autosaveInstance';
import { getProjectSaveState } from '../../store/saveState';

import '../../styles/AutosaveTracking.css';

export default class autosaveTracking extends Component {
  static propTypes = {
    projectId: PropTypes.string.isRequired,
  };

  componentDidMount() {
    this.interval = setInterval(() => {
      this.forceUpdate();
    }, 500);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    const { projectId } = this.props;
    const saveState = getProjectSaveState(projectId);
    const { saveDelta, saveSuccessful } = saveState;
    const timeUnsaved = autosaveInstance.getTimeUnsaved();
    const dirty = autosaveInstance.isDirty();

    let text;
    const classNames = ['AutosaveTracking'];
    if (!saveSuccessful) {
      classNames.push('failure');
      text = 'Save Failed!';
    } else if (dirty || saveDelta > 15000) {
      text = '';
    } else if (saveDelta <= 500) {
      //we're not actually saving... we're just faking it...
      text = 'Saving...';
    } else {
      text = 'Project Saved';
    }

    return (<span className={classNames.join(' ')}>{text}</span>);
  }
}
