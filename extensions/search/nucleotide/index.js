const exec = require('child_process').exec;
const fs = require('fs');
const uuid = require('node-uuid');

module.exports = exports = {};
const dbName = 'nucleotide';

exports.search = function search(searchString, maxResults = 10) {
  const promise = new Promise((resolve, reject) => {
    const outputFile = 'temp-' + uuid.v4();
    function readOutput() {
      fs.readFile(outputFile, 'utf8', (err, data) => {
        fs.unlink(outputFile);
        if (err) {
          reject(err.message);
          return;
        }
        resolve(JSON.parse(data));
      });
    }

    exec('python extensions/search/nucleotide/search.py ' + dbName + ' "' + searchString + '" ' + maxResults + ' ' + outputFile, (err, stdout) => {
      if (err) {
        reject(err.message);
        return;
      }
      readOutput();
    });
  });

  return promise;
};

exports.exportProject = function exportProject(proj, blocks) {
};

exports.importProject = function importProject(gbstr) {
};
