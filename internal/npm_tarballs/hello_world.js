if (!require.resolve('shelljs').includes('bin/internal/npm_tarballs/')) {
    throw new Error("resolved from wrong node modules path");
}

var shell = require('shelljs');
shell.echo('hello world');
