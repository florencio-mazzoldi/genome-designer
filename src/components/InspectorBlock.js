import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { blockMerge, blockSetColor, blockSetSbol, blockRename } from '../actions/blocks';
import InputSimple from './InputSimple';
import ColorPicker from './ui/ColorPicker';
import SymbolPicker from './ui/SymbolPicker';

//for now, assumes only blocks. Later, may need to pass a type as well

export class InspectorBlock extends Component {
  static propTypes = {
    instance: PropTypes.object.isRequired,
    blockSetColor: PropTypes.func.isRequired,
    blockSetSbol: PropTypes.func.isRequired,
    blockMerge: PropTypes.func.isRequired,
    blockRename: PropTypes.func.isRequired,
  };

  setBlockName = (name) => {
    this.props.blockRename(this.props.instance.id, name);
  };

  setBlockDescription = (description) => {
    if (description !== this.props.instance.metadata.description) {
      this.props.blockMerge(this.props.instance.id, {metadata: {description}});
    }
  };

  selectColor = (color) => {
    this.props.blockSetColor(this.props.instance.id, color);
  };

  selectSymbol = (symbol) => {
    this.props.blockSetSbol(this.props.instance.id, symbol);
  };

  render() {
    const { instance } = this.props;

    return (
      <div className="InspectorContent InspectorContentBlock">
        <h4 className="InspectorContent-heading">Name</h4>
        <InputSimple placeholder="Part Name"
                     onChange={this.setBlockName}
                     value={instance.metadata.name}/>

        <h4 className="InspectorContent-heading">Description</h4>
        <InputSimple placeholder="Part Description"
                     useTextarea
                     onChange={this.setBlockDescription}
                     updateOnBlur
                     value={instance.metadata.description}/>

        <h4 className="InspectorContent-heading">Sequence Length</h4>
        <p><strong>{instance.sequence.length ? (instance.sequence.length + ' bp') : 'No Sequence'}</strong></p>

        <h4 className="InspectorContent-heading">Color</h4>
        <ColorPicker current={instance.metadata.color}
                     onSelect={this.selectColor}/>

        <h4 className="InspectorContent-heading">Symbol</h4>
        <SymbolPicker current={instance.rules.sbol}
                      onSelect={this.selectSymbol}/>


      </div>
    );
  }
}

export default connect(() => ({}), {
  blockSetColor,
  blockSetSbol,
  blockRename,
  blockMerge,
})(InspectorBlock);
