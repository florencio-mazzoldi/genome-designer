import React, { Component, PropTypes } from 'react';

export default class Row extends Component {

  static propTypes = {
    text: PropTypes.string.isRequired,
  };

  constructor() {
    super();
    this.state = {
    };
  }

  render() {
    return (
      <div className="row">
        <div className="row-left">{this.props.text}</div>
        <div className="row-right">{this.props.children}</div>
      </div>
    )
  }
}
