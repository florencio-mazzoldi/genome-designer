import React, { PropTypes } from 'react';

import '../../styles/InventorySources.css';

export default function InventorySources({ toggling, sourceList, registry, onSourceToggle, onToggleVisible }) {
  const content = !toggling
    ?
    <span>{`${sourceList.map(source => registry[source].name).join(', ')}`}</span>
    :
    <div>
      {Object.keys(registry)
        .filter(key => typeof registry[key].search === 'function')
        .map(key => {
          const source = registry[key];
          return (
            <div key={key}
                 onClick={(evt) => {
                   evt.stopPropagation();
                   onSourceToggle(key);
                 }}
                 className="InventorySources-source">
              <input type="checkbox"
                     className="InventorySources-toggler"
                     readOnly
                     checked={sourceList.includes(key)}/>{source.name}</div>
          );
        })}
    </div>;

  return (
    <div className={'InventorySources' + (toggling ? ' expanded' : '')} onClick={() => onToggleVisible()}>
      <div className="InventorySources-cog"></div>
      <div className="InventorySources-sources">
        <span>Sources: </span>
        {content}
      </div>
    </div>
  );
}

InventorySources.propTypes = {
  toggling: PropTypes.bool.isRequired,
  registry: PropTypes.object.isRequired,
  sourceList: PropTypes.array.isRequired,
  onToggleVisible: PropTypes.func.isRequired,
  onSourceToggle: PropTypes.func.isRequired,
};
