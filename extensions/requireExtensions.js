const fs = require('fs');
module.exports.load = (normalizedPath) => {
  const extensions = {};
  const manifests = {};
  fs.readdirSync(normalizedPath).forEach(folder => {
    if (folder.indexOf('.js') === -1) {
      try {
        manifests[folder] = JSON.parse(fs.readFileSync(normalizedPath + '/' + folder + '/manifest.json', 'utf8'));
        extensions[folder] = require(normalizedPath + '/' + folder);
      } catch (exception) {
        console.log(normalizedPath + '/' + folder + ' is not a proper extension');
      }
    }
  });

  return {extensions: extensions, manifests: manifests};
};
