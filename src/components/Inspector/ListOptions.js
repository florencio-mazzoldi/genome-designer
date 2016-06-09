import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import ListOption from './ListOption';
import { blockOptionsToggle } from '../../actions/blocks';

import '../../styles/ListOptions.css';

export class ListOptions extends Component {
  static propTypes = {
    block: PropTypes.shape({
      id: PropTypes.string.isRequired,
      options: PropTypes.object.isRequired,
    }).isRequired,
    optionBlocks: PropTypes.array.isRequired,
    blockOptionsToggle: PropTypes.func.isRequired,
  };

  onSelectOption = (option) => {
    this.props.blockOptionsToggle(this.props.block.id, option.id);
  };

  render() {
    const { block, optionBlocks } = this.props;
    const { options } = block;
    const isFrozen = block.isFrozen();

    return (
      <div className={'ListOptions no-vertical-scroll' + (isFrozen ? ' isFrozen' : '')}>
        {isFrozen && <div className="ListOptions-explanation">List items cannot be modified after they have been frozen. Duplicate the template to make changes.</div>}
        {optionBlocks.map(item => {
          return (
            <ListOption
              option={item}
              key={item.id}
              selected={options[item.id]}
              onClick={(option) => { if (!isFrozen) { this.onSelectOption(option); }}}/>
          );
        })}
      </div>
    );
  }
}

const mapStateToProps = (state, props) => ({
  optionBlocks: Object.keys(props.block.options).map(id => state.blocks[id]),
});

export default connect(mapStateToProps, {
  blockOptionsToggle,
})(ListOptions);
