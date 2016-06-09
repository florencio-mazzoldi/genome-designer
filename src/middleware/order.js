import rejectingFetch from './rejectingFetch';
import invariant from 'invariant';
import { orderApiPath } from './paths';
import { headersGet, headersPost, headersPut, headersDelete } from './headers';
import Order from '../models/Order';
import * as instanceMap from '../store/instanceMap';

// likely want a registry like for inventory and hit their respective functions for each foundry

// todo - handle errors, make consistent
export const submitOrder = (order, foundry = 'egf') => {
  invariant(foundry === 'egf', 'must submit a foundry (right now, only egf works');
  invariant(Order.validateSetup(order), 'order be valid partial order (prior to ID + foundry data)');

  const url = orderApiPath(`${order.projectId}`);
  const stringified = JSON.stringify({
    foundry,
    order,
  });

  return rejectingFetch(url, headersPost(stringified))
    .then(resp => resp.json())
    .then(order => {
      instanceMap.saveOrder(order);
      return order;
    });
};

const getQuote = (foundry, order) => {
  invariant(false, 'not implemented');
};

export const getOrder = (projectId, orderId, avoidCache = false) => {
  const cached = instanceMap.orderLoaded(orderId);

  if (cached && !avoidCache) {
    return Promise.resolve(instanceMap.getOrder(orderId));
  }

  const url = orderApiPath(`${projectId}/${orderId}`);
  return rejectingFetch(url, headersGet())
    .then(resp => resp.json())
    .then(order => {
      instanceMap.saveOrder(order);
      return order;
    });
};

export const getOrders = (projectId, avoidCache = false) => {
  const cached = instanceMap.projectOrdersLoaded(projectId);

  if (cached && !avoidCache) {
    return Promise.resolve(instanceMap.getProjectOrders(projectId));
  }

  const url = orderApiPath(`${projectId}`);

  return rejectingFetch(url, headersGet())
    .then(resp => resp.json())
    .then(orders => {
      instanceMap.saveProjectOrders(projectId, ...orders);
      return orders;
    });
};
