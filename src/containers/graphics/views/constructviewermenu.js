import React, { Component, PropTypes } from 'react';
import kT from './layoutconstants';

export default class ConstructViewerMenu extends Component {

  static propTypes = {
    layoutAlgorithm: PropTypes.string.isRequired,
    constructId: PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);
  }

  fullClicked = () => {
  };

  /**
   * render the component, the scene graph will render later when componentDidUpdate is called
   */
  render() {
    const wrapStyle = this.props.layoutAlgorithm === kT.layoutWrap ? 'link checked' : 'link';
    const fullStyle = this.props.layoutAlgorithm === kT.layoutFull ? 'link checked' : 'link';
    const fitStyle = this.props.layoutAlgorithm === kT.layoutFit ? 'link checked' : 'link';
    return (
      <div className="construct-viewer-menu">
        <a className="link">＋</a>
        <a className="link">Construct</a>
        <a className="link">Instance</a>
        <a className="link">Block</a>
        <a className="link">List</a>
        <a className="link">↔</a>
        <a onClick={this.fullClicked} className={fullStyle}>Full</a>
        <a className={wrapStyle}>Wrap</a>
        <a className={fitStyle}>Fit</a>
        <a className="link">✂</a>
        <a className="link">Splice</a>
        <a className="link">Crop</a>
      </div>
    );
  }
}
