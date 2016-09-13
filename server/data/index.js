/*
 Copyright 2016 Autodesk,Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
import express from 'express';
import bodyParser from 'body-parser';
import {
  errorNoIdProvided,
  errorInvalidModel,
  errorInvalidRoute,
  errorDoesNotExist,
  errorCouldntFindProjectId,
  errorVersioningSystem,
  errorNoUser,
} from '../utils/errors';
import * as querying from './querying';
import * as persistence from './persistence';
import * as rollup from './rollup';
import { ensureReqUserMiddleware } from '../user/utils';
import { permissionsMiddleware } from './permissions';

import projectFileRouter from './projectFileRouter';

const router = express.Router(); //eslint-disable-line new-cap
const jsonParser = bodyParser.json({
  strict: false, //allow values other than arrays and objects,
  limit: 20 * 1024 * 1024,
});

/***************************
 Middleware
 ****************************/

router.use(jsonParser);

router.use(ensureReqUserMiddleware);

/*
 //deprecated - blocks should have a projectId on them, and this is expensive
 // allow the route /block/<blockId> and find the projectId
 // not recommended e.g. for POST
 // dependent on param middleware below to assign IDs to req directly
 // does not know about SHA, but shouldn't be an issue, as blocks change IDs moving across projects
 const blockDeterminatorMiddleware = (req, res, next) => {
 const { projectId, blockId } = req;

 if (projectId === 'block' && blockId) {
 querying.findProjectFromBlock(blockId)
 .then(projectId => {
 Object.assign(req, { projectId });
 next();
 })
 .catch(err => {
 if (err === errorCouldntFindProjectId) {
 return res.status(404).send('Could not find project ID automatically for block ID ' + blockId);
 }
 return next(err);
 });
 } else if (projectId === 'block' && !blockId) {
 // tried to access route /block without a block ID
 res.status(404).send('Block ID required');
 } else {
 next();
 }
 };
 */

/***************************
 REST
 ***************************/

/******** PARAMS ***********/

router.param('projectId', (req, res, next, id) => {
  Object.assign(req, { projectId: id });
  next();
});

router.param('blockId', (req, res, next, id) => {
  Object.assign(req, { blockId: id });
  next();
});

/********** ROUTES ***********/

/* project files */

router.use('/file/:projectId', permissionsMiddleware, projectFileRouter);

/* sequence */
//expect that a well-formed md5 is sent. however, not yet checking. So you really could just call it whatever you wanted...

// future - url + `?format=${format}`;
router.route('/sequence/:md5/:blockId?')
  .get((req, res, next) => {
    const { md5 } = req.params;

    persistence.sequenceGet(md5)
      .then(sequence => {
        //not entirely sure what this means... the file is empty?
        if (!sequence) {
          return res.status(204).send('');
        }
        res.status(200)
          .set('Content-Type', 'text/plain')
          .send(sequence);
      })
      .catch(err => {
        if (err === errorDoesNotExist) {
          return res.status(400).send(errorDoesNotExist);
        }
        return next(err);
      });
  })
  .post((req, res, next) => {
    const { md5 } = req.params;
    const { sequence } = req.body;

    persistence.sequenceWrite(md5, sequence)
      .then(() => res.status(200).send())
      .catch(err => next(err));
  })
  .delete((req, res) => {
    res.status(403).send('Not allowed to delete sequence');
  });

/* info queries */

router.route('/info/:type/:detail?/:additional?')
  .all(jsonParser)
  .get((req, res, next) => {
    const { user } = req;
    const { type, detail, additional } = req.params;

    //todo - permissions checks where appropriate

    switch (type) {
    case 'role' :
      if (detail) {
        querying.getAllPartsWithRole(user.uuid, detail)
          .then(info => res.status(200).json(info))
          .catch(err => next(err));
      } else {
        querying.getAllBlockRoles(user.uuid)
          .then(info => res.status(200).json(info))
          .catch(err => next(err));
      }
      break;
    case 'contents' :
      rollup.getContents(detail, additional)
        .then(info => res.status(200).json(info))
        .catch(err => next(err));
      break;
    case 'components' :
      rollup.getComponents(detail, additional)
        .then(info => res.status(200).json(info))
        .catch(err => next(err));
      break;
    case 'options' :
      rollup.getOptions(detail, additional)
        .then(info => res.status(200).json(info))
        .catch(err => next(err));
      break;
    default :
      res.status(404).send(`must specify a valid info type in url, got ${type} (param: ${detail})`);
    }
  });

/* rollups */
// routes for non-atomic operations
// response/request with data in rollup format {project: {}, blocks: {}, ...}
// e.g. used in autosave, loading / saving whole project

router.route('/projects/:projectId')
  .all(jsonParser, permissionsMiddleware)
  .get((req, res, next) => {
    const { projectId } = req;
    rollup.getProjectRollup(projectId)
      .then(roll => res.status(200).json(roll))
      .catch(err => {
        if (err === errorDoesNotExist) {
          return res.status(404).send(err);
        }
        return next(err);
      });
  })
  .post((req, res, next) => {
    const { projectId, user } = req;
    const roll = req.body;

    rollup.writeProjectRollup(projectId, roll, user.uuid)
      .then(() => persistence.projectSave(projectId, user.uuid))
      .then(commit => res.status(200).json(commit))
      .catch(err => next(err));
  });

