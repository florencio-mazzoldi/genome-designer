import express from 'express';
import {
  errorNoIdProvided,
  errorInvalidModel,
  errorDoesNotExist,
  errorVersioningSystem,
} from './../utils/errors';
import { merge } from 'lodash';
import * as querying from './../data/querying';
import * as persistence from './../data/persistence';
import { permissionsMiddleware } from './../data/permissions';

import Order from '../../src/models/Order';
import { submit } from './egf';

const router = express.Router(); //eslint-disable-line new-cap

//in theory, we could get rid of this part of the route, and just assign the projectID basic on the project that is posted
router.param('projectId', (req, res, next, id) => {
  Object.assign(req, { projectId: id });
  next();
});

router.route('/:projectId/:orderId?')
  .all(permissionsMiddleware)
  .get((req, res, next) => {
    const { user, projectId } = req;
    const { orderId } = req.params;

    if (!orderId) {
      return persistence.orderGet(orderId, projectId)
        .then(order => res.status(200).json(order))
        .catch(err => next(err));
    }

    return querying.getOrders(projectId)
      .then(orders => res.status(200).json(orders))
      .catch(err => next(err));
  })
  .post((req, res, next) => {
    const { user, projectId } = req;
    const { foundry, order } = req.body;

    //note - this expects order.id to be defined
    if (!Order.validateSetup(order)) {
      next(errorInvalidModel);
    }

    if (foundry !== 'egf') {
      return res.status(501).send('foundry must be EGF');
    }

    //future - this should be dynamic, based on the foundry, pulling from a registry
    submit(order)
      .then(response => {
        return persistence.projectSnapshot(projectId, `ORDER`)
          .then(({ sha }) => {
            merge(order, {
              projectVersion: sha,
              user: {
                id: user.uuid,
                email: user.email,
              },
              status: {
                foundry,
                remoteId: response.jobId,
                price: response.cost,
              },
            });

            return persistence.orderWrite(order.id, order, projectId);
          });
      })
      .then(order => {
        res.status(200).send({
          order,
        });
      })
      .catch(err => {
        console.log(err.stack);

        //todo - handle errors more intelligently
        res.status(400).send(errorInvalidModel);
      });
  });

export default router;
