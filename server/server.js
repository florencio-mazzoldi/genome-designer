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
import path from 'path';
import fs from 'fs';
import express from 'express';
import morgan from 'morgan';

import { registrationHandler } from './user/updateUserHandler';
import userRouter from './user/userRouter';
import dataRouter from './data/index';
import orderRouter from './order/index';
import fileRouter from './file/index';
import extensionsRouter from './extensions/index';
import reportRouter from './report/index';
import bodyParser from 'body-parser';
import errorHandlingMiddleware from './utils/errorHandlingMiddleware';
import checkUserSetup from './onboarding/userSetup';
import { pruneUserObject } from './user/utils';

import { HOST_PORT, HOST_NAME, API_END_POINT } from './urlConstants';

//file paths depending on if building or not
//note that currently, you basically need to use npm run start in order to serve the client bundle + webpack middleware
const createBuildPath = (isBuild, notBuild = isBuild) => {
  return path.join(__dirname, (process.env.BUILD ? isBuild : notBuild));
};
const pathContent = createBuildPath('content', '../src/content');
const pathDocs = createBuildPath('jsdoc', '../docs/jsdoc/genetic-constructor/0.5.0');
const pathImages = createBuildPath('images', '../src/images');
const pathPublic = createBuildPath('public', '../src/public');
const pathClientBundle = createBuildPath('client.js', '../build/client.js');

//create server app
const app = express();

//use large body limit at root so that 100kb default doesnt propagate / block downstream
app.use(bodyParser.json({
  limit: '50mb',
  strict: false,
}));

app.use(errorHandlingMiddleware);

//HTTP logging middleware
const logLevel = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logLevel, {
  skip: (req, res) => {
    if (req.path.indexOf('browser-sync') >= 0 || req.path.indexOf('__webpack') >= 0) {
      return true;
    }
    if (process.env.NODE_ENV === 'test') {
      return true;
    }
    return false;
  },
}));

// view engine setup
app.set('views', pathContent);
app.set('view engine', 'pug');

// Register API middleware
// ----------------------------------------------------

const onLoginHandler = (req, res, next) => {
  return checkUserSetup(req.user)
    .then((projectId) => {
      //note this expects an abnormal return of req and res to the next function
      return next(req, res);
    })
    .catch(err => {
      console.log(err);
      console.log(err.stack);
      res.status(500).end();
    });
};

// insert some form of user authentication
// the auth routes are currently called from the client and expect JSON responses
if (process.env.BIO_NANO_AUTH) {
  console.log('real user authentication enabled');
  const initAuthMiddleware = require('bio-user-platform').initAuthMiddleware;

  const authConfig = {
    logoutLanding: false,
    loginLanding: false,
    loginFailure: false,
    resetForm: '/homepage/reset',
    apiEndPoint: API_END_POINT,
    onLogin: onLoginHandler,
    registerRedirect: false,
  };
  app.use(initAuthMiddleware(authConfig));
} else {
  app.use(require('cookie-parser')());
  // import the mocked auth routes
  app.use(require('./auth/local').mockUser);
  const authRouter = require('./auth/local').router;
  app.use('/auth', authRouter);
}

//expose our own register route to handle custom onboarding
app.post('/register', registrationHandler);
app.use('/user', userRouter);

//primary routes
app.use('/data', dataRouter);
app.use('/order', orderRouter);
app.use('/file', fileRouter);
app.use('/extensions', extensionsRouter);
app.use('/report', reportRouter);

// Register Client Requests, delegate routing to client
// ----------------------------------------------------

//Static Files
app.use(express.static(pathPublic));
app.use('/images', express.static(pathImages));
app.use('/help/docs', express.static(pathDocs));

app.get('/version', (req, res) => {
  try {
    //this is only relevant when the server builds, so can assume always at same path relative to __dirname
    const version = fs.readFileSync(path.join(__dirname, '../VERSION'));
    res.send(version);
  } catch (ignored) {
    res.send('Missing VERSION file');
  }
});

app.get('*', (req, res) => {
  if (req.url.indexOf('client.js') >= 0) {
    //should only hit this when proxy is not set up (i.e. not in development)
    res.sendFile(pathClientBundle);
  } else {
    // setup user properties and discourse base url to flash to client
    const discourse = {
      discourseDomain: process.env.BNR_ENV_URL_SUFFIX || `https://forum.bionano.autodesk.com`,
    };
    //so that any routing is delegated to the client
    const prunedUser = pruneUserObject(req.user);
    const config = prunedUser.config ? JSON.stringify(prunedUser.config) : '{}';
    const user = Object.assign({}, prunedUser, { config });
    res.render(path.join(pathContent + '/index.pug'), Object.assign({}, user, discourse, {
      productionEnvironment: process.env.NODE_ENV === 'production',
    }));
  }
});

/*** running ***/

//i have no idea why, but sometimes the server tries to build when the port is already in use, so lets just check if port is in use and if it is, then dont try to listen on it.
const isPortFree = (port, cb) => {
  const net = require('net');
  const tester = net.createServer()
    .once('error', (err) => {
      if (err.code !== 'EADDRINUSE') {
        return cb(err, false);
      }
      cb(null, false);
    })
    .once('listening', () => {
      tester.once('close', () => {
        cb(null, true);
      })
        .close();
    })
    .listen({
      port,
      host: HOST_NAME,
      exclusive: true,
    });
};

const startServer = () => app.listen(HOST_PORT, HOST_NAME, (err) => {
  if (err) {
    console.log('error listening!', err.stack);
    return;
  }

  /* eslint-disable no-console */
  console.log(`Server listening at http://${HOST_NAME}:${HOST_PORT}/`);
});

//start the server by default, if port is not taken
isPortFree(HOST_PORT, (err, free) => free && startServer());

export default app;
