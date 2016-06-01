import React, { PropTypes } from 'react';

import '../../styles/ListOption.css';

export default function ListOption({ option, selected, onClick }) {
  return (
    <div className={'ListOption' +
                    (selected ? ' selected' : '')}
         onClick={() => onClick(option)}>
      <span className="ListOption-check">
        &#x2714;
      </span>
      <span className="ListOption-name">
        {option.metadata.name}
      </span>
    </div>
  );
}

ListOption.propTypes = {
  option: PropTypes.shape({
    id: PropTypes.string.isRequired,
    source: PropTypes.object.isRequired,
  }).isRequired,
  defaultName: PropTypes.string,
  onClick: PropTypes.func,
  selected: PropTypes.bool,
};
