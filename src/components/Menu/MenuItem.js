import React, { Component, PropTypes } from 'react';

/**
 * Popup window class. Accepts any component as it client.
 * Required properties:
 *
 * {String} title - title bar text for window
 * {Function} onClose - function to call when the window is closed
 * {ReactElement} client - element to place in the client area
 */
export default class MenuItem extends Component {
  static propTypes = {
    text: PropTypes.string.isRequired,
    action: PropTypes.func.isRequired,
  };

  render() {
    return (
      <div className="menu-item"
           onClick={this.props.action}>
        {this.props.text}
      </div>
    );
  }
}
