import invariant from 'invariant';

//track information about saving e.g. time
const saveState = new Map();

export const noteSave = (projectId, sha = null) => {
  invariant(projectId, 'must pass project ID');
  const lastState = saveState.get(projectId) || {};

  saveState.set(projectId, Object.assign(lastState, {
    lastSaved: +Date.now(),
    sha,
  }));
};

export const noteFailure = (projectId, err) => {
  invariant(projectId, 'must pass project ID');
  const lastState = saveState.get(projectId) || {};

  saveState.set(projectId, Object.assign(lastState, {
    lastFailed: +Date.now(),
    lastErr: err,
  }));
};

export const getProjectSaveState = (projectId) => {
  invariant(projectId, 'must pass project ID');
  const state = saveState.get(projectId) || {};
  const { lastSaved = 0, lastFailed = 0, sha = null, lastErr = null } = state;

  return {
    lastSaved,
    sha,
    lastFailed,
    lastErr,
    saveDelta: +Date.now() - lastSaved,
    saveSuccessful: lastFailed <= lastSaved,
  };
};
