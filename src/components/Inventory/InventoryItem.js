import React, { Component, PropTypes } from 'react';
import DnD from '../../containers/graphics/dnd/dnd';
import MouseTrap from '../../containers/graphics/mousetrap';

import '../../styles/InventoryItem.css';

export default class InventoryItem extends Component {
  static propTypes = {
    inventoryType: PropTypes.string.isRequired,
    item: PropTypes.shape({
      metadata: PropTypes.shape({
        name: PropTypes.string.isRequired,
        image: PropTypes.string,
      }).isRequired,
    }).isRequired,
  };

  componentDidMount() {
    const dom = React.findDOMNode(this);
    this.mouseTrap = new MouseTrap({
      element: dom,
      mouseDrag: this.mouseDrag.bind(this),
    });
  }

  mouseDrag(event, localPosition, startPosition, distance) {
    // cancel mouse drag and start a drag and drop
    this.mouseTrap.cancelDrag();
    // get global point as starting point for drag
    const globalPoint = this.mouseTrap.mouseToGlobal(event);
    // start DND
    DnD.startDrag(this.makeDnDProxy(), globalPoint, {
      item: this.props.item,
      type: this.props.inventoryType,
    });
  }
  /**
   * make a drag and drop proxy for the item
   */
  makeDnDProxy() {
    const proxy = document.createElement('span');
    proxy.classList.add('InventoryItemProxy');
    proxy.innerHTML = this.props.item.metadata.name;
    return proxy;
  }

  render() {
    const item = this.props.item;
    const imagePath = item.metadata.image;

    return (
      <div className={'InventoryItem' +
        (!!imagePath ? ' hasImage' : '')}>
        <a className="InventoryItem-item">
          {!!imagePath && <img className="InventoryItem-image" src={imagePath}/> }
          <span className="InventoryItem-text">{item.metadata.name}</span>
        </a>
      </div>
    );
  }
}
