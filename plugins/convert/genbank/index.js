import * as fileSystem from '../../../server/utils/fileSystem';
import * as filePaths from '../../../server/utils/filePaths';
import path from 'path';
import Project from '../../../src/models/Project';
import Block from '../../../src/models/Block';
import merge from 'lodash.merge';
import _ from 'lodash';
import BlockDefinition from '../../../src/schemas/Block';
import ProjectDefinition from '../../../src/schemas/Project';
import * as persistence from '../../../server/data/persistence';
import md5 from 'md5';

import {chunk, cloneDeep} from 'lodash';

const exec = require('child_process').exec;
const uuid = require('node-uuid');

//////////////////////////////////////////////////////////////
// COMMON
//////////////////////////////////////////////////////////////
const createTempFilePath = () => filePaths.createStorageUrl('temp/' + uuid.v4());

// Run an external command and return the data in the specified output file
const runCommand = (command, inputFile, outputFile) => {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout) => {
      if (err) {
        console.log('ERROR!!!!!');
        console.log(err);
        reject(err);
      }
      else resolve(stdout);
    });
  })
  .then(() => fileSystem.fileRead(outputFile, false));
};

//////////////////////////////////////////////////////////////
// IMPORT
//////////////////////////////////////////////////////////////
// Create a GD block given a structure coming from Python
// Also saves the sequence and stores the MD5 in the block
const createBlockStructureAndSaveSequence = (block, sourceId) => {
  // generate a valid block scaffold. This is similar to calling new Block(),
  // but a bit more light weight and easier to work with (models are frozen so you cannot edit them)
  const scaffold = BlockDefinition.scaffold();
  const fileName = /[^/]*$/.exec(sourceId)[0];

  //get the sequence md5
  const sequenceMd5 = block.sequence.sequence ? md5(block.sequence.sequence) : '';

  //reassign values
  const toMerge = {
    metadata: block.metadata,
    sequence: {
      md5: sequenceMd5,
      length: block.sequence.length,
      annotations: block.sequence.annotations, //you will likely have to remap these...
    },
    source: {
      id: fileName,
      source: 'genbank',
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
  const batches = chunk(Object.keys(outputBlocks), 50);

  return batches.reduce((acc, batch) => {
    return acc.then((allBlocks) => {
      return Promise.all(batch.map(block => createBlockStructureAndSaveSequence(outputBlocks[block], sourceId)))
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
  const { name, description } = outputProject;

  return new Project(merge({}, ProjectDefinition.scaffold(), {
    components: rootBlockIds,
    metadata: {
      name,
      description,
    },
  }));
};

// Reads a genbank file and returns a project structure and all the blocks
// These return structures are NOT in GD format.
const readGenbankFile = (inputFilePath) => {
  const outputFilePath = createTempFilePath();

  const cmd = `python ${path.resolve(__dirname, 'convert.py')} from_genbank ${inputFilePath} ${outputFilePath}`;

  return runCommand(cmd, inputFilePath, outputFilePath)
    .then(resStr => {
      fileSystem.fileDelete(outputFilePath);
      try {
        const res = JSON.parse(resStr);
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    })
    .catch(err => {
      console.log('ERROR IN PYTHON');
      console.log(err);
      fileSystem.fileDelete(outputFilePath);
      return Promise.reject(err);
    });
};

// Creates a rough project structure (not in GD format yet!) and a list of blocks from a genbank file
const handleBlocks = (inputFilePath) => {
  return readGenbankFile(inputFilePath)
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
        return 'Invalid Genbank format.';
      }
    });
};

// Import project and construct/s from genbank
// Returns a project structure and the list of all blocks
export const importProject = (inputFilePath) => {
  return handleBlocks(inputFilePath)
    .then((result) => {
      if (_.isString(result)) {
        return result;
      }
      const resProject = handleProject(result.project, result.rootBlocks);

      //const outputFile = filePaths.createStorageUrl('imported_from_genbank.json');
      //fileSystem.fileWrite(outputFile, {project: resProject, blocks: result.blocks});
      return {project: resProject, blocks: result.blocks};
    });
};

// Import only construct/s from genbank
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

//given a genbank file, converts it, returning an object with the form {roots: <ids>, blocks: <blocks>}
//this handles saving sequences
export const convert = (inputFilePath) => {
  return importConstruct(inputFilePath);
};

//////////////////////////////////////////////////////////////
// EXPORT
//////////////////////////////////////////////////////////////
// Call Python to generate the genbank output for a project with a set of blocks
const exportProjectStructure = (project, blocks) => {
  const inputFilePath = createTempFilePath();
  const outputFilePath = createTempFilePath();
  const input = {
    project,
    blocks,
  };

  //const outputFile2 = filePaths.createStorageUrl('exported_to_genbank.json');
  //fileSystem.fileWrite(outputFile2, input);

  return fileSystem.fileWrite(inputFilePath, input)
    .then(() => runCommand(`python ${path.resolve(__dirname, 'convert.py')} to_genbank ${inputFilePath} ${outputFilePath}`, inputFilePath, outputFilePath))
    .then(resStr => {
      fileSystem.fileDelete(inputFilePath);
      fileSystem.fileDelete(outputFilePath);
      return resStr;
    })
    .catch(err => {
      fileSystem.fileDelete(inputFilePath);
      fileSystem.fileDelete(outputFilePath);
      console.log('ERROR IN PYTHON');
      console.log('Command');
      console.log(`python ${path.resolve(__dirname, 'convert.py')} to_genbank ${inputFilePath} ${outputFilePath}`);
      console.log('Error');
      console.log(err);
      return Promise.reject(err);
    });
};

// Load sequences from their MD5 in a set of block structures
const loadSequences = (blocks) => {
  return Promise.all(
    blocks.map(block => {
      const sequencePromise = (block.sequence.md5 && !block.sequence.sequence) ?
        persistence.sequenceGet(block.sequence.md5) :
        Promise.resolve();

      return sequencePromise
        .then((seq) => merge({}, block, {sequence: {sequence: seq}}))
        .catch((error) => block);
    }));
};

// This is the entry function for project export
// Given a project and a set of blocks, generate the genbank format
export const exportProject = (roll) => {
  return loadSequences(roll.blocks)
    .then((blockWithSequences) => exportProjectStructure(roll.project, blockWithSequences))
    .then((exportStr) => Promise.resolve(exportStr));
};

// This is the entry function for construct export
// Given a project and a set of blocks, generate the genbank format for a particular construct within that project
export const exportConstruct = (input) => {
  return loadSequences(input.roll.blocks)
    .then(blockWithSequences => {
      const theRoll = merge(cloneDeep(input), {project: {components: [ input.constructId ]}});
      // Rewrite the components so that it's only the requested construct!
      return exportProjectStructure(theRoll.project, blockWithSequences)
        .then(exportStr => Promise.resolve(exportStr))
        .catch(err => Promise.reject(err));
    });
};
