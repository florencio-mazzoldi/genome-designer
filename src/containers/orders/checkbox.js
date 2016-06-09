import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';

import '../../../src/styles/ordermodal.css';

export default class Input extends Component {
  static propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    label: PropTypes.string.isRequired,
  };

  render() {
    return (
      <div className="row-checkbox">
        <input onChange={evt => {this.props.onChange(evt.target.checked);}}
               type="checkbox"
               defaultChecked={this.props.value} />
        {this.props.label}
      </div>
    );
  }
}
