import React, { Component, PropTypes } from 'react';
import BlockSchema from '../../schemas/Block';
import * as validators from '../../schemas/fields/validators';
import { escapeRegExp } from 'lodash';

import InventorySearch from './InventorySearch';
import InventoryItemBlock from './InventoryItemBlock';

export default class InventoryGroupBlocks extends Component {
  static propTypes = {
    items: ({ items }) => validators.arrayOf(item => BlockSchema.validate(item, true))(items) || null,
  };

  state = {
    searchTerm: '',
  };

  handleSearchChange = (searchTerm) => {
    this.setState({ searchTerm });
  };

  render() {
    const { items } = this.props;
    const { searchTerm } = this.state;

    //in the future, we will want smarter searching
    const searchRegex = new RegExp(escapeRegExp(searchTerm), 'gi');
    const listingItems = items.filter(item => searchRegex.test(item.metadata.name) || searchRegex.test(item.rules.role));

    return (
      <div className="InventoryGroup-content InventoryGroupBlocks">
        <InventorySearch searchTerm={searchTerm}
                         placeholder="Filter by name or biological function"
                         onSearchChange={this.handleSearchChange}/>

        <div className="InventoryGroup-contentInner no-vertical-scroll">
          {listingItems.map(item => {
            return (<InventoryItemBlock key={item.id}
                                        block={item}/>);
          })}
        </div>
      </div>
    );
  }
}

