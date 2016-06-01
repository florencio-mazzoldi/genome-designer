import React, { Component, PropTypes } from 'react';
import invariant from 'invariant';
import Block from '../../models/Block';
import { block as blockDragType } from '../../constants/DragTypes';

import InventoryItem from './InventoryItem';

//note - Supports templates - assumes that no additional work is needed when cloning templates than just blocks. Right now, this assumption is true because the whole project is loaded when you toggle it (and therefore all template options + components will be in the store)
// Use InventoryConstruct if you have a block that may be a construct (with components) OR a block, and it will delegate properly (and show construct with toggler if it is indeed a construct)

export default class InventoryItemBlock extends Component {
  static propTypes = {
    isTemplate: PropTypes.bool,
    block: (props, propName) => {
      if (!(Block.validate(props[propName]) && props[propName] instanceof Block)) {
        return new Error('must pass a real block (Block model) to InventoryItemBlock');
      }
    },
  };

  componentDidMount() {
    invariant(this.props.block.isTemplate || !this.props.block.isConstruct(), 'Do not use InventoryItemBlock when you want to show components, use InventoryConstruct');
  }

  render() {
    const { block, isTemplate, ...rest } = this.props;

    return (
      <div className="InventoryItemBlock">
        <InventoryItem {...rest}
          inventoryType={blockDragType}
          defaultName={block.getName()}
          glyph={isTemplate ? '🔒' : null}
          item={block}/>
      </div>
    );
  }
}
