const fs = require('fs');
const compress = require('brotli/compress');
const path = require('path');
 
function main(args) {
  const inputDir = args[0];
  const outputDir = args[1];
 
 
  fs.readdirSync(inputDir).forEach(f => {
    const original = fs.readFileSync(path.join(inputDir, f));
    if (f.endsWith('.js')) {
      fs.writeFileSync(path.join(outputDir, `${f}.br`), compress(original, {
                         mode: 0,
                         quality: 11,
                       }));
    }
    fs.writeFileSync(path.join(outputDir, f), original);
  });
}
 
if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
