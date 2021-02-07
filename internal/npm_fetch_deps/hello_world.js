if (!require.resolve('shelljs').includes('bin/internal/npm_fetch_deps/')) {
    throw new Error("resolved from wrong node modules path");
}

var shell = require('shelljs');
shell.echo('hello world');
