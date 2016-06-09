import React, { Component, PropTypes } from 'react';
import {connect} from 'react-redux';
import { uiShowAuthenticationForm, uiSetGrunt } from '../../actions/ui';
import invariant from 'invariant';
import { userLogin } from '../../actions/user';
import { projectOpen } from '../../actions/projects';

/**
 * default visibility and text for error labels
 * @type {Object}
 */
const errors = {
  signinError: {
    visible: false,
    text: 'none',
  },
};

class SignInForm extends Component {

  static propTypes = {
    uiShowAuthenticationForm: PropTypes.func.isRequired,
    uiSetGrunt: PropTypes.func.isRequired,
    userLogin: PropTypes.func.isRequired,
    projectOpen: PropTypes.func.isRequired,
  };

  constructor() {
    super();
    this.state = Object.assign({}, errors, {canSubmit: false});
  }

  onForgot(evt) {
    evt.preventDefault();
    this.props.uiShowAuthenticationForm('forgot');
  }

  // on form submission, first perform client side validation then submit
  // to the server if that goes well.
  onSubmit(evt) {
    // submission occurs via REST not form submission
    evt.preventDefault();

    this.props.userLogin(this.emailAddress, this.password)
      .then(user => {
        // close the form
        this.props.uiShowAuthenticationForm('none');
        this.props.projectOpen(null);
      })
      .catch((reason) => {
        const defaultMessage = 'Email address or password are not recognized.';
        const { message = defaultMessage } = reason;
        this.showServerErrors({
          message,
        });
      });
  }

  onRegister(evt) {
    evt.preventDefault();
    this.props.uiShowAuthenticationForm('signup');
  }
  onTextChanged() {
    this.setState({
      canSubmit: this.emailAddress && this.password,
    });
  }
  get emailAddress() {
    return this.refs.emailAddress.value.trim();
  }
  get password() {
    return this.refs.password.value.trim();
  }

  /**
   * display server errors in the most logical way
   */
  showServerErrors(json) {
    invariant(json && json.message, 'We expected an error message');
    // any unrecognized errors are displayed below the tos
    const msg = json.message === 'Incorrect username.' ? "Email address not recognized" : json.message;
    this.setState({
      signinError: {
        visible: true,
        text: msg,
      },
    });
  }

  render() {
    const registerStyle = {
      textAlign: 'center',
      margin: '1rem 0 2rem 0',
    };

    return (
      <form
        id="auth-signin"
        className="gd-form authentication-form"
        onSubmit={this.onSubmit.bind(this)}>
        <div className="title">Sign In</div>
          <span style={registerStyle}>{"Don't have an account? "}
            <a className="blue-link" href="/" onClick={this.onRegister.bind(this)}>Sign Up&nbsp;</a>
            <span>{"- it's free!"}</span>
          </span>
        <input
          ref="emailAddress"
          className="input"
          placeholder="Email Address"
          onChange={this.onTextChanged.bind(this)}
          />
        <input
          type="password"
          ref="password"
          maxLength={32}
          className="input"
          onChange={this.onTextChanged.bind(this)}
          placeholder="Password"/>
        <div className="forgot-box">
          <a className="blue-link forgot-link" href="/" onClick={this.onForgot.bind(this)}>Forgot?</a>
        </div>
        <div
          className={`error ${this.state.signinError.visible ? 'visible' : ''}`}>{`${this.state.signinError.text}`}</div>
        <button
          type="submit"
          disabled={!this.state.canSubmit}
          >Sign In</button>
        <button
          type="button"
          onClick={() => {
            this.props.uiShowAuthenticationForm('none');
          }}>Cancel</button>
      </form>
    );
  }
}

function mapStateToProps(state) {
  return {};
}

export default connect(mapStateToProps, {
  uiShowAuthenticationForm,
  uiSetGrunt,
  userLogin,
  projectOpen,
})(SignInForm);
