import React, { Component, PropTypes } from 'react';

import '../styles/InputSimple.css';

export default class InputSimple extends Component {
  static propTypes = {
    placeholder: PropTypes.string,
    default: PropTypes.string,
    updateOnBlur: PropTypes.bool,
    useTextarea: PropTypes.bool,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.props.value) {
      this.setInputValue(nextProps.value);
    }
  }

  getInputValue() {
    return this.refs.input.value;
  }

  setInputValue(val) {
    // Generally mutating DOM is a bad idea in React components,
    // but doing this for a single uncontrolled field is less fuss
    // than making it controlled and maintaining a state for it.
    this.refs.input.value = val;
  }

  handleBlur = (event) => {
    if (this.props.updateOnBlur) {
      this.props.onChange(this.getInputValue());
    }
  };

  handleKeyUp = (event) => {
    if (event.keyCode === 13 || !this.props.updateOnBlur) {
      this.handleSubmission();
    }
  };

  handleSubmission = (event) => {
    this.props.onChange(this.getInputValue());
  };

  render() {
    return (
      <div className="InputSimple">
        {(this.props.useTextarea) &&
        <textarea
          ref="input"
          className="InputSimple-input"
          placeholder={this.props.placeholder}
          defaultValue={this.props.value || this.props.default}
          onBlur={this.handleBlur}
          onKeyUp={this.handleKeyUp}/>
        }
        {(!this.props.useTextarea) &&
        <input
          size="30"
          ref="input"
          className="InputSimple-input"
          placeholder={this.props.placeholder}
          defaultValue={this.props.value || this.props.default}
          onBlur={this.handleBlur}
          onKeyUp={this.handleKeyUp}/>
        }
      </div>
    );
  }
}
