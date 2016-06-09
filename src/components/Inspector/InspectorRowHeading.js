import React, { Component, PropTypes } from 'react';
import Toggler from '../ui/Toggler';

//todo - update classes
//todo - handle state internally for toggle open / closed

export default class InspectorRowHeading extends Component {
  static propTypes = {
    text: PropTypes.string.isRequired,
    hasToggle: PropTypes.bool,
    forceActive: PropTypes.bool,
    onToggle: PropTypes.func,
  };

  static defaultProps = {
    onToggle: () => {},
  };

  state = {
    active: false,
  };

  handleToggle = () => {
    this.setState({ active: !this.state.active });
    this.props.onToggle(this.state.active);
  };

  getActiveState = () => {
    const { forceActive } = this.props;
    return (forceActive === true || forceActive === false) ? forceActive : this.state.active;
  };

  render() {
    const { text, hasToggle } = this.props;

    if (!hasToggle) {
      return (<h4 className="InspectorContent-heading">{text}</h4>);
    }

    const isActive = this.getActiveState();

    return (
      <h4 className={'InspectorContent-heading toggler' + (isActive ? ' active' : '')}
          onClick={() => this.handleToggle()}>
        <Toggler open={isActive}/>
        <span>{text}</span>
      </h4>
    );
  }
};