router.route('/projects')
  .all(jsonParser)
  .get((req, res, next) => {
    const { user } = req;

    if (!user || !user.uuid) {
      return res.status(401).send(errorNoUser);
    }

    querying.getAllProjectManifests(user.uuid)
      .then(metadatas => res.status(200).json(metadatas))
      .catch(err => next(err));
  });

/* versioning */

router.route('/:projectId/commit/:sha?')
  .all(permissionsMiddleware)
  .get((req, res, next) => {
    //pass the SHA you want, otherwise send commit log
    const { projectId } = req;
    const { sha } = req.params;

    if (sha) {
      persistence.projectGet(projectId, sha)
        .then(project => res.status(200).json(project))
        .catch(err => next(err));
    } else {
      querying.getProjectVersions(projectId)
        .then(log => res.status(200).json(log))
        .catch(err => next(err));
    }
  })
  .post((req, res, next) => {
    //you can POST a field 'message' for the commit, receive the SHA
    //can also post a field 'rollup' for save a new rollup for the commit
    const { user, projectId } = req;
    const { message, rollup: roll } = req.body;

    const rollupDefined = roll && roll.project && roll.blocks;

    const writePromise = rollupDefined ?
      rollup.writeProjectRollup(projectId, roll, user.uuid) :
      Promise.resolve();

    writePromise
      .then(() => persistence.projectSnapshot(projectId, user.uuid, message))
      .then(commit => res.status(200).json(commit))
      //may want better error handling here
      .catch(err => {
        if (err === errorVersioningSystem) {
          return res.status(500).send(err);
        }
        return next(err);
      });
  });

/*
 In general:

 PUT - replace
 POST - merge
 */

router.route('/:projectId/:blockId')
  .all(permissionsMiddleware)
  .get((req, res, next) => {
    const { projectId, blockId } = req;

    persistence.blockGet(projectId, false, blockId)
      .then(result => {
        if (!result) {
          return res.status(204).json(null);
        }
        res.json(result);
      })
      .catch(err => next(err));
  })
  .put((req, res, next) => {
    const { projectId, blockId } = req;
    const block = req.body;

    if (!!block.id && block.id !== blockId) {
      return res.status(400).send(errorInvalidModel);
    }

    persistence.blockWrite(projectId, block)
      .then(result => {
        res.json(result);
      })
      .catch(err => {
        if (err === errorInvalidModel) {
          return res.status(400).send(errorInvalidModel);
        }
        next(err);
      });
  })
  .post((req, res, next) => {
    const { projectId, blockId } = req;
    const block = req.body;

    if (!!block.id && block.id !== blockId) {
      return res.status(400).send(errorInvalidModel);
    }

    persistence.blockMerge(projectId, blockId, block)
      .then(result => {
        res.json(result);
      })
      .catch(err => {
        if (err === errorInvalidModel) {
          return res.status(400).send(errorInvalidModel);
        }
        next(err);
      });
  })
  .delete((req, res, next) => {
    const { blockId, projectId } = req;

    persistence.blocksDelete(projectId, blockId)
      .then(() => res.status(200).send(blockId))
      .catch(err => next(err));
  });

router.route('/:projectId')
  .all(permissionsMiddleware)
  .get((req, res, next) => {
    const { projectId } = req;
    //const { depth } = req.query; //future

    persistence.projectGet(projectId)
      .then(result => {
        if (!result) {
          return res.status(204).json(null);
        }
        res.json(result);
      })
      .catch(err => next(err));
  })
  .put((req, res, next) => {
    const { projectId, user } = req;
    const project = req.body;

    persistence.projectWrite(projectId, project, user.uuid)
      .then(result => res.json(result))
      .catch(err => {
        if (err === errorInvalidModel) {
          return res.status(400).send(errorInvalidModel);
        }
        next(err);
      });
  })
  .post((req, res, next) => {
    const { projectId, user } = req;
    const project = req.body;

    if (!!project.id && project.id !== projectId) {
      return res.status(400).send(errorInvalidModel);
    }

    persistence.projectMerge(projectId, project, user.uuid)
      .then(merged => res.status(200).send(merged))
      .catch(err => {
        if (err === errorInvalidModel) {
          return res.status(400).send(errorInvalidModel);
        }
        next(err);
      });
  })
  .delete((req, res, next) => {
    const { projectId } = req;
    const forceDelete = !!req.query.force;

    persistence.projectDelete(projectId, forceDelete)
      .then(() => res.status(200).json({ projectId }))
      .catch(err => {
        if (err === errorDoesNotExist) {
          return res.status(404).send(errorDoesNotExist);
        }
        return next(err);
      });
  });

//default catch
router.use('*', (req, res) => {
  res.status(404).send(errorInvalidRoute);
});

export default router;
