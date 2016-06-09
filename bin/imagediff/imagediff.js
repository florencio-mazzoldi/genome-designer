var resemble = require('../../node_modules/node-resemble-js/resemble.js');
var fs = require('fs');
var path = require('path');
var clc = require('../../node_modules/cli-color/index.js');
var execSync = require('child_process').execSync;

// get the cannonical and test folders for images
var truth = path.resolve(process.argv[process.argv.findIndex(arg => arg === '--truth') + 1]);
var test = path.resolve(process.argv[process.argv.findIndex(arg => arg === '--hypothesis') + 1]);

// get full path of all files in folder, ignoring sub folders
const filesInFolder = (folder) => {
  return fs.readdirSync(folder)
    .map(name => {
      return path.join(folder, name);
    })
    .filter(fullPath => {
      return !fs.statSync(fullPath).isDirectory();
    });
};
// just the files name
const fileFromPath = (fullPath) => {
  const dir = path.dirname(fullPath);
  return fullPath.substr(dir.length);
};

// open the two files into imagediff.html using chrome
const openImages = (image1, image2) => {
  // chrome path and args
  const chrome = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --allow-file-access --incognito';
  // get full path to html file
  const html = `file:///${path.resolve('./bin/imagediff/imagediff.html')}`;
  // launch chrome as pass files in the query string
  const cli = `${chrome} --app="${html}?image1=file:///${image1}&amp;image2=file:///${image2}"`;
  execSync(cli);
}

console.log('|====== Screenshot Comparison ======|');
console.log(`Cannonical Folder: ${truth}`);
console.log(`Tests Folder     : ${test}`);

filesInFolder(truth).forEach(file => {
  // get corresponding file in tests folder
  const match = path.join(test, fileFromPath(file));
  console.log(clc.yellow(`Comparing\n${file}\n${match}`));
  resemble(file).compareTo(match).onComplete(function(data){
    const misMatch = parseFloat(data.misMatchPercentage);
    if (data.isSameDimensions && misMatch === 0) {
      console.log(clc.green('Perfect Match'));
      openImages(file, match);
    } else {
      if (!data.isSameDimensions) {
        console.log(clc.red('Images are different sizes'));
      } else {
        if (misMatch < 1e-6) {
          console.log(clc.orange('Images are very similar ( < 1e-6% delta )'));
        } else {
          console.error(clc.red(`Error, mismatch: ${misMatch}%`));
        }
      }
    }
  });
});
