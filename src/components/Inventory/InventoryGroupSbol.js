import React, { Component, PropTypes } from 'react';
import { sbol as sbolDragType } from '../../constants/DragTypes';

import InventoryList from './InventoryList';

export default class InventoryGroupSbol extends Component {
  static propTypes = {
    items: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      metadata: PropTypes.shape({
        name: PropTypes.string.isRequired,
        image: PropTypes.string.isRequired,
      }).isRequired,
    })).isRequired,
  };

  render() {
    const { items } = this.props;

    return (
      <div className="InventoryGroup InventoryGroupSbol">
        <InventoryList inventoryType={sbolDragType}
                       items={items}/>
      </div>
    );
  }
}
