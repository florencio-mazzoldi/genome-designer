import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { inventorySearch, inventorySourcesVisibility } from '../../actions/inventory';
import { blockStash } from '../../actions/blocks';
import { block as blockDragType } from '../../constants/DragTypes';
import { chain, debounce, escapeRegExp } from 'lodash';

import { registry, getSources } from '../../inventory/registry';
import * as searchApi from '../../middleware/search';

import InventorySources from './InventorySources';
import InventoryTabs from './InventoryTabs';
import InventorySearch from './InventorySearch';
import InventoryList from './InventoryList';
import InventoryListGroup from './InventoryListGroup';

const defaultSearchResults = getSources('search').reduce((acc, source) => Object.assign(acc, { [source]: [] }), {});

const createSourcesVisible = (valueFunction = () => false) => {
  return getSources('search').reduce((acc, source) => Object.assign(acc, { [source]: valueFunction(source) }), {});
};

const inventoryTabs = [
  { key: 'source', name: 'By Source' },
  { key: 'type', name: 'By Kind' },
];

export class InventoryGroupSearch extends Component {
  static propTypes = {
    searchTerm: PropTypes.string.isRequired,
    sourcesToggling: PropTypes.bool.isRequired,
    inventorySearch: PropTypes.func.isRequired,
    inventorySourcesVisibility: PropTypes.func.isRequired,
    blockStash: PropTypes.func.isRequired,
  };

  state = {
    searching: false,
    sourceList: getSources('search'),
    sourcesVisible: createSourcesVisible(),
    searchResults: defaultSearchResults,
    groupBy: 'source',
    lastSearch: { term: '', sourceList: [] },
  };

  componentDidMount() {
    const searchingFunction = (term, options = null) => {
      this.setState({ searching: true });
      const sourceList = this.state.sourceList;

      searchApi.search(term, options, sourceList)
        .then(searchResults => this.setState({
          searchResults,
          lastSearch: { term, sourceList },
          sourcesVisible: createSourcesVisible((source) => searchResults[source] && searchResults[source].length > 0),
          searching: false,
        }))
        .catch(err => {
          console.warn('couldnt fetch results!', err);
          this.setState({
            searchResults: defaultSearchResults,
            searching: false,
          });
        });
    };

    this.forceSearch = searchingFunction;
    this.debouncedSearch = debounce(searchingFunction, 200);
  }

  onListGroupToggle = (source) => {
    this.setState({
      sourcesVisible: Object.assign(this.state.sourcesVisible, { [source]: !this.state.sourcesVisible[source] }),
    });
  };

  onSourceToggle = (source) => {
    const { sourceList } = this.state;
    const newSourceList = sourceList.length ? sourceList.slice() : getSources('search');

    //xor, reset if empty
    const indexOfSource = newSourceList.indexOf(source);
    if (indexOfSource >= 0) {
      newSourceList.splice(indexOfSource, 1);
      if (newSourceList.length === 0) {
        newSourceList.push(...getSources('search'));
      }
    } else {
      newSourceList.push(source);
    }

    this.setState({ sourceList: newSourceList });
  };

  getFullItem = (registryKey, item, shouldAddToStore) => {
    const { source, id } = item.source;
    if (source && id) {
      return registry[source].get(id)
        .then(result => {
          //if we have an array, first one is construct, and all other blocks should be added to the store
          if (Array.isArray(result)) {
            const [ construct, ...blocks ] = result;

            //need to specially handle blocks which are constructs here, add them to the store (not important for showing in the inspector)
            //todo - does this accomodate onion properly
            //todo - performance -- this will effectively add everything twice, since will be cloned. Should not clone deep (there is an option for this in blockClone, need to pass to onDrop of construct viewer, somehow diffrentiate from dragging a construct from a project
            if (shouldAddToStore) {
              this.props.blockStash(construct, ...blocks);
            }

            return construct;
          }
          //otherwise, just one result
          return result;
        });
    }
    return Promise.resolve(item);
  };

  handleTabSelect = (key) => {
    this.setState({ groupBy: key });
  };

  handleSearchChange = (value) => {
    this.props.inventorySearch(value);
    this.debouncedSearch(value);
  };

  handleListOnSelect = (registryKey, item) => {
    return this.getFullItem(registryKey, item, false);
  };

