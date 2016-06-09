import React, { Component, PropTypes } from 'react';
import Row from './row';

export default class Page3 extends Component {

  static propTypes = {
    open: PropTypes.bool.isRequired,
  };

  render() {
    // no render when not open
    if (!this.props.open) {
      return null;
    }

    const { order } = this.props;

    return (
      <div className="order-page page3">
        <Row text="Label:">
          <div>{order.metadata.name}</div>
        </Row>
        <Row text="Job ID:">
          <div>{order.status.remoteId}</div>
        </Row>
        <Row text="Date Submitted:">
          <div>{new Date(order.status.timeSent).toUTCString()}</div>
        </Row>
        <Row text="Method:">
          <div>{order.parameters.onePot ? 'All in a single container' : 'Each in an individual container'}</div>
        </Row>
        <Row text="After Fabrication:">
          <div>{order.parameters.sequenceAssemblies ? 'Sequence' : 'Do Not Sequence'}</div>
        </Row>
        <br/>
      </div>
    );
  }
}
