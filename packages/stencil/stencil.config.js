const fs = require('fs');
const path = require('path');

function listDir(p, indent) {
  if (fs.statSync(p).isDirectory()) {
    fs.readdirSync(p).forEach(f => listDir(path.join(p, f), indent + '  '));
  } else {
    console.error(indent, p);
  }
}
//listDir('.', '');

const config = {
  srcDir: process.cwd() + '/test'
};

module.exports = {config};

