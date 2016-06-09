import nodegit from 'nodegit';
import invariant from 'invariant';
import path from 'path';
import { errorVersioningSystem, errorDoesNotExist } from '../utils/errors';

//this should receieve an absolute path. want to avoid using __dirname or $builddir for build consistency. use module filePaths.
const makePath = (fsPath) => {
  return path.resolve(fsPath);
};

const describeCommit = (commit) => ({
  sha: commit.sha(),
  author: commit.author().name(),
  date: commit.date(),
  message: commit.message(),
  time: commit.timeMs(),
});

export const initialize = (path, userId = 'Author') => {
  const repoPath = makePath(path);
  return nodegit.Repository.init(repoPath, 0)
    .then(repo => {
      return repo.openIndex()
        .then(index => {
          index.read(1); //what is this? was in example

          //todo - add an initial file

          return index.addAll()
            .then(() => index.write())
            .then(() => index.writeTree())
            .then(oid => {
              const author = nodegit.Signature.now(userId, 'email');
              const committer = author;
              return repo.createCommit('HEAD', author, committer, 'Initialize', oid, []);
            });
        });
    })
    .then(() => repoPath)
    .catch((err) => Promise.reject(errorVersioningSystem));
};

export const isInitialized = (path) => {
  return nodegit.Repository.open(makePath(path))
    .then(repo => {
      return true;
    })
    .catch(() => {
      return false;
    });
};

//todo - prevent conflicts -- shouldn't be an issue with only one branch
//todo - ensure HEAD is latest on master
export const commit = (path, message = 'commit message', userId = 'Author') => {
  const repoPath = makePath(path);
  return nodegit.Repository.open(repoPath)
    .then(repo => {
      return repo.openIndex()
        .then(index => {
          index.read(1); //what is this? was in example

          return index.addAll()
            .then(() => index.write())
            .then(() => index.writeTree())
            .then(oid => {
              return nodegit.Reference.nameToId(repo, 'HEAD')
                .then((head) => repo.getCommit(head))
                .then(parent => {
                  const author = nodegit.Signature.now(userId, 'email');
                  const committer = author;
                  return repo.createCommit('HEAD', author, committer, message, oid, [parent]);
                });
            });
        });
    })
    .then((commitId) => '' + commitId) //just being explicit what is returned
    .catch((err) => {
      console.error(err);
      return Promise.reject(errorVersioningSystem);
    });
};

export const getCommit = (path, sha) => {
  invariant(sha, 'SHA is required');
  return nodegit.Repository.open(makePath(path))
    .then(repo => {
      return repo.getCommit(sha);
    })
    .then(commit => describeCommit(commit))
    .catch((err) => {
      console.error(err);
      return Promise.reject(errorVersioningSystem);
    });
};

/**
 * @description Git commit log of repository
 * @param path
 * @param filter {Function=} function to filter commits, passed commit as single argument. Default is `() => true`
 * @returns {Promise} Array of commits, in reverse chronological order. Each is an object with fields described in function.
 */
export const log = (path, filter = () => true) => {
  invariant(typeof filter === 'function', 'Must pass function to filter commits');

  return nodegit.Repository.open(makePath(path))
    .then(repo => {
      return repo.getMasterCommit();
    })
    .then(firstCommitOnMaster => {
      return new Promise((resolve, reject) => {
        const history = firstCommitOnMaster.history(nodegit.Revwalk.SORT.Time);
        const commits = [];

        history.on('commit', (commit) => {
          filter(commit) && commits.push(commit);
        });

        history.on('end', () => {
          resolve(commits.map(describeCommit));
        });

        history.start();
      });
    })
    .catch(err => Promise.reject(errorVersioningSystem));
};

export const versionExists = (path, sha = 'HEAD', file) => {
  return nodegit.Repository.open(makePath(path))
    .then(repo => {
      if (!sha || sha === 'HEAD') {
        return repo.getMasterCommit();
      }
      return repo.getCommit(sha);
    })
    .then(commit => {
      //just verify a commit is available
      if (!file) {
        return Promise.resolve(sha);
      }

      return commit.getEntry(file)
        .then(entry => Promise.resolve(true))
        .catch((err) => Promise.reject(errorDoesNotExist)); //todo - more explicit check that this correct
    })
    .catch(err => {
      if (err.message.indexOf('Unable to parse OID') >= 0) {
        return Promise.reject(errorDoesNotExist);
      } else if (err.message.indexOf('no match for id') >= 0) {
        return Promise.reject(errorDoesNotExist);
      }
      return Promise.reject(errorVersioningSystem);
    });
};

/**
 * @description Checks out file at a specific version
 * @param path {String} path to repo
 * @param file {String} path, relative to repo path
 * @param sha Defaults to HEAD
 * @returns {Promise<String>} String of file
 */
export const checkout = (path, file, sha = 'HEAD') => {
  invariant(file, 'file path is required');

  return nodegit.Repository.open(makePath(path))
    .then(repo => {
      if (!sha || sha === 'HEAD') {
        return repo.getMasterCommit();
      }
      return repo.getCommit(sha);
    })
    .catch(err => Promise.reject(errorDoesNotExist))
    .then(commit => {
      return commit.getEntry(file)
        .then(entry => {
          return entry.getBlob()
            .then(blob => {
              //console.log('got blob', entry.filename(), entry.sha(), blob.rawsize());
              return blob.toString();
            });
        });
    })
    .catch(err => {
      //if got the error of the commit not existing, lets just re-reject with it
      if (err === errorDoesNotExist) {
        return Promise.reject(errorDoesNotExist);
      }
      return Promise.reject(errorVersioningSystem);
    });
};

//todo - required once support versioning API
//export const promote = (path, sha, file) => {}
