import express from 'express';
import bodyParser from 'body-parser';
import {
  errorNoIdProvided,
  errorInvalidModel,
  errorInvalidRoute,
  errorDoesNotExist,
  errorCouldntFindProjectId,
  errorVersioningSystem,
} from './../utils/errors';
import * as querying from './querying';
import * as persistence from './persistence';
import * as rollup from './rollup';
import { permissionsMiddleware } from './permissions';

const router = express.Router(); //eslint-disable-line new-cap
const jsonParser = bodyParser.json({
  strict: false, //allow values other than arrays and objects,
  limit: 20 * 1024 * 1024,
});

/***************************
 Middleware
 ****************************/

router.use(jsonParser);

// allow the route /block/<blockId> and find the projectId
// not recommended e.g. for POST
// dependent on param middleware below to assign IDs to req directly
// does not know about SHA, but shouldn't be an issue, as blocks change IDs moving across projects
//todo - should be able to look at block.projectId in many cases... likely easiest from the client when already have the block, here we'd have to fetch it
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

/*
 In general:

 PUT - replace
 POST - merge
 */

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

router.route('/info/:type/:detail?')
  .all(jsonParser)
  .get((req, res, next) => {
    const { user } = req;
    const { type, detail } = req.params;

    //expect blockIds, not projectId
    //todo - ideally would pass in the project on all of these so dont need to look it up each time... should have it when make the reuqest anyway

    switch (type) {
    case 'role' :
      if (detail) {
        querying.getAllBlocksWithRole(user.uuid, detail)
          .then(info => res.status(200).json(info))
          .catch(err => next(err));
      } else {
        querying.getAllBlockRoles(user.uuid)
          .then(info => res.status(200).json(info))
          .catch(err => next(err));
      }
      break;
    case 'contents' :
      rollup.getContents(detail)
        .then(info => res.status(200).json(info))
        .catch(err => next(err));
      break;
    case 'components' :
      rollup.getComponents(detail)
        .then(info => res.status(200).json(info))
        .catch(err => next(err));
      break;
    case 'options' :
      rollup.getOptions(detail)
        .then(info => res.status(200).json(info))
        .catch(err => next(err));
      break;
    default :
      res.status(404).send(`must specify a valid info type in url, got ${type} (param: ${detail})`);
    }
  });

// routes for non-atomic operations
// response/request with data in rollup format {project: {}, blocks: [], ...}
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

    querying.getAllProjectManifests(user.uuid)
      .then(metadatas => res.status(200).json(metadatas))
      .catch(err => next(err));
  });

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

router.route('/:projectId/:blockId')
  .all(blockDeterminatorMiddleware, permissionsMiddleware)
  .get((req, res, next) => {
    const { projectId, blockId } = req;

    persistence.blockGet(blockId, projectId)
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

    persistence.blockWrite(blockId, block, projectId)
      .then(result => res.json(result))
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

    persistence.blockMerge(blockId, block, projectId)
      .then(merged => res.json(merged))
      .catch(err => {
        if (err === errorInvalidModel) {
          return res.status(400).send(errorInvalidModel);
        }
        next(err);
      });
  })
  .delete((req, res, next) => {
    const { blockId, projectId } = req;

    persistence.blockDelete(blockId, projectId)
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

    persistence.projectDelete(projectId)
      .then(() => res.status(200).json({ projectId }))
      .catch(err => next(err));
  });

//default catch
router.use('*', (req, res) => {
  res.status(404).send(errorInvalidRoute);
});

export default router;
