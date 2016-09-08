import * as fileSystem from '../../../../server/utils/fileSystem';
import invariant from 'invariant';
import Block from '../../../../src/models/Block';
import parse from 'csv-parse';
import md5 from 'md5';

//default fields in the CSV
const defaultColumns = ['name', 'description', 'role', 'color', 'sequence'];
//one of these fields is required for each block attempting to import
const requiredFields = ['name', 'description', 'role', 'sequence'];

const roleMassageMap = {
  CDS: 'cds',
  promoter: 'promoter',
  terminator: 'terminator',
  gene: 'cds',
  mat_peptide: 'cds',
};

const zip = (keys, vals) => keys.reduce(
  (acc, key, ind) => Object.assign(acc, { [key]: vals[ind] }), {}
);

const mapPartFields = (importedObject) => {
  //fields based on array at top
  const {
    name = 'New Block',
    description = '',
    role = null,
    sequence = null,
    color,
    index = 0,
    ...rest,
  } = importedObject;

  //todo - rest of fields should remove the @ symbol
  //can update docs to say this is not necessary

  return {
    metadata: {
      name,
      description,
      color,
      csv_row: index,
    },
    rules: {
      role,
    },
    notes: {
      ...rest,
    },
    sequence: sequence, //this field is removed later to conform to schema
  };
};

export function convertCsv(csvContents, fileName, fileUrl) {
  invariant(typeof csvContents === 'string', 'expected a string');

  let fields;
  const sequenceHash = {}; //hash of md5s, update as we go through blocks, write at end

  return new Promise((resolve, reject) => {
    parse(csvContents, {}, (err, output) => {
      if (err) return reject(err);
      resolve(output);
    });
  })
    //remove top rows
    .then(lines => {
      //todo - ensure these are fields, beyond just making sure a required field is present
      fields = lines.shift(1);
      console.log('csvjs import - using fields: ' + fields.join(', '));
      if (!fields.some(fieldName => requiredFields.indexOf(fieldName) >= 0)) {
        return Promise.reject('no required fields present');
      }
      return lines;
    })
    //remove empty lines
    .then(lines => lines.filter(line => line.some(field => !!field)))
    //make object with appropriate keys
    .then(lines => lines.map(line => zip(fields, line)))
    //assign the index before we do more filtering
    //hack - assumes that none were filtered
    .then(parts => parts.map((part, index) => Object.assign(part, {
      index: `${index + 1}`,
    })))
    //remove parts which do not have any required fields
    .then(parts => parts.filter(part => requiredFields.some(field => !!part[field])))
    //assign role + index
    .then(parts => parts.map((part, index) => Object.assign(part, {
      role: roleMassageMap[part.role] || part.role || null,
    })))
    //map fields to block fields
    .then(parts => parts.map(part => mapPartFields(part)))
    //assign the source
    .then(parts => parts.map(part => {
      //assign the source
      return Object.assign(part, {
        source: {
          source: 'csv',
          id: fileName,
          url: fileUrl,
        },
      });
    }))
    //update the sequence field
    .then(parts => parts.map(part => {
      const { sequence } = part;

      //only assign seqeuence information if we have a sequence
      if (!!sequence) {
        const sequenceMd5 = md5(sequence);
        Object.assign(part, {
          sequence: {
            md5: sequenceMd5,
            length: sequence.length,
            initialBases: '' + sequence.substr(0, 6),
          },
        });

        Object.assign(sequenceHash, {
          [sequenceMd5]: sequence,
        });
      }

      //wrap in the block scaffold
      return Block.classless(part);
    }))
    //make a map
    .then(blocks => blocks.reduce((acc, block) => Object.assign(acc, { [block.id]: block }), {}))
    .then(blockMap => ({
      blocks: blockMap,
      sequences: sequenceHash,
    }));
}

export default function convertFromFile(csvPath, fileName, fileUrl) {
  invariant(csvPath, 'need a csv path');

  return fileSystem.fileRead(csvPath, false)
    .then((contents) => convertCsv(contents, fileName, fileUrl));
}
