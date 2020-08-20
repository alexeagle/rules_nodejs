// TODO: deal with shuffling stdout out of the way
// maybe sth like https://www.npmjs.com/package/intercept-stdout can be useful
// process.stdout.write = () => {}

const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']);
let worker;
try {
  worker = require('./worker');
} catch {
  // TODO: rely on the linker to link the first-party package
  const helper = process.env['BAZEL_NODE_RUNFILES_HELPER'];
  if (!helper) throw new Error('No runfiles helper and no @bazel/worker npm package');
  const runfiles = require(helper);
  const workerRequire =
      runfiles.resolve('build_bazel_rules_nodejs/packages/ts_project/worker/worker.js');
  if (!workerRequire)
    throw new Error(
        `build_bazel_rules_nodejs/packages/ts_project/worker/worker.js missing in runfiles ${
            JSON.stringify(runfiles.manifest)}, ${runfiles.dir}`);
  worker = require(workerRequire);
}

let buffer = ''
const originalStdBuffer = process.stdout.write;
process.stdout.write = (s) => buffer += s;

function awaitOneBuild() {
  if (buffer.includes('Watching for file changes.')) {
    const success = buffer.includes('Found 0 errors.');
    process.stdout.write = originalStdBuffer;
    return success;
  }

  return new Promise((res) => {
    process.stdout.write =
        (s) => {
          if (s.includes('Watching for file changes.')) {
            const success = buffer.includes('Found 0 errors.');
            process.stdout.write = originalStdBuffer;
            res(success);
          }
        }
  });
}

const workerArg = process.argv.indexOf('--persistent_worker')
if (workerArg > 0) {
    process.argv.splice(workerArg, 1)
    worker.runWorkerLoop(awaitOneBuild);
}

// At this point we fall through to the first line of the vanilla tsc process
// and let TypeScript do its non-Bazel-aware goodness.
