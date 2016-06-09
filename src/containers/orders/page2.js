import React, { Component, PropTypes } from 'react';
import ConstructPreview from './constructpreview';

export default class Page2 extends Component {

  static propTypes = {
    open: PropTypes.bool.isRequired,
    order: PropTypes.object.isRequired,
  };

  render() {
    // no render when not open
    if (!this.props.open) {
      return null;
    }

    return (
      <div className="order-page page2">
      <ConstructPreview order={this.props.order} />
      </div>
    );
  }
}
