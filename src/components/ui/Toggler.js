import React, { PropTypes } from 'react';
import { setAttribute } from '../../containers/graphics/utils';

const serializer = navigator.userAgent.indexOf('Node.js') < 0 ? new XMLSerializer() : {
  serializeToString: () => {return '<SVG/>';},
};

import '../../styles/Toggler.css';

export default function Toggler({ onClick, hidden, open, disabled, styles }) {
  if (hidden) {
    //todo - in React v15, can return null
    return <noscript />;
  }

  const handleClick = (evt) => {
    if (!disabled) {
      onClick(evt);
    }
  };

  const templateId = `disclosure_triangle_closed`;
  const template = document.getElementById(templateId);
  const svg = template.cloneNode(true);
  svg.removeAttribute('id');

  const markup = serializer.serializeToString(svg);

  return (<div className={'Toggler' +
                           (disabled ? ' disabled' : '') +
                           (open ? ' open' : '')}
              styles={styles}
              onClick={handleClick}
              dangerouslySetInnerHTML={{__html: markup}}></div>);
}

Toggler.propTypes = {
  onClick: PropTypes.func,
  styles: PropTypes.object,
  open: PropTypes.bool,
  disabled: PropTypes.bool,
  hidden: PropTypes.bool,
};

Toggler.defaultProps = {
  onClick: () => {},
  styles: {},
  hidden: false,
  open: false,
  disabled: false,
};
