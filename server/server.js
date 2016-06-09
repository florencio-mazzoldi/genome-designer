import path from 'path';
import fs from 'fs';
import express from 'express';
import morgan from 'morgan';

import dataRouter from './data/index';
import orderRouter from './order/index';
import fileRouter from './file/index';
import extensionsRouter from './extensions/index';
import bodyParser from 'body-parser';
import errorHandlingMiddleware from './utils/errorHandlingMiddleware';

import importRouter from '../plugins/convert/import';
import exportRouter from '../plugins/convert/export';

const DEFAULT_PORT = 3000;
const port = parseInt(process.argv[2], 10) || process.env.PORT || DEFAULT_PORT;
const hostname = '0.0.0.0';

//file paths depending on if building or not
//note that currently, you basically need to use npm run start in order to serve the client bundle + webpack middleware
const createBuildPath = (isBuild, notBuild = isBuild) => {
  return path.join(__dirname, (process.env.BUILD ? isBuild : notBuild));
};
const pathContent = createBuildPath('content', '../src/content');
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
app.use(morgan('dev', {
  skip: (req, res) => req.path.indexOf('browser-sync') >= 0 || req.path.indexOf('__webpack') >= 0,
}));

// view engine setup
app.set('views', pathContent);
app.set('view engine', 'jade');

// Register API middleware
// ----------------------------------------------------

// insert some form of user authentication
// the auth routes are currently called from the client and expect JSON responses
if (process.env.BIO_NANO_AUTH) {
  console.log("real user authentication enabled");
  var initAuthMiddleware = require('bio-user-platform').initAuthMiddleware;

  // TODO load a custom configuration here
  // disable all redirects
  var authConfig = {
    logoutLanding: false,
    loginLanding: false,
    loginFailure: false,
    resetForm: "/homepage/reset",
    apiEndPoint: process.env.API_END_POINT || "http://localhost:8080/api",
  };
  app.use(initAuthMiddleware(authConfig));
} else {
  app.use(require('cookie-parser')());
  // import the mocked auth routes
  app.use(require('./auth/local').mockUser);
  const authRouter = require('./auth/local').router;
  app.use('/auth', authRouter);
}

//primary routes
app.use('/data', dataRouter);
app.use('/order', orderRouter);
app.use('/file', fileRouter);
app.use('/extensions', extensionsRouter);

//extensions
app.use('/import', importRouter);
app.use('/export', exportRouter);

// Register Client Requests, delegate routing to client
// ----------------------------------------------------

//Static Files
app.use(express.static(pathPublic));
app.use('/images', express.static(pathImages));

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
    res.render(path.join(pathContent + '/index.jade'), Object.assign({}, req.user, discourse));
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
      host: 'localhost',
      exclusive: true,
    });
};

const startServer = () => app.listen(port, hostname, (err) => {
  if (err) {
    console.log('error listening!', err.stack);
    return;
  }

  /* eslint-disable no-console */
  console.log(`Server listening at http://${hostname}:${port}/`);
});

//start the server by default, if port is not taken
isPortFree(port, (err, free) => free && startServer());

export default app;
