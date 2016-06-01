import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import DnD from '../../containers/graphics/dnd/dnd';
import MouseTrap from '../../containers/graphics/mousetrap';
import RoleSvg from '../RoleSvg';
import BasePairCount from '../ui/BasePairCount';

import { inspectorToggleVisibility } from '../../actions/ui';
import { focusForceBlocks } from '../../actions/focus';

import '../../styles/InventoryItem.css';

export class InventoryItem extends Component {
  static propTypes = {
    inventoryType: PropTypes.string.isRequired,
    item: PropTypes.shape({
      metadata: PropTypes.shape({
        name: PropTypes.string.isRequired,
        image: PropTypes.string,
      }).isRequired,
    }).isRequired,
    glyph: PropTypes.string, //e.g. lock icon for templates
    svg: PropTypes.string, //right now, SBOL SVG ID
    defaultName: PropTypes.string,
    onDrop: PropTypes.func, //can return promise (e.g. update store), value is used for onDrop in DnD registered drop target. Can pass value from promise to use for drop as payload, or undefined
    onDragStart: PropTypes.func, //transact
    onDragComplete: PropTypes.func, //commit
    onSelect: PropTypes.func, //e.g. when clicked
    forceBlocks: PropTypes.array.isRequired,
    inspectorToggleVisibility: PropTypes.func.isRequired,
    focusForceBlocks: PropTypes.func.isRequired,
  };

  componentDidMount() {
    this.mouseTrap = new MouseTrap({
      element: this.itemElement,
      mouseDrag: this.mouseDrag.bind(this),
    });
  }

  mouseDrag(event, localPosition, startPosition, distance) {
    // cancel mouse drag and start a drag and drop
    this.mouseTrap.cancelDrag();
    // get global point as starting point for drag
    const globalPoint = this.mouseTrap.mouseToGlobal(event);

    //onDragStart handler
    if (this.props.onDragStart) {
      this.props.onDragStart(this.props.item);
    }

    // start DND
    DnD.startDrag(this.makeDnDProxy(), globalPoint, {
      item: this.props.item,
      type: this.props.inventoryType,
      source: 'inventory',
    }, {
      onDrop: (target, position) => {
        if (this.props.onDrop) {
          return this.props.onDrop(this.props.item, target, position);
        }
      },
      onDragComplete: (target, position, payload) => {
        if (this.props.onDragComplete) {
          this.props.onDragComplete(payload.item, target, position);
        }
      },
    });
  }

  /**
   * make a drag and drop proxy for the item
   */
  makeDnDProxy() {
    const proxy = document.createElement('div');
    proxy.className = 'InventoryItemProxy';
    proxy.innerHTML = this.props.item.metadata.name || this.props.defaultName;
    const svg = this.itemElement.querySelector('svg');
    if (svg) {
      const svgClone = svg.cloneNode(true);
      svgClone.removeAttribute('data-reactid');
      proxy.appendChild(svgClone);
    }
    return proxy;
  }

  handleClick = () => {
    const { item, onSelect, inspectorToggleVisibility, focusForceBlocks } = this.props;

    const promise = (!!onSelect) ? onSelect(item) : Promise.resolve(item);

    promise.then(result => {
      focusForceBlocks([result]);
      inspectorToggleVisibility(true);
    });
  };

  render() {
    const { item, svg, glyph, defaultName } = this.props;
    const isSelected = this.props.forceBlocks.indexOf(item) >= 0;

    const hasSequence = item.sequence && item.sequence.length > 0;
    const itemName = item.metadata.name || defaultName || 'Unnamed';

    return (
      <div className={'InventoryItem' +
        (!!svg ? ' hasImage' : '') +
        (!!isSelected ? ' selected' : '')}
           ref={(el) => this.itemElement = el}>
        <a className="InventoryItem-item"
           onClick={this.handleClick}>
          {svg ? <RoleSvg symbolName={svg} color="white"/> : null}
          {!!glyph ? <span className="InventoryItem-glyph">{glyph}</span> : null}
          <span className="InventoryItem-text">
            {itemName}
          </span>
          {hasSequence && <BasePairCount count={item.sequence.length}/>}
        </a>
      </div>
    );
  }
}

export default connect((state) => {
  return {
    forceBlocks: state.focus.forceBlocks,
  };
}, {
  focusForceBlocks,
  inspectorToggleVisibility,
})(InventoryItem);
