const uuid = require('node-uuid');
const csv = require('fast-csv');

module.exports = exports = {};

exports.importProject = function importProject(csvstr) {
  return new Promise((resolve, reject) => {
    const proj = {
      'id': uuid.v4(),
      'metadata': {
        'authors': [],
        'tags': {},
        'version': '',
      },
      'components': [],
    };

    const blocks = {};

    function appendToProj(data) {
      const [name, seq, type, color] = data;
      const id = uuid.v4();
      blocks[id] = {
        'id': id,
        'metadata': {
          'authors': [],
          'tags': {'type': type},
          'color': color,
          'version': '',
          'name': name,
        },
        'components': [],
        'sequence': {
          'sequence': seq,
          'features': [],
        },
      };
      proj.components.push(id);
      return;
    }

    csv
     .fromString(csvstr, {headers: false, delimiter: '\t'})
     .on('data', data => {
       if (!data) {
         reject('CSV format is incorrect');
         return;
       }
       appendToProj(data);
     })
     .on('end', data => {
       resolve({ project: proj, blocks: blocks });
     });
  });
};

exports.exportProject = function exportProject(proj, blocks) {
  return new Promise((resolve, reject) => {
    const blockArray = [];
    let block;
    let color;
    for (let bid in blocks) {
      block = blocks[bid];
      color = '#ffffff';
      if (block.components.length === 0 && block.sequence.sequence.length > 0) {
        if (block.settings && block.settings.color) {
          color = block.settings.color;
        }
        blockArray.push([block.metadata.name, block.sequence.sequence, block.metadata.tags.type, color]);
      }
    }

    csv.writeToString(blockArray, {headers: false, delimiter: '\t'}, (err, data) => {
      if (err || !data) {
        reject('Incorrect input');
      }
      resolve(data);
    });
  });
};
