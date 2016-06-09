import * as filePaths from '../../../server/utils/filePaths';
import * as fileSystem from '../../../server/utils/fileSystem';
import path from 'path';
import Project from '../../../src/models/Project';
import Block from '../../../src/models/Block';
import merge from 'lodash.merge';
import _ from 'lodash';
import BlockSchema from '../../../src/schemas/Block';
import ProjectSchema from '../../../src/schemas/Project';
import md5 from 'md5';
import * as persistence from '../../../server/data/persistence';
import formidable from 'formidable';

import {chunk, cloneDeep} from 'lodash';

const exec = require('child_process').exec;
const uuid = require('node-uuid');

//////////////////////////////////////////////////////////////
// COMMON
//////////////////////////////////////////////////////////////
const createRandomStorageFile = () => filePaths.createStorageUrl('temp/' + uuid.v4());

// Run an external command and return the data in the specified output file
const runCommand = (command, inputFile, outputFile) => {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout) => {
      if (err) {
        console.log('Running command came back with error', err);
        reject(err);
      }
      else resolve(stdout);
    });
  })
  .then(() => fileSystem.fileRead(outputFile, false));
};

//////////////////////////////////////////////////////////////
// ROUTINES USED BY IMPORT
//////////////////////////////////////////////////////////////
// Create a GD block given a structure coming from Python
// Also saves the sequence and stores the MD5 in the block
const createBlockStructureAndSaveSequence = (block, sourceId) => {
  // generate a valid block scaffold. This is similar to calling new Block(),
  // but a bit more light weight and easier to work with (models are frozen so you cannot edit them)
  const scaffold = BlockSchema.scaffold();
  const fileName = /[^/]*$/.exec(sourceId)[0];
  //get the sequence md5
  const sequenceMd5 = block.sequence.sequence ? md5(block.sequence.sequence) : '';

  //reassign values
  const toMerge = {
    metadata: block.metadata,
    sequence: {
      md5: sequenceMd5,
      length: block.sequence.sequence.length,
    },
    source: {
      source: 'csv',
      id: fileName,
    },
    rules: block.rules,
  };

  //be sure to pass in empty project first, so you arent overwriting scaffold each time
  const outputBlock = merge({}, scaffold, toMerge);

  //promise, for writing sequence if we have one, or just immediately resolve if we dont
  const sequencePromise = sequenceMd5 ?
    persistence.sequenceWrite(sequenceMd5, block.sequence.sequence) :
    Promise.resolve();

  //return promise which will resolve with block once done
  return sequencePromise.then(() => ({
    block: outputBlock,
    id: outputBlock.id,
    oldId: block.id,
    children: block.components,
  }));
};

// Creates a structure of GD blocks given the structure coming from Python
// We chunk here because otherwise the OS complains of too many open files
const createAllBlocks = (outputBlocks, sourceId) => {
  const batches = chunk(Object.keys(outputBlocks), 200);

  return batches.reduce((acc, batch) => {
    return acc.then((allBlocks) => {
      return Promise.all(batch.map(block_id => createBlockStructureAndSaveSequence(outputBlocks[block_id], sourceId)))
        .then((createdBatch) => {
          return allBlocks.concat(createdBatch);
        });
    });
  }, Promise.resolve([]));
};

// Given an old ID, returns the new ID for a block
const getNewId = (blockStructureArray, oldId) => {
  for (let i = 0, len = blockStructureArray.length; i < len; i++) {
    if (blockStructureArray[i].oldId === oldId) {
      return blockStructureArray[i].id;
    }
  }
};

// Takes a block structure and sets up the hierarchy through GD ids.
// This is necessary because Python returns ids that are not produced by GD.
const remapHierarchy = (blockArray) => {
  return blockArray.map(blockStructure => {
    const newBlock = blockStructure.block;
    blockStructure.children.map(oldChildId => {
      const newid = getNewId(blockArray, oldChildId);
      newBlock.components.push(newid);
    });
    return new Block(newBlock);
  });
};

// Converts an input project structure (from Python) into GD format
const handleProject = (outputProject, rootBlockIds) => {
  //just get fields we want using destructuring and use them to merge
  const d = new Date();
  const projectName = 'CSV Import ' + d.toLocaleString();
  const { name } = projectName;

  return new Project(merge({}, ProjectSchema.scaffold(), {
    components: rootBlockIds,
    metadata: {
      name,
    },
  }));
};

// Reads a csv file and returns a project structure and all the blocks
// These return structures are NOT in GD format.
const readCsvFile = (inputFilePath) => {
  const outputFilePath = createRandomStorageFile();

  const cmd = `python ${path.resolve(__dirname, 'convert.py')} from_csv ${inputFilePath} ${outputFilePath}`;
  return runCommand(cmd, inputFilePath, outputFilePath)
    .then(resStr => {
      try {
        fileSystem.fileDelete(outputFilePath);
        const res = JSON.parse(resStr);
        return Promise.resolve(res);
      } catch (err) {
        console.log('Error processing the csv result: ', err);
        return Promise.reject(err);
      }
    })
    .catch(err => {
      fileSystem.fileDelete(outputFilePath);
      console.log('ERROR IN PYTHON');
      console.log(err);
      return Promise.reject(err);
    });
};

// Creates a rough project structure (not in GD format yet!) and a list of blocks from a csv file
const handleBlocks = (inputFilePath) => {
  return readCsvFile(inputFilePath)
    .then(result => {
      if (result && result.project && result.blocks &&
        result.project.components && result.project.components.length > 0) {
        return createAllBlocks(result.blocks, inputFilePath)
          .then(blocksWithOldIds => {
            const remappedBlocksArray = remapHierarchy(blocksWithOldIds);
            const newRootBlocks = result.project.components.map((oldBlockId) => {
              return getNewId(blocksWithOldIds, oldBlockId);
            });
            return {project: result.project, rootBlocks: newRootBlocks, blocks: remappedBlocksArray};
          });
      }
      else {
        return 'Error in the conversion: ' + result;
      }
    });
};

//////////////////////////////////////////////////////////////
// IMPORT
//////////////////////////////////////////////////////////////
// Import project and construct/s from csv
// Returns a project structure and the list of all blocks
export const importProject = (inputFilePath) => {
  return handleBlocks(inputFilePath)
    .then((result) => {
      if (_.isString(result)) {
        return result;
      }
      const resProject = handleProject(result.project, result.rootBlocks);

      //const outputFile = filePaths.createStorageUrl('imported_from_csv.json');
      //fileSystem.fileWrite(outputFile, {project: resProject, blocks: result.blocks});
      return {project: resProject, blocks: result.blocks};
    });
};

// Import only construct/s from csv
// Returns a list of block ids that represent the constructs, and the list of all blocks
export const importConstruct = (inputFilePath) => {
  return handleBlocks(inputFilePath)
    .then((rawProjectRootsAndBlocks) => {
      if (_.isString(rawProjectRootsAndBlocks)) {
        return rawProjectRootsAndBlocks;
      }
      return {roots: rawProjectRootsAndBlocks.rootBlocks, blocks: rawProjectRootsAndBlocks.blocks};
    });
};
