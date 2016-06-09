import { exec } from 'child_process';
import * as filePaths from '../utils/filePaths';
import * as fileSystem from '../utils/fileSystem';
import { errorNoPermission, errorDoesNotExist } from '../utils/errors';
import { id as idRegex } from '../../src/utils/regex';

export const createProjectPermissions = (projectId, userId) => {
  const projectPermissionsPath = filePaths.createProjectPermissionsPath(projectId);
  const contents = [userId];
  return fileSystem.fileWrite(projectPermissionsPath, contents);
};

//check access to a particular project
export const checkProjectAccess = (projectId, userId, projectMustExist = false) => {
  const projectPermissionsPath = filePaths.createProjectPermissionsPath(projectId);
  return fileSystem.fileRead(projectPermissionsPath)
    .then(contents => {
      if (contents.indexOf(userId) < 0) {
        return Promise.reject(errorNoPermission);
      }
      return true;
    })
    .catch(err => {
      if (err === errorDoesNotExist && !projectMustExist) {
        return Promise.resolve(true);
      }
      return Promise.reject(err);
    });
};

export const permissionsMiddleware = (req, res, next) => {
  const { projectId, user } = req;

  if (!user) {
    console.error('no user attached by auth middleware!', req.url);
    next('[permissionsMiddleware] user not attached to request by middleware');
    return;
  }

  if (!user.uuid) next('[permissionsMiddleware] no user.uuid present on request object');
  if (!projectId) next('[permissionsMiddleware] projectId not found on route request');
  if (!idRegex().test(projectId)) next('[permissionsMiddleware] projectId is not valid, got ' + projectId);

  checkProjectAccess(projectId, user.uuid)
    .then(() => next())
    .catch((err) => {
      if (err === errorNoPermission) {
        return res.status(403).send(`User ${user.email} does not have access to project ${projectId}`);
      }
      console.log('permissions error:', err);
      console.log(err.stack);
      res.status(500).send('error checking project access');
    });
};
