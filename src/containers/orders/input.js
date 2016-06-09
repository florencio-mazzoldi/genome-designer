import React, { Component, PropTypes } from 'react';

export default class Input extends Component {

  static propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  render() {
    return (
      <input
        onChange={evt => {
          this.props.onChange(evt.target.value);
        }}
        defaultValue={this.props.value}
        placeholder={this.props.placeholder}
      />
    )
  }
}
