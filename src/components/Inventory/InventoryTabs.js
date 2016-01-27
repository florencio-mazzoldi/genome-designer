import React, { Component, PropTypes } from 'react';

import '../../styles/InventoryTabs.css';

export default class InventoryTabs extends Component {
  static propTypes = {
    tabs: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string.isRequired,
    })).isRequired,
    onTabSelect: PropTypes.func.isRequired,
    activeTabIndex: PropTypes.number,
  };

  render() {
    const { tabs, onTabSelect, activeTabIndex } = this.props;

    return (
      <div className="InventoryTabs">
        {tabs.map((tab, index) => {
          return (
            <a className={'InventoryTabs-tab' + (activeTabIndex === index ? ' active' : '')}
               key={tab.name}
               onClick={onTabSelect.bind(null, index)}>
              {tab.name}
            </a>
          );
        })}
      </div>
    );
  }
}
