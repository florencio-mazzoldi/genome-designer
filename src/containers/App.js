import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import GlobalNav from './GlobalNav';
import AuthenticationForms from './authentication/authenticationforms';
import ImportGenBankModal from '../components/genbank/import';
import ImportDNAForm from '../components/importdna/importdnaform';
import AboutForm from '../components/aboutform';

import '../styles/App.css';

class App extends Component {
  static propTypes = {
    children: PropTypes.node, // Injected by React Router
    user: PropTypes.object,
    currentProjectId: PropTypes.string,
    location: PropTypes.shape({
      pathname: PropTypes.string.isRequired,
    }).isRequired,
  };

  /**
   * attempt to eat backspace keys ( to prevent navigation ) unless an interactive
   * element is the target
   */
  componentDidMount() {
    document.addEventListener('keydown', this.rejectBackspace);
    document.addEventListener('keypress', this.rejectBackspace);
  }

  rejectBackspace(evt) {
    const rx = /INPUT|SELECT|TEXTAREA/i;
    if (evt.which === 8) { // 8 == backspace
      if (evt.target.hasAttribute('contenteditable')) {
        return;
      }
      if (!rx.test(evt.target.tagName) || evt.target.disabled || evt.target.readOnly) {
        evt.preventDefault();
      }
    }
  }

  render() {
    const DevTools = (!!process.env.DEBUGMODE) ? require('./DevTools') : 'noscript';
    const onProjectPage = this.props.location.pathname.indexOf('project/') >= 0;

    return (
      <div className="App">
        <GlobalNav currentProjectId={this.props.currentProjectId}
                   showMenu={onProjectPage}/>
        <AuthenticationForms />
        <ImportGenBankModal currentProjectId={this.props.currentProjectId}/>
        <ImportDNAForm />
        <AboutForm />
        <div className="App-pageContent">
          {this.props.children}
        </div>
        <DevTools />
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  return {
    currentProjectId: ownProps.params.projectId,
    user: state.user,
  };
}

export default connect(mapStateToProps, {})(App);
