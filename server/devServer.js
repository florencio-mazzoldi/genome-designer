import path from 'path';
import express from 'express';
import webpack from 'webpack';
import morgan from 'morgan';
import config from './../webpack.config.dev.js';
import apiRouter from './api/index';

import { validateLoginCredentials } from './utils/authentication';
import { errorInvalidSessionKey } from './utils/errors';

const DEFAULT_PORT = 3000;
const port = parseInt(process.argv[2], 10) || process.env.PORT || DEFAULT_PORT;
const hostname = '0.0.0.0';

const app = express();
const compiler = webpack(config);
const extRouter = require('../extensions/compute/api');

//import and export file formats
const importRouter = require('../extensions/convert/import');
const exportRouter = require('../extensions/convert/export');
const searchRouter = require('../extensions/search/search');

//logging middleware
app.use(morgan('dev'));

// Register Hotloading Middleware
// ----------------------------------------------------

app.use(require('webpack-dev-middleware')(compiler, {
  noInfo: true,
  publicPath: config.output.publicPath,
}));

app.use(require('webpack-hot-middleware')(compiler));


// Register API middleware
// ----------------------------------------------------

app.use('/login', (req, res) => {
  const { user, password } = req.query;
  validateLoginCredentials(user, password)
    .then(key => {
      res.json({'sessionkey': key});
    })
    .catch(err => {
      res.status(403).send(errorInvalidSessionKey);
    });
});

app.use('/api', apiRouter);
app.use('/compute', extRouter);
app.use('/import', importRouter);
app.use('/export', exportRouter);
app.use('/search', searchRouter);

// Register Client Requests, delegate routing to client
// ----------------------------------------------------

//Static Files
app.use('/images', express.static(path.join(__dirname, '../src/images')));

//so that any routing is delegated to the client
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/index.html'));
});

app.listen(port, hostname, (err) => {
  if (err) {
    console.log(err);
    return;
  }

  console.log('Building, will serve at http://' + hostname + ':' + port);
});

export default app;
