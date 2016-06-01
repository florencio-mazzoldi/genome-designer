import invariant from 'invariant';
import Order from '../models/Order';
import { getOrder, getOrders } from '../middleware/order';
import * as ActionTypes from '../constants/ActionTypes';
import * as projectActions from './projects';
import * as blockActions from './blocks';
import * as projectSelectors from '../selectors/projects';
import * as blockSelectors from '../selectors/blocks';
import { merge, flatten } from 'lodash';
import OrderConstructDefinition from '../schemas/OrderConstruct';

export const orderList = (projectId) => {
  return (dispatch, getState) => {
    return getOrders(projectId)
      .then(orders => {
        dispatch({
          type: ActionTypes.ORDER_STASH,
          orders,
        });
        return orders;
      });
  };
};

export const orderGet = (projectId, orderId) => {
  return (dispatch, getState) => {
    return getOrder(projectId, orderId)
      .then(order => {
        dispatch({
          type: ActionTypes.ORDER_STASH,
          order,
        });
        return order;
      });
  };
};

//create an order with basic fields
export const orderCreate = (projectId, constructIds = [], parameters = {}) => {
  return (dispatch, getState) => {
    invariant(projectId, 'must pass project ID');

    invariant(Array.isArray(constructIds) && constructIds.length, 'must pass array of construct IDs to use in order');
    //make sure we have specs
    invariant(constructIds.every(id => dispatch(blockSelectors.blockIsSpec(id))), 'all constructs must be specs (no empty option lists, and each leaf node must have a sequence)');

    invariant(typeof parameters === 'object', 'paramters must be object');

    const order = new Order({
      projectId,
      constructIds,
      parameters,
    });

    //add order to the store
    dispatch({
      type: ActionTypes.ORDER_CREATE,
      order,
    });
    return order;
  };
};

export const orderSetParameters = (orderId, parameters = {}, shouldMerge = false) => {
  return (dispatch, getState) => {
    invariant(Order.validateParameters(parameters), 'parameters must pass validation');

    const oldOrder = getState().orders[orderId];
    const order = oldOrder.setParameters(parameters, shouldMerge);

    dispatch({
      type: ActionTypes.ORDER_STASH,
      order,
    });
    return order;
  };
};

//should only call after parameters have been set
export const orderGenerateConstructs = (orderId) => {
  return (dispatch, getState) => {
    const oldOrder = getState().orders[orderId];
    const { constructIds, parameters } = oldOrder;

    //todo - validate parameters

    //for each constructId, get construct combinations as blocks
    //flatten all combinations into a single list of combinations
    const constructs = flatten(constructIds.map(constructId => dispatch(blockSelectors.blockGetCombinations(constructId, parameters))))
    //convert each combination construct (currently blocks) into schema-conforming form
      .map(construct => {
        //each construct comforms ot OrderConstruct
        return merge(OrderConstructDefinition.scaffold(), {
          //each construct component conforms to OrderConstructComponent
          components: construct.map(component => ({
            componentId: component.id,
            source: component.source,
          })),
        });
      });

    const order = oldOrder.setConstructs(constructs);

    dispatch({
      type: ActionTypes.ORDER_STASH,
      order,
    });
    return order;
  };
};

//submit the order, foundry information is required
//actually saves the order to the server
export const orderSubmit = (orderId, foundry) => {
  return (dispatch, getState) => {
    const order = getState().orders[orderId];
    invariant(order, 'order not in the store...');
    invariant(!order.isSubmitted(), 'Cant submit an order twice');

    return order.submit(foundry)
      .then(order => {
        dispatch({
          type: ActionTypes.PROJECT_SNAPSHOT,
          projectId: order.projectId,
          sha: order.projectVersion,
        });

        dispatch({
          type: ActionTypes.ORDER_SUBMIT,
          order,
        });
        return order;
      });
  };
};
