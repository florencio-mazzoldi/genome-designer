import express from 'express';
import formidable from 'formidable';
import invariant from 'invariant';
import md5 from 'md5';

//GC specific
import Project from '../../../../src/models/Project';
import Block from '../../../../src/models/Block';
import * as fileSystem from '../../../../server/utils/fileSystem';
import * as filePaths from '../../../../server/utils/filePaths';
import * as persistence from '../../../../server/data/persistence';
import * as rollup from '../../../../server/data/rollup';
import { errorDoesNotExist } from '../../../../server/utils/errors';
import { merge, filter } from 'lodash';
import resetColorSeed from '../../../../src/utils/generators/color'; //necessary?
import { permissionsMiddleware } from '../../../data/permissions';

//genbank specific
import { convert, importProject, exportProject, exportConstruct } from './convert';

const extensionKey = 'genbank';

//make storage directory just in case...
fileSystem.directoryMake(filePaths.createStorageUrl(extensionKey));

const createFilePath = (fileName) => {
  invariant(fileName, 'need a file name');
  return filePaths.createStorageUrl(extensionKey, fileName);
};
const createFileUrl = (fileName) => {
  invariant(fileName, 'need a file name');
  return extensionKey + '/file/' + fileName;
};

//create the router
const router = express.Router(); //eslint-disable-line new-cap

/***** FILES ******/

//route to download genbank files
router.get('/file/:fileId', (req, res, next) => {
  const { fileId } = req.params;

  const path = createFilePath(fileId);

  fileSystem.fileExists(path)
    .then(() => res.download(path))
    .catch(err => {
      if (err === errorDoesNotExist) {
        return res.status(404).send();
      }
      next(err);
    });
});

/***** EXPORT ******/

router.param('projectId', (req, res, next, id) => {
  Object.assign(req, { projectId: id });
  next();
});

router.get('/export/blocks/:projectId/:blockIdList', permissionsMiddleware, (req, res, next) => {
  const { projectId, blockIdList } = req.params;
  const blockIds = blockIdList.split(',');

  console.log(`exporting blocks ${blockIdList} from ${projectId} (${req.user.uuid})`);

  rollup.getProjectRollup(projectId)
    .then(roll => {
      const blocks = blockIds.map(blockId => roll.blocks[blockId]);
      invariant(blocks.every(block => block.sequence.md5), 'some blocks dont have md5');

      const name = (roll.project.metadata.name || roll.project.id) + '.gb';

      const construct = Block.classless({
        metadata: {
          name,
        },
        components: blocks.map(block => block.id),
      });
      const project = Project.classless(Object.assign(roll.project, {
        components: [construct.id],
      }));

      const partialRoll = {
        project,
        blocks: blocks.reduce((acc, block) => {
          return Object.assign(acc, {
            [block.id]: block,
          });
        }, {
          [construct.id]: construct,
        }),
      };

      exportConstruct({ roll: partialRoll, constructId: construct.id })
        .then(fileContents => {
          res.set({
            'Content-Disposition': `attachment; filename="${roll.project.id}.fasta"`,
          });
          res.send(fileContents);
        });
    })
    .catch(err => {
      console.log('Error!', err);
      res.status(500).send(err);
    });
});

router.get('/export/:projectId/:constructId?', permissionsMiddleware, (req, res, next) => {
  const { projectId, constructId } = req.params;

  console.log(`exporting construct ${constructId} from ${projectId} (${req.user.uuid})`);

  rollup.getProjectRollup(projectId)
    .then(roll => {
      const name = (roll.project.metadata.name ? roll.project.metadata.name : roll.project.id) + '.gb';

      const promise = !!constructId ?
        exportConstruct({ roll, constructId }) :
        exportProject(roll);

      return promise
        .then(result => {
          res.attachment(name);
          res.status(200).send(result);
        });
    })
    .catch(err => {
      console.log('Error!', err);
      res.status(500).send(err);
    });
});

/***** IMPORT ******/

//convert without persisting
//takes a string as input, not a file, unlike route below
//returns { roots: [], blocks: { <id> : <block> } }
router.post('/import/convert', (req, resp, next) => {
  const constructsOnly = !!req.query.constructsOnly;

  let buffer = '';

  req.on('data', data => {
    buffer += data;
  });

  req.on('end', () => {
    const fileMd5 = md5(buffer);
    const inputFilePath = createFilePath(fileMd5);

    console.log(`converting genbank (${req.user.uuid}) @ ${inputFilePath}`);

    return fileSystem.fileWrite(inputFilePath, buffer, false)
      .then(() => {
        resetColorSeed();
        return convert(inputFilePath);
      })
      .then(converted => {
        const roots = converted.roots;
        const rootBlocks = filter(converted.blocks, (block, blockId) => roots.indexOf(blockId) >= 0);
        const payload = constructsOnly ?
        { roots, blocks: rootBlocks } :
          converted;
        resp.status(200).json(payload);
      })
      .catch(err => next(err));
  });
});

//todo - permissions check here

router.post('/import/:projectId?', (req, res, next) => {
  const { projectId } = req.params;
  const noSave = req.query.hasOwnProperty('noSave') || projectId === 'convert';

  let genbankFile;
  // save incoming file then read back the string data.
  // If these files turn out to be large we could modify the import functions to take
  // file names instead but for now, in memory is fine.
  const form = new formidable.IncomingForm();

  //parse the form
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      resolve(files);
    });
  })
  //make sure we got files, read them back
    .then(files => {
      const tempPath = (files && files.data) ? files.data.path : null;

      if (!tempPath) {
        return Promise.reject('no file provided');
      }

      return fileSystem.fileRead(tempPath, false);
    })
    //write files to our own location
    .then((data) => {
      const fileName = md5(data);
      genbankFile = createFilePath(fileName);
      return fileSystem.fileWrite(genbankFile, data, false);
    })
    //convert the genbank to a rollup, saving sequences in the process
    .then(() => {
      resetColorSeed();
      return importProject(genbankFile);
    })
    //check if we are merging into a project or making a new one, return appropriate rollup
    .then(roll => {
      const blockIds = Object.keys(roll.blocks);

      if (!blockIds.length) {
        return Promise.reject('no valid blocks');
      }

      if (!projectId) {
        return Promise.resolve(roll);
      }

      return rollup.getProjectRollup(projectId)
        .then((existingRoll) => {
          existingRoll.project.components = existingRoll.project.components.concat(roll.project.components);
          Object.assign(existingRoll.blocks, roll.blocks);
          return existingRoll;
        });
    })
    .then(roll => {
      return fileSystem.fileWrite(genbankFile + '-converted', roll)
        .then(() => roll);
    })
    .then(roll => {
      if (noSave) {
        return Promise.resolve(roll);
      }

      return rollup.writeProjectRollup(roll.project.id, roll, req.user.uuid)
        .then(() => persistence.projectSave(roll.project.id, req.user.uuid))
        .then(() => roll);
    })
    .then((roll) => res.status(200).json({ ProjectId: roll.project.id }))
    .catch(err => {
      console.log('Error in Import: ' + err);
      console.log(err.stack);
      res.status(500).send(err);
    });
});

router.all('*', (req, res) => res.status(404).send('route not found'));

export default router;
