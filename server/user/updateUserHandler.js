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

import fetch from 'isomorphic-fetch';
import invariant from 'invariant';
import validEmail from 'valid-email';
import { INTERNAL_HOST, API_END_POINT } from '../urlConstants';
import userConfigDefaults from '../onboarding/userConfigDefaults';
import { pruneUserObject, validateConfig, updateUserAll, updateUserConfig, mergeConfigToUserData } from './utils';
import { headersPost } from '../../src/middleware/headers';

//todo - share fetch handling with config / register routes

//need error handling to handle them already registered
//note - expects JSON parser ahead of it
export function registrationHandler(req, res, next) {
  invariant(req.body && typeof req.body === 'object', 'must pass object to register handler, use json parser');
  const { user, config } = req.body;
  const { email, password, firstName, lastName } = user;

  //basic checks before we hand off to auth/register
  if (!email || !validEmail(email)) {
    return res.status(422).json({ message: 'invalid email' });
  }
  if (!password || password.length < 6) {
    return res.status(422).json({ message: 'invalid password' });
  }

  const mergedConfig = Object.assign({}, userConfigDefaults, config);

  try {
    validateConfig(mergedConfig);
  } catch (err) {
    console.log('[User Register] Error in input config');
    console.log(err);
    console.log(err.stack);
    return res.status(422).send({ err });
  }

  const mappedUser = mergeConfigToUserData({
    email,
    password,
    firstName,
    lastName,
  }, mergedConfig);

  //regardless whether local auth or real auth (it is mounted appropriately at /auth), we want to hit this route
  const url = INTERNAL_HOST + '/auth/register';

  return fetch(url, headersPost(JSON.stringify(mappedUser)))
    .then(resp => {
      //re-assign cookies from platform authentication
      const cookies = resp.headers.getAll('set-cookie');
      cookies.forEach(cookie => {
        res.set('set-cookie', cookie);
      });

      return resp.json();
    })
    .then(userPayload => {
      //console.log('userPayload');
      //console.log(userPayload);

      if (!!userPayload.message) {
        return Promise.reject(userPayload);
      }

      const pruned = pruneUserObject(userPayload);

      //console.log('sending pruned');
      //console.log(pruned);

      res.json(pruned);
    })
    .catch(err => {
      console.log('[User Register] got error registering');
      console.log(req.body);
      console.log(err);
      console.log(err.stack);
      res.status(500).json({ err });
    });
}

export function loginHandler(req, res, next) {
  invariant(req.body && typeof req.body === 'object', 'must pass object to login handler, use json parser');
  const { email, password } = req.body;

  console.log(email, password);

  //basic checks before we hand off to auth/register
  if (!email || !validEmail(email)) {
    return res.status(422).json({ message: 'invalid email' });
  }
  if (!password || password.length < 6) {
    return res.status(422).json({ message: 'invalid password' });
  }

  //regardless whether local auth or real auth (it is mounted appropriately at /auth), we want to hit this route
  const url = INTERNAL_HOST + '/auth/login';

  console.log('hit login');
  console.log(email, password, url);

  return fetch(url, headersPost(JSON.stringify(req.body)))
    .then(resp => {
      //re-assign cookies from platform authentication
      const cookies = resp.headers.getAll('set-cookie');
      cookies.forEach(cookie => {
        res.set('set-cookie', cookie);
      });

      return resp.json();
    })
    .then(userPayload => {
      console.log('userPayload');
      console.log(userPayload);

      if (!!userPayload.message) {
        return Promise.reject(userPayload);
      }

      const pruned = pruneUserObject(userPayload);

      //console.log('sending pruned');
      //console.log(pruned);

      res.json(pruned);
    })
    .catch(err => {
      console.log('[User Login] got error logging in');
      console.log(req.body);
      console.log(err);
      console.log(err.stack);
      res.status(500).json({ err });
    });
}

//parameterized route handler for setting user config
//expects req.user and req.config / req.userPatch to be set
export default function updateUserHandler({ updateWholeUser = false } = {}) {
  const wholeUser = updateWholeUser === true;

  return (req, res, next) => {
    const { user: userInput, config: configInput, userPatch } = req;

    //console.log(userInput, userPatch, configInput);

    if (!userInput) next('req.user must be set');
    if (wholeUser && !userPatch) next('if updating user, set req.userPatch');
    if (!wholeUser && !configInput) next('if updating config, set req.config');

    let user = userInput;

    try {
      if (wholeUser) {
        user = updateUserAll(userInput, userPatch);
      } else {
        user = updateUserConfig(userInput, configInput);
      }
    } catch (err) {
      console.log('[User Config Handler] Error Updating config');
      console.log(err);
      console.log(err.stack);
      return res.status(422).json({ err });
    }

    //console.log('USER CONFIG HANDLER');
    //console.log(user, userInput, configInput, userPatch);

    //to update user, issues with setting cookies as auth and making a new fetch, so call user update function
    //might want to abstract to same across local + real auth
    if (process.env.BIO_NANO_AUTH) {
      const userPromises = require('bio-user-platform').userPromises({
        apiEndPoint: API_END_POINT,
      });

      return userPromises.update(user)
        .then(updatedUser => {
          const pruned = pruneUserObject(updatedUser);
          const toSend = wholeUser ? pruned : pruned.config;
          res.json(toSend);
        })
        .catch(err => {
          console.log('[User Config Handler] error setting user config');
          console.log(err);
          res.status(501).json({ err });
        });
    }

    // otherwise, delegate to auth routes
    // Real auth - dont need to worry about passing cookies on fetch, since registering (not authenticated)
    // local auth - just call our mock routes
    const url = INTERNAL_HOST + '/auth/update-all';
    return fetch(url, headersPost(JSON.stringify(user)))
      .then(resp => {
        //re-assign cookies from platform authentication
        const cookies = resp.headers.getAll('set-cookie');
        cookies.forEach(cookie => {
          res.set('set-cookie', cookie);
        });

        return resp.json();
      })
      .then(userPayload => {
        //console.log('userPayload');
        //console.log(userPayload);

        if (!!userPayload.message) {
          return Promise.reject(userPayload);
        }

        const pruned = pruneUserObject(userPayload);
        const toSend = wholeUser ? pruned : pruned.config;

        //console.log('sending pruned');
        //console.log(toSend);

        res.json(toSend);
      })
      .catch(err => {
        console.log('[User Config Handler] got error setting user config');
        console.log(err);
        console.log(err.stack);
        res.status(500).json({ err });
      });
  };
}
