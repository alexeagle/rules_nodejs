import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';

module.exports = {
  plugins: [
    nodeResolve({
      preferBuiltins: true,
    }),
    commonjs({
      // The TS source uses a require('@npmcli/arborist')
      // since there are no typings for this library
      transformMixedEsModules: true,
    }),
    json({preferConst: true}),
  ],
};