  handleListOnDrop = (registryKey, item, target, position) => {
    return this.getFullItem(registryKey, item, true);
  };

  handleToggleSourceVisiblity = (nextState) => {
    const newState = this.props.inventorySourcesVisibility(nextState);

    //if hiding, check if any new sources enabled, and if so run a new search
    if (!newState) {
      if (this.state.sourceList.some(source => !this.state.lastSearch.sourceList.includes(source))) {
        this.forceSearch(this.props.searchTerm);
      }
    }
  };

  //want to filter down results while next query running
  filterListItems = list => {
    const { searchTerm } = this.props;
    const { searching } = this.state;

    if (!searching) return list;

    const searchRegex = new RegExp(escapeRegExp(searchTerm), 'gi');
    return list.filter(item => searchRegex.test(item.metadata.name) || searchRegex.test(item.rules.role));
  };

  render() {
    const { searchTerm, sourcesToggling } = this.props;
    const { searching, sourceList, searchResults, sourcesVisible, groupBy } = this.state;

    //doesnt account for filtering...
    const noSearchResults = Object.keys(searchResults).reduce((acc, key) => acc + searchResults[key].length, 0) === 0;

    //this is a bit ugly, and would be nice to break up more meaningfully... would require a lot of passing down though
    // could do this sorting when the results come in?
    //nested ternary - null if no lengths, then handle based on groupBy
    const groupsContent = noSearchResults ?
      (!searching && <div className="InventoryGroup-placeholderContent">No Results Found</div>) :
      (groupBy === 'source')
        ?
        sourceList.map(key => {
          if (!searchResults[key]) {
            return null;
          }

          const name = registry[key].name;
          const listingItems = searchResults[key];

          return (
            <InventoryListGroup title={`${name} (${listingItems.length})`}
                                disabled={!listingItems.length}
                                manual
                                isExpanded={sourcesVisible[key]}
                                onToggle={() => this.onListGroupToggle(key)}
                                key={key}>
              <InventoryList inventoryType={blockDragType}
                             onDrop={(item) => this.handleListOnDrop(key, item)}
                             onSelect={(item) => this.handleListOnSelect(key, item)}
                             items={listingItems}/>
            </InventoryListGroup>
          );
        })
        :
        chain(searchResults)
          .map((sourceResults, sourceKey) => sourceResults.map(block => block.merge({ source: sourceKey })))
          .values()
          .flatten()
          .groupBy('rules.role')
          .map((items, group) => {
            const listingItems = items;
            return (
              <InventoryListGroup title={`${group} (${listingItems.length})`}
                                  disabled={!listingItems.length}
                                  manual
                                  isExpanded={sourcesVisible[group]}
                                  onToggle={() => this.onListGroupToggle(group)}
                                  key={group}>
                <InventoryList inventoryType={blockDragType}
                               onDrop={(item) => this.handleListOnDrop(item.source, item)}
                               onSelect={(item) => this.handleListOnSelect(item.source, item)}
                               items={listingItems}/>
              </InventoryListGroup>
            );
          })
          .value();

    return (
      <div className={'InventoryGroup-content InventoryGroupSearch'}>
        <InventorySearch searchTerm={searchTerm}
                         isSearching={searching}
                         disabled={sourcesToggling}
                         onSearchChange={this.handleSearchChange}/>
        <InventorySources registry={registry}
                          sourceList={sourceList}
                          toggling={sourcesToggling}
                          onToggleVisible={this.handleToggleSourceVisiblity}
                          onSourceToggle={this.onSourceToggle}/>

        {(!noSearchResults && !sourcesToggling) && (
          <InventoryTabs tabs={inventoryTabs}
                         activeTabKey={groupBy}
                         onTabSelect={(tab) => this.handleTabSelect(tab.key)}/>
        )}

        {!sourcesToggling && (
          <div className="InventoryGroup-contentInner no-vertical-scroll">
            {groupsContent}
          </div>
        )}
      </div>
    );
  }
}

function mapStateToProps(state, props) {
  const { searchTerm, sourcesToggling } = state.inventory;

  return {
    searchTerm,
    sourcesToggling,
  };
}

export default connect(mapStateToProps, {
  inventorySearch,
  inventorySourcesVisibility,
  blockStash,
})(InventoryGroupSearch);
