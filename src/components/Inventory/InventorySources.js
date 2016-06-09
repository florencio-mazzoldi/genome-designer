import React, { PropTypes } from 'react';
import PopupMenu from '../Menu/PopupMenu';
import '../../styles/InventorySources.css';

//note - this is reset on hot-reloads, but shouldnt matter in production
let position = {};

export default function InventorySources({ toggling, sourceList, registry, onSourceToggle, onToggleVisible }) {
  const menuItems = [
    {
      text: 'Search Sources:',
      disabled: true,
      action: () => {},
    },
    ...(Object.keys(registry)
      .filter(key => typeof registry[key].search === 'function')
      .map(key => {
        const source = registry[key];
        return {
          text: source.name,
          action: () => onSourceToggle(key),
          checked: sourceList.includes(key),
        };
      })),
  ];

  return (
    <div className={'InventorySources' + (toggling ? ' expanded' : '')}
         onClick={() => onToggleVisible()}
         ref={(el) => {
           if (el) {
             const {top: y, left: x} = el.getBoundingClientRect();
             position = {x, y};
           }
         }}>
      <div className="InventorySources-back">
        <div className="InventorySources-back-cog"></div>
        <div className="InventorySources-back-sources">
          <span>{`Sources: ${sourceList.map(source => registry[source].name).join(', ')}`}</span>
        </div>
      </div>
      <PopupMenu open={toggling}
                 closePopup={() => onToggleVisible()}
                 position={position}
                 menuItems={menuItems}/>
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
