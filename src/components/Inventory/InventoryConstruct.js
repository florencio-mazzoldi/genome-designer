import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import DnD from '../../containers/graphics/dnd/dnd';
import MouseTrap from '../../containers/graphics/mousetrap';
import { focusForceBlocks } from '../../actions/focus';
import InventoryListGroup from './InventoryListGroup';
import InventoryItemBlock from './InventoryItemBlock';
import * as instanceMap from '../../store/instanceMap';

import { block as blockDragType } from '../../constants/DragTypes';

/*
 InventoryConstruct takes a blockId of a block in a loaded project (i.e. block and components recursively are in the store), and delegates between inventoryItemBlock for blocks and InventoryListGroup to recursively lay out constructs. Use this component if you are unsure whether you have a block or a construct.

 - note - assumes that blocks are in the store
 - attaches a mousetrap to the list group header, if this is in fact a construct, using ref clause for itemElement

 */

export class InventoryConstruct extends Component {
  static propTypes = {
    blockId: PropTypes.string.isRequired,
    block: PropTypes.object.isRequired,
    isActive: PropTypes.bool.isRequired,
    isConstruct: PropTypes.bool.isRequired,
    isTemplate: PropTypes.bool.isRequired,
    focusForceBlocks: PropTypes.func.isRequired,
  };

  shouldRenderAsConstruct(props = this.props) {
    const { isConstruct, isTemplate } = props;
    return isConstruct && !isTemplate;
  }

  componentDidMount() {
    if (this.shouldRenderAsConstruct()) {
      this.registerMouseTrap();
    }
  }

  componentDidUpdate(prevProps) {
    //dispose if no longer construct
    if (this.shouldRenderAsConstruct(prevProps) && !this.shouldRenderAsConstruct()) {
      this.mouseTrap.dispose();
    }

    //register if construct now
    if (!this.shouldRenderAsConstruct(prevProps) && this.shouldRenderAsConstruct()) {
      this.registerMouseTrap();
    }
  }

  registerMouseTrap() {
    this.mouseTrap = new MouseTrap({
      element: this.itemElement,
      mouseDrag: this.mouseDrag.bind(this),
    });
  }

  //dont need to do any special handling for cloning, since this component expects all the components to already be in the store, so deep clone will be fine
  mouseDrag(event, localPosition, startPosition, distance) {
    const { block } = this.props;

    // cancel mouse drag and start a drag and drop
    this.mouseTrap.cancelDrag();
    // get global point as starting point for drag
    const globalPoint = this.mouseTrap.mouseToGlobal(event);

    // start DND
    DnD.startDrag(this.makeDnDProxy(), globalPoint, {
      item: block,
      type: blockDragType,
      source: 'inventory',
      undoRedoTransaction: true,
    });
  }

  /**
   * make a drag and drop proxy for the item
   */
  makeDnDProxy() {
    const { block } = this.props;
    const proxy = document.createElement('div');
    proxy.className = 'InventoryItemProxy';
    proxy.innerHTML = block.getName();
    return proxy;
  }

  render() {
    const { blockId, block, isConstruct, isTemplate, isActive, focusForceBlocks, ...rest } = this.props;

    //use !shouldRenderAsConstruct so short circuit, to avoid calling ref in InventoryListGroup (will be null if never mounted, cause errors when ref clause is called)
    const innerContent = !this.shouldRenderAsConstruct()
      ?
      <InventoryItemBlock block={block}
                          {...rest} />
      :
      //explicitly call connected component to handle recursion
      (
        <InventoryListGroup title={block.getName()}
                            isActive={isActive}
                            onSelect={() => focusForceBlocks([block])}
                            isSelectable
                            ref={(el) => {
                              if (el) { this.itemElement = el.getHeading(); }
                            }}>
          {block.components.map(compId => (
            <InventoryConstructConnected {...rest}
              key={compId}
              blockId={compId}/>
          ))}
        </InventoryListGroup>
      );

    return (
      <div className="InventoryConstruct">
        {innerContent}
      </div>
    );
  }
}

const InventoryConstructConnected = connect((state, props) => {
  const { blockId } = props;
  //prefer state version, which is correct if you've undo-ed something
  const block = state.blocks[blockId] || instanceMap.getBlock(blockId);
  const isActive = state.focus.forceBlocks.some(block => block.id === blockId);
  const isConstruct = block.isConstruct();
  const isTemplate = block.isTemplate();

  return {
    block,
    isActive,
    isConstruct,
    isTemplate,
  };
}, {
  focusForceBlocks,
})(InventoryConstruct);

export default InventoryConstructConnected;
