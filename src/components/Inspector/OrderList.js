import React, { PropTypes } from 'react';

import '../../styles/OrderList.css';

export default function OrderList({ orders, onClick, ...rest }) {

  if (!orders.length) {
    return null;
  }

  return (
    <div className="OrderList">
      {orders.map(order => {
        const { constructNames } = order.metadata;
        const orderedNames = (constructNames && constructNames.length) ? constructNames.join(', ') : null;
        return (
          <div className="OrderList-group"
               key={order.id}>
            <div className="OrderList-group-heading">{order.getName()}</div>
            {orderedNames && <div className="OrderList-group-names">{orderedNames}</div>}
            <div className="OrderList-group-time">
              {(new Date(order.dateSubmitted())).toLocaleString()}
              <a className="OrderList-group-action"
                 onClick={() => onClick(order.id)}>Order Details...</a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

OrderList.propTypes = {
  orders: PropTypes.array.isRequired,
  onClick: PropTypes.func.isRequired,
};