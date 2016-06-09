import React, { Component, PropTypes } from 'react';

export default class NavLeftRight extends Component {
  static propTypes = {
    left: PropTypes.bool.isRequired,
    text: PropTypes.string.isRequired,
    visible: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired,
  };

  render() {
    if (!this.props.visible) {
      return (<div className="nav-left-right disabled"/>);
    }

    return (
      <div className="nav-left-right" onClick={this.props.onClick}>
        {this.props.left ? <div className="angle left"/> : null}
        <div className="text">{this.props.text}</div>
        {!this.props.left ? <div className="angle right"/> : null}
      </div>
    );
  }
}
