import React, {Component, PropTypes} from 'react';
import {connect} from 'react-redux';
import {
  uiShowAuthenticationForm,
  uiSetGrunt,
  uiShowUserWidget,
 } from '../actions/ui';
import '../styles/homepage.css';
import { projectOpen } from '../actions/projects';

export default class HomePage extends Component {
  static propTypes = {
    uiShowAuthenticationForm: PropTypes.func.isRequired,
    uiShowUserWidget: PropTypes.func.isRequired,
    uiSetGrunt: PropTypes.func.isRequired,
    projectOpen: PropTypes.func.isRequired,
    location: PropTypes.object.isRequired,
    params: PropTypes.object.isRequired,
    user: PropTypes.object,
  };

  // this route can result from path like 'homepage/signin', 'homepage', 'homepage/register' etc.
  // If the final path is the name of an authorization form we will show it
  componentDidMount() {
    const authForm = this.props.params.comp;
    if (['signin', 'signup', 'account', 'reset', 'forgot'].indexOf(authForm) >= 0) {
      this.props.uiShowAuthenticationForm(authForm);
    } else {
      // if not showing an auth form goto most recent project or demo project
      // NOTE: the nodirect query string prevents redirection
      if (this.props.user && this.props.user.userid && !this.props.location.query.noredirect) {
        // revisit last project
        this.props.projectOpen(null);
        return;
      }
    }

    // user widget is hidden on homepage
    this.props.uiShowUserWidget(false);
  }

  /**
   * the homepage is the only page that doesn't show the user widget, so we can
   * display whenever we leave
   */
  componentWillUnmount() {
    this.props.uiShowUserWidget(true);
  }

  signIn(evt) {
    evt.preventDefault();
    this.props.uiShowAuthenticationForm('signin');
  }

  render() {
    return (
      <div className="homepage">
        <div className="homepage-image-area">
          <img className="homepage-logo" src="/images/homepage/app-logo.png"/>
          <img className="homepage-background" src="/images/homepage/tiles.jpg"/>
            <div className="homepage-name">
              <div className="lighter">Autodesk&nbsp;</div>
              <div>Genetic Constructor</div>
            </div>
            <div className="homepage-title">
              <div>Design and manufacture<br/>living things</div>
            </div>
          <div className="homepage-getstarted" onClick={this.signIn.bind(this)}>Get started</div>
        </div>
        <img className="homepage-autodesk" src="/images/homepage/autodesk-logo.png"/>
        <img className="homepage-egf" src="/images/homepage/egf-logo.png"/>
        <div className="homepage-footer">
          <div className="homepage-footer-title">New in version 0.1:</div>
          <div className="homepage-footer-list">
            <ul>
              <li><span>&bull;</span>Search and import parts directly from the IGEM and NCBI databases.</li>
              <li><span>&bull;</span>Specify parts from the Edinburgh Genome Foundry inventory.</li>
              <li><span>&bull;</span>Import and export GenBank and FASTA files.</li>
              <li><span>&bull;</span>Create an inventory of your own projects, constructs and parts to reuse.</li>
              <li><span>&bull;</span>Drag and drop editing.</li>
            </ul>
            <ul>
              <li><span>&bull;</span>Inspect sequence detail.</li>
              <li><span>&bull;</span>Create nested constructs to manage complexity.</li>
              <li><span>&bull;</span>Assign SBOL visual symbols and colors.</li>
              <li><span>&bull;</span>Add titles and descriptions blocks, constructs and projects.</li>
              <li><span>&bull;</span>Organize constructs into separate projects.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
  renderOLD() {
    return (
      <div className="homepage">
        <div className="homepage-image-area">
          <img className="homepage-background" src="/images/homepage/tiles.jpg"/>
          <div className="homepage-getstarted" onClick={this.signIn.bind(this)}>Get started</div>
          <img className="homepage-title" src="/images/homepage/genomedesigner.png"/>
        </div>
        <img className="homepage-autodesk" src="/images/homepage/autodesk-logo.png"/>
        <div className="homepage-egf">Edinburgh Genome Foundry</div>
        <div className="homepage-footer">
          <div className="homepage-footer-title">New in version 0.1:</div>
          <div className="homepage-footer-list">
            <ul>
              <li><span>&bull;</span>Search and import parts directly from the IGEM and NCBI databases.</li>
              <li><span>&bull;</span>Specify parts from the Edinburgh Genome Foundry inventory.</li>
              <li><span>&bull;</span>Import and export GenBank and FASTA files.</li>
              <li><span>&bull;</span>Create an inventory of your own projects, constructs and parts to reuse.</li>
              <li><span>&bull;</span>Drag and drop editing.</li>
            </ul>
            <ul>
              <li><span>&bull;</span>Inspect sequence detail.</li>
              <li><span>&bull;</span>Create nested constructs to manage complexity.</li>
              <li><span>&bull;</span>Assign SBOL visual symbols and colors.</li>
              <li><span>&bull;</span>Add titles and descriptions blocks, constructs and projects.</li>
              <li><span>&bull;</span>Organize constructs into separate projects.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    user: state.user,
  };
}

export default connect(mapStateToProps, {
  uiShowAuthenticationForm,
  uiShowUserWidget,
  uiSetGrunt,
  projectOpen,
})(HomePage);
