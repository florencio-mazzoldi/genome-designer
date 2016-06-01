import React, { Component, PropTypes } from 'react';

import '../styles/InputSimple.css';

export default class InputSimple extends Component {
  static propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    readOnly: PropTypes.bool,
    default: PropTypes.string,
    updateOnBlur: PropTypes.bool, //its probably best to not update on blur... see midupdate caveat below
    useTextarea: PropTypes.bool,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    onEscape: PropTypes.func,
    maxLength: PropTypes.number,
  };

  static defaultProps = {
    onFocus: () => {},
    onBlur: () => {},
    onEscape: () => {},
    maxLength: 4096,
  };

  constructor(props) {
    super();

    //we need to maintain state internally so we do not need to update on all changes
    this.state = {
      value: props.value,
    };

    // annoyingly, props can update before document click listeners are registered
    // won't always trigger a blur event, e.g. if click outside and props change
    // want to make sure blur is always called even if click outside, so register our own listener
    // this likely will call the new function passed as onBlur, but for us for now, this is ok (ends transaction)
    // want to always ensure that blur function is called
    this.midupdate = null;
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.props.value) {
      if (this.midupdate) {
        this.midupdate();
        this.midupdate = null;
      }

      this.setState({ value: nextProps.value });
    }
  }

  handleFocus = (event) => {
    this.props.onFocus(event);
  };

  handleBlur = (event) => {
    if (this.props.updateOnBlur) {
      this.handleSubmission(event.target.value);
    }
    this.props.onBlur(event);
  };

  handleKeyUp = (event) => {
    if (this.props.readOnly) {
      event.preventDefault();
      return;
    }
    //escape
    if (event.keyCode === 27) {
      this.props.onEscape(event);
      this.refs.input.blur();
      return;
    }
    //enter
    if (event.keyCode === 13 || !this.props.updateOnBlur) {
      this.handleSubmission(event.target.value);
    }
  };

  handleSubmission = (value) => {
    if (!this.props.readOnly) {
      this.props.onChange(value);
    }
  };

  handleChange = (event) => {
    this.setState({ value: event.target.value });

    if (!this.props.updateOnBlur) {
      this.handleSubmission(event.target.value);
    } else {
      this.midupdate = this.props.onBlur;
    }
  };

  render() {
    return (
      <div className={'InputSimple' +
      (this.props.readOnly ? ' readOnly' : '')}>
        {(this.props.useTextarea) &&
        <textarea
          ref="input"
          rows="5"
          value={this.state.value}
          maxLength={this.props.maxLength}
          className="InputSimple-input"
          disabled={this.props.readOnly}
          placeholder={this.props.placeholder}
          onChange={this.handleChange}
          onBlur={this.handleBlur}
          onFocus={this.handleFocus}
          onKeyUp={this.handleKeyUp}/>
        }
        {(!this.props.useTextarea) &&
        <input
          size="30"
          ref="input"
          value={this.state.value}
          maxLength={this.props.maxLength}
          disabled={this.props.readOnly}
          className="InputSimple-input"
          placeholder={this.props.placeholder}
          onChange={this.handleChange}
          onBlur={this.handleBlur}
          onFocus={this.handleFocus}
          onKeyUp={this.handleKeyUp}/>
        }
      </div>
    );
  }
}
