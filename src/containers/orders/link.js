import React, { Component, PropTypes } from 'react';

export default class Link extends Component {

  static propTypes = {
    href: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  };

  render() {
    return (
      <a target="_blank" className="blue-link" href={this.props.href}>{this.props.text}</a>
    )
  }
}
