import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { uiToggleDetailView } from '../actions/ui';
import { registry } from '../extensions/index';

import '../styles/ProjectDetail.css';

//todo - how should this be exposed so that React won't dump it away

export class ProjectDetail extends Component {
  static propTypes = {
    uiToggleDetailView: PropTypes.func.isRequired,
    isVisible: PropTypes.bool.isRequired,
    project: PropTypes.object.isRequired,
  };

  componentDidMount() {
    //hack - load in Onion
    setTimeout(() => {
      this.forceUpdate();
      registry.sequenceDetail[0].render(this.refs.extensionView);
    }, 500);
  }

  toggle = (forceVal) => {
    this.props.uiToggleDetailView(forceVal);
    window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  };

  loadExtension = (manifest) => {
    this.toggle(true);
    manifest.render(this.refs.extensionView);
  };

  render() {
    //todo - need to trigger render when extensions are registered

    return (
      <div className={'ProjectDetail' + (this.props.isVisible ? ' visible' : '')}>
        <div className="ProjectDetail-heading">
          {!this.props.isVisible && (<a ref="open"
             className="ProjectDetail-heading-toggle"
             onClick={() => this.toggle()} />)}

          <div className="ProjectDetail-heading-extensionList">
            {registry.sequenceDetail.map(manifest => {
              return (
                <a key={manifest.id}
                   className="ProjectDetail-heading-extension"
                   onClick={this.loadExtension.bind(null, manifest)}>{manifest.name}</a>
              );
            })}

            {!this.props.isVisible && ( <a className="ProjectDetail-heading-extension disabled">3D Protein Preview</a>)}
            {!this.props.isVisible && ( <a className="ProjectDetail-heading-extension disabled">CRISPR</a>)}
          </div>

          {this.props.isVisible && (<a ref="close"
             className="ProjectDetail-heading-close"
             onClick={() => this.toggle(false)} />)}
        </div>
        <div className="ProjectDetail-chrome">
          <div ref="extensionView"
               className="ProjectDetail-extensionView"></div>
        </div>

      </div>
    );
  }
}

const mapStateToProps = (state, props) => {
  const isVisible = state.ui.detailViewVisible;
  return {
    isVisible,
  };
};

export default connect(mapStateToProps, {
  uiToggleDetailView,
})(ProjectDetail);
