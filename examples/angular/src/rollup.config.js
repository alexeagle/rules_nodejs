const node = require('rollup-plugin-node-resolve');
const amd = require('rollup-plugin-amd');
const commonjs = require('rollup-plugin-commonjs');

module.exports = {
  plugins: [
    node({
      mainFields: ['browser', 'es2015', 'module', 'jsnext:main', 'main'],
    }),
    amd({
      // Work-around for Angular ngfactory issue https://github.com/angular/angular/issues/29491.
      // Filter to only convert ngfactory files since any UMD files that may be bundled will break
      // with the amd plugin.
      include: /\.ngfactory\.js$/i,
    }),
    commonjs(),
  ],
};
