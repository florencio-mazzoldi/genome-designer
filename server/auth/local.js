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
/**
 * Mock authentication for local development, or when the bionano-auth package is not in use.
 *
 * The default user is used for all requests, and its ID is used for all permissions / keying.
 *
 * Exposes a few routes but does not exhaustively cover the bionano-auth router.
 *
 * This user is used in unit testing.
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { testUserId } from '../../test/constants';
import bodyParser from 'body-parser';
import validEmail from 'valid-email';
import checkUserSetup from '../onboarding/userSetup';
import userConfigDefaults from '../onboarding/userConfigDefaults';
import { userConfigKey } from '../user/userConstants';
import { getConfigFromUser, mergeConfigToUserData } from '../user/utils';

//super basic session handling
const requireLogin = Boolean(process.env.REQUIRELOGIN);
const generateMockCookieValue = () => requireLogin ?
  `cookie${Math.floor(Math.random() * 10000000)}` :
  'mock-auth';
let currentCookie = generateMockCookieValue();

export const router = express.Router(); //eslint-disable-line new-cap
const jsonParser = bodyParser.json();

const defaultUserForcedFields = {
  uuid: testUserId,
};

const configForDefaultUser = Object.assign({}, userConfigDefaults);
const userData = Object.assign({}, { [userConfigKey]: configForDefaultUser });

//save user in a temporary file, so it is not cleared across server-reloads
const userConfigTempPath = path.resolve(__dirname, 'temp.config.json');
let loadedUser = {};
try {
  const fileText = fs.readFileSync(userConfigTempPath, 'utf8');
  loadedUser = JSON.parse(fileText);
} catch (err) {
  //no need to report error...
}

//this object will get updated as /register and /update the user (one user in local auth)
export const defaultUser = Object.assign(
  {
    email: 'developer@localhost',
    firstName: 'Dev',
    lastName: 'Eloper',
  },
  { data: userData },
  loadedUser,
  defaultUserForcedFields
);

// @ req.user.data[userConfigKey]

//basic auth routes

router.post('/login', (req, res) => {
  currentCookie = generateMockCookieValue();
  res.cookie('sess', currentCookie);
  res.statusCode = 200;
  res.send(defaultUser);
  return res.end();
});

router.get('/current-user', (req, res) => {
  if (req.cookies.sess === null) {
    console.log('didnt find the session cookie; check the mock login route.');
    return res.status(401).end();
  }

  if (req.user === null) {
    console.log('auth middleware error; req.user is null');
    res.statusCode = 500;
    return res.end();
  }

  res.statusCode = 200;
  res.send(req.user);
  return res.end();
});

router.get('/logout', (req, res) => {
  currentCookie = null;
  res.clearCookie('sess');
  res.status(200).send();
});

// simulate saving to the user object.
// allow writing user config, but not ID etc.
// expects full user object to be posted
const handleUpdate = (req, res, next) => {
  const userInput = req.body;
  const inputConfig = getConfigFromUser(userInput);

  //merge deep here to match the auth platform
  const mappedUser = mergeConfigToUserData(userInput, inputConfig);

  //assign to the default user
  Object.assign(defaultUser, mappedUser, defaultUserForcedFields);

  console.log('[Local Auth - User Update]');
  fs.writeFileSync(userConfigTempPath, JSON.stringify(defaultUser, null, 2), 'utf8');

  res.json(defaultUser);
};

//we dont really do anything on register, but do need to handle it the same way as auth platform
// this route expects an email and password (fristname ,lastname, config), not the whole user.
const handleRegister = (req, res, next) => {
  const { email, password, firstName, lastName, data } = req.body;

  //basic checks, auth platform usually sends 400
  if (!email || !validEmail(email)) {
    res.status(400).json({ message: 'invalid email' });
  }
  if (!password || password.length < 6) {
    res.status(400).json({ message: 'invalid password' });
  }

  Object.assign(defaultUser, { email, firstName, lastName }, defaultUserForcedFields);
  if (data) {
    Object.assign(defaultUser, { data });
  }

  console.log('[Local Auth - User Register]');
  //console.log(JSON.stringify(defaultUser, null, 2));

  //if not logged in (requireLogin) then mockAuth won't setup user on register, so lets double check here (even though ID not changing)
  checkUserSetup(defaultUser).then(() => {
    currentCookie = generateMockCookieValue();
    res.cookie('sess', currentCookie);

    res.send(defaultUser);
  });
};

// register the new user
// POST config object (not user object)
//we aren't really creating a user - we are just updating the preferences of default user (since there is only one user in local auth)
router.post('/register', jsonParser, handleRegister);

// update user information
// POST user object
// for the moment, not actually persisted, just save for the session of the server (and there is only one user)
router.post('/update-all', jsonParser, handleUpdate);

// testing only

// route not present in auth module
router.get('/cookies', (req, res) => {
  if (req.cookies.sess) {
    return res.send(req.cookies.sess);
  }

  res.send(':(');
});

//todo - mock forgot-password and reset-password

//assign the user to the request, including their config
export const mockUser = (req, res, next) => {
  if (requireLogin !== true || req.cookies.sess === currentCookie) {
    Object.assign(req, { user: defaultUser });

    //stub the initial user setup here as well
    checkUserSetup({ uuid: defaultUser.uuid })
      .then(() => next());
  } else {
    next();
  }
};
