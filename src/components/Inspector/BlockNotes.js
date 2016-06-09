import React, { PropTypes } from 'react';

import '../../styles/BlockNotes.css';

export default function BlockNotes({ notes }) {
  return (
    <div className="BlockNotes">
      {Object.keys(notes).map(key => {
        const value = notes[key];
        return (
          <div className="BlockNotes-group"
               key={key}>
            <div className="BlockNotes-group-title">{key}</div>
            <div className="BlockNotes-group-value">{value}</div>
          </div>
        );
      })}
    </div>
  );
}

BlockNotes.propTypes = {
  notes: PropTypes.object.isRequired,
};
