const fs = require('fs');
const exec = require('promised-exec');
const yaml = require('yamljs');
const mkpath = require('mkpath');
const readMultipleFiles = require('read-multiple-files');

export const getNodeDir = (id) => {
  return process.cwd() + '/extensions/compute/' + id;
};

/**
* @description Run the given command
* @returns Promise
*/
export const runCmd = (id, cmd) => {
  const dir = getNodeDir(id);

  const fullCmd = 'cd ' + dir + '; ' + cmd;

  return exec(fullCmd).then((error, stdout, stderr) => {
    return Promise.resolve(true);
  }).catch(err => {
    //apparently, even warning messages trigger this section of exec, so it 'usually' ok
    return Promise.resolve(true);
  });
};

/**
* @description Copy the inputs from the given JSON, run the node command,
and return the output strings or file names
* @returns
*/
export const runNode = (id, fileUrls, header) => {
  const outputFiles = {};
  const outputFileNames = [];
  const inputFileWrites = [];

  function readYaml(file) {
    return new Promise( (resolve, reject) => {
      fs.readFile(file, 'utf8', (err, filestr) => {
        if (err) {
          reject('Workflow.yaml could not be read: ' + err);
        } else {
          resolve( yaml.parse(filestr) );
        }
      });
    });
  }

  function createInputOutputFolders(dir) {
    let inputDirWrites = [];
    inputDirWrites = [
      new Promise((resolve, reject) => {
        mkpath(dir + 'inputs/', (err) => {
          if (err) {
            reject(err.message);
          } else {
            resolve(dir + 'inputs/');
          }
        });
      }),
      new Promise((resolve, reject) => {
        mkpath(dir + 'outputs/', (err) => {
          if (err) {
            reject(err.message);
          } else {
            resolve(dir + 'outputs/');
          }
        });
      }),
    ];

    return Promise.all(inputDirWrites);
  }

  function writeInputFiles(dir, inputs, outputs) {
    inputFileWrites.push(
      new Promise((resolve, reject) => {
        fs.writeFile( dir + 'inputs/headers', JSON.stringify(header), 'utf8', err => {
          if (err) {
            reject(err.message);
          } else {
            resolve(dir + 'inputs/headers');
          }
        }); //fs.writeFile
      })
    );

    function copyToInputsFolder(inputFile, inputKey, resolve, reject) {
      fs.readFile(inputFile, 'utf8', (err, contents) => {
        if (err) {
          reject(err.message);
        }
        fs.writeFile( dir + 'inputs/' + inputKey, contents, 'utf8', err => {
          if (err) {
            reject(err.message);
          } else {
            resolve(dir + 'inputs/' + inputKey);
          }
        }); //fs.writeFile
      }); //fs.readFile
    }

    inputs.forEach(inputItem => {
      const inputKey = inputItem.id;
      inputFileWrites.push(
        new Promise((resolve, reject) => {
          const inputFile = fileUrls[inputKey].replace('/api/file/', 'storage/');
          copyToInputsFolder(inputFile, inputKey, resolve, reject);
        })
      );
    });

    //outputs
    for (let i = 0; i < outputs.length; ++i) {
      outputFiles[ outputs[i].id ] = '';
      outputFileNames.push(dir + 'outputs/' + outputs[i].id);
    }
    return Promise.all(inputFileWrites);
  }

  function readOutputFiles(outputs) {
    return new Promise( (resolveRead, rejectRead) => {
      readMultipleFiles(outputFileNames, 'utf8', (err, buffers) => {
        if (err) {
          rejectRead('Output read error: ' + err);
        }
        //get values from files into object
        //TODO - select only json-suitable output fields
        const outputFileWrites = [];

        for (let i = 0; i < outputFileNames.length; ++i) {
          const outFile = fileUrls[outputs[i].id];
          const contents = buffers[i];

          //write all the output files
          outputFileWrites.push(
            new Promise((resolve, reject) => {
              if (outFile) {
                outputFiles[ outputs[i].id ] = outFile;
                const outFileTrue = outFile.replace('/api/file/', 'storage/');

                //create folder for outFile
                const path = outFileTrue.substring(0, outFileTrue.lastIndexOf('/') + 1);
                mkpath(path, (err) => {
                  if (err) {
                    reject(err.message);
                  }
                  fs.writeFile(outFileTrue, contents, 'utf8', err => {
                    if (err) {
                      reject(err.message);
                    } else {
                      resolve(outFileTrue);
                    }
                  }); //fs.writeFile
                }); //make path
              } else { //if not writing to output file, return in json
                outputFiles[ outputs[i].id ] = contents;
                resolve(contents);
              }
            })
          );
        }

        return Promise.all(outputFileWrites)
          .then(res => {
            resolveRead(res);
          }).
          catch(res => {
            rejectRead(res);
          });
      });
    });
  }

  let inputs;
  let outputs;
  let cmd;
  const dir = getNodeDir(id) + '/';

  return readYaml(dir + 'workflow.yaml')
  .then( data => {
    inputs = data.inputs;
    outputs = data.outputs;
    cmd = data.command;
    return createInputOutputFolders(dir);
  })
  .then( res => {
    return writeInputFiles(dir, inputs, outputs);
  })
  .then( res => {
    if (!res) {
      return Promise.reject('Input write error');
    }

    return runCmd(id, cmd);
  })
  .then( res => {
    return readOutputFiles(outputs);
  })
  .then( res => {
    return Promise.resolve(outputFiles);
  })
  .catch( err => {
    return Promise.reject(err);
  });
};
