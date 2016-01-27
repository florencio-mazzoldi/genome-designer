import React, { Component, PropTypes } from 'react';

import InventoryItem from './InventoryItem';

import '../../styles/InventoryList.css';

export default class InventoryList extends Component {
  static propTypes = {
    inventoryType: PropTypes.string.isRequired,
    items: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
    })).isRequired,
  };

  render() {
    const { items, inventoryType } = this.props;

    return (
      <div className="InventoryList">
        {items.map(item => {
          return (
            <InventoryItem key={item.id}
                           inventoryType={inventoryType}
                           item={item}/>
          );
        })}
      </div>
    );
  }
}
