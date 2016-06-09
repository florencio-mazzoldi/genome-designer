import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { blockLoad, blockStash } from '../../actions/blocks';
import { block as blockDragType } from '../../constants/DragTypes';
import { infoQuery } from '../../middleware/data';
import { symbolMap } from '../../inventory/roles';

//bit of a hack, since we are not storing this information in the store (since its really derived data) but need to update it
import { lastAction, subscribe } from '../../store/index';
import * as ActionTypes from '../../constants/ActionTypes';

import InventoryListGroup from './InventoryListGroup';
import InventoryList from './InventoryList';
import Spinner from '../ui/Spinner';

export class InventoryRoleMap extends Component {
  static propTypes = {
    blockStash: PropTypes.func.isRequired,
    blockLoad: PropTypes.func.isRequired,
  };

  state = {
    loadingMap: true,
    loadedTypes: {},
    typeMap: {},
  };

  componentDidMount() {
    //returns a map { <rolekey> : number }
    infoQuery('role').then(typeMap => this.setState({
      typeMap,
      loadingMap: false,
    }));

    //update the state map when roles change (since otherwise we only upload when component loads)
    //hack - ideally this would be derived data. However, to derive, need all the blocks in the store. So, we'll patch it.
    //apolgies for denseness, but intend to get rid of this before too long
    this.storeSubscriber = subscribe(() => {
      const action = lastAction();
      //todo - should handle creating new blocks and stuff
      //usually, not looking at this section when creating new blocks? ignoring for now...
      if (action.type === ActionTypes.BLOCK_SET_ROLE) {
        const { oldRole, block } = action;
        const oldRoleEff = oldRole || 'none';
        const newRole = block.rules.role || 'none';

        const newTypeMap = Object.assign({}, this.state.typeMap, {
          [oldRoleEff]: this.state.typeMap[oldRoleEff] - 1,
          [newRole]: (this.state.typeMap[newRole] || 0) + 1,
        });
        const newLoadedTypes = Object.assign({}, this.state.loadedTypes, {
          [oldRoleEff]: (this.state.loadedTypes[oldRoleEff] || []).filter(roleBlock => block.id !== roleBlock.id),
          [newRole]: [...(this.state.loadedTypes[newRole] || []), block],
        });
        this.setState({
          typeMap: newTypeMap,
          loadedTypes: newLoadedTypes,
        });
      }
    });
  }

  componentWillUnmount() {
    this.storeSubscriber();
  }

  //false is for loading
  setRoleType(type, blocks = false) {
    this.setState({
      loadedTypes: Object.assign(this.state.loadedTypes, { [type]: blocks }),
    });
  }

  onToggleType = (nextState, type) => {
    if (!nextState) return;
    //no caching for now...
    //when update to a cache, this should live update (right now, updates only when change tabs)

    //loading
    this.setRoleType(type, false);

    //returns an array of blocks
    infoQuery('role', type)
      .then(blocks => this.setRoleType(type, blocks));
  };

  onBlockDrop = (item, target) => {
    //get components if its a construct and add blocks to the store
    //note - this may be a very large query
    return this.props.blockLoad(item.id, true, true)
      .then(() => item);
  };

  render() {
    const { typeMap, loadedTypes, loadingMap } = this.state;

    const content = loadingMap ?
      <Spinner /> :
      Object.keys(typeMap).map(type => {
        const count = typeMap[type];
        const name = symbolMap[type] || type;
        const items = loadedTypes[type] || [];
        const isLoading = loadedTypes[type] === false;
        return (
          <InventoryListGroup key={type}
                              title={name + ` (${count})`}
                              isLoading={isLoading}
                              onToggle={(nextState) => this.onToggleType(nextState, type)}>
            <InventoryList inventoryType={blockDragType}
                           onDrop={this.onBlockDrop}
                           items={items}/>
          </InventoryListGroup>
        );
      });

    return (
      <div className="InventoryRoleMap">
        {content}
      </div>
    );
  }
}

export default connect(() => ({}), {
  blockStash,
  blockLoad,
})(InventoryRoleMap);
