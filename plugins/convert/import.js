import express from 'express';
import bodyParser from 'body-parser';
import { getPlugin } from '../loadPlugin';
import * as persistence from '../../server/data/persistence';
import * as rollup from '../../server/data/rollup';
import formidable from 'formidable';
import * as fileSystem from '../../server/utils/fileSystem';
import * as filePaths from '../../server/utils/filePaths';
import { errorDoesNotExist } from '../../server/utils/errors';
import md5 from 'md5';

const router = express.Router(); //eslint-disable-line new-cap
const jsonParser = bodyParser.json({
  strict: false, //allow values other than arrays and objects
});

const namespace = 'convert';

function callImportFunction(funcName, pluginId, inputFilePath) {
  return getPlugin(namespace, pluginId)
    .then(mod => {
      return new Promise((resolve, reject) => {
        if (mod && mod[funcName]) {
          try {
            const func = mod[funcName];
            func(inputFilePath)
              .then(res => {
                resolve(res);
              })
              .catch(err => {
                reject(err);
              });
          } catch (err) {
            reject(err);
          }
        } else {
          reject('No import option named ' + pluginId + ' for projects');
        }
      });
    });
}

function importProject(pluginId, inputFilePath) {
  return callImportFunction('importProject', pluginId, inputFilePath);
}

//route to download genbank files
router.get('/:pluginId/file/:fileId', (req, res, next) => {
  const { pluginId, fileId } = req.params;

  const path = filePaths.createStorageUrl(pluginId, fileId);

  fileSystem.fileExists(path)
    .then(() => res.download(path))
    .catch(err => {
      if (err === errorDoesNotExist) {
        return res.status(404).send();
      }

      next(err);
    });
});

// genbank without a project
router.post('/:pluginId/convert', jsonParser, (req, resp, next) => {
  const { pluginId } = req.params;

  let buffer = '';

  req.on('data', data => {
    buffer += data;
  });

  req.on('end', () => {
    const inputFilePath = filePaths.createStorageUrl(pluginId, md5(buffer));
    return fileSystem.fileWrite(inputFilePath, buffer, false)
      .then(() => callImportFunction('convert', pluginId, inputFilePath))
      .then(converted => resp.status(200).json(converted))
      .catch(err => next(err));
  });
});

//can pass :projectId = 'convert' to just convert genbank file directly, and not write to memory
router.post('/:pluginId/:projectId?', jsonParser, (req, resp, next) => {
  const { pluginId, projectId } = req.params;

  // save incoming file then read back the string data.
  // If these files turn out to be large we could modify the import functions to take
  // file names instead but for now, in memory is fine.
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    fileSystem.fileRead(files.data.path, false)
      .then((data) => {
        const inputFilePath = filePaths.createStorageUrl(pluginId, md5(data));
        fileSystem.fileWrite(inputFilePath, data, false)
          .then((err) => {
            return importProject(pluginId, inputFilePath)
              .then((roll) => {
                if (!projectId) {
                  rollup.writeProjectRollup(roll.project.id, roll, req.user.uuid)
                    .then(() => persistence.projectSave(roll.project.id, req.user.uuid))
                    .then(commit => resp.status(200).json({ ProjectId: roll.project.id }))
                    .catch(err => {
                      resp.status(400).send(err);
                    });
                } else {
                  rollup.getProjectRollup(projectId)
                    .then((existingRoll) => {
                      existingRoll.project.components = existingRoll.project.components.concat(roll.project.components);
                      existingRoll.blocks = existingRoll.blocks.concat(roll.blocks);
                      rollup.writeProjectRollup(existingRoll.project.id, existingRoll, req.user.uuid)
                        .then(() => persistence.projectSave(existingRoll.project.id, req.user.uuid))
                        .then(commit => resp.status(200).json({ ProjectId: existingRoll.project.id }))
                        .catch(err => {
                          resp.status(400).send(err);
                        });
                    })
                    .catch(err => {
                      resp.status(400).send(err);
                    });
                }
              })
              .catch(err => {
                resp.status(500).send(err);
              });
          });
      });
  });
});

//export these functions for testing purpose
router.importProject = importProject;

module.exports = router;
