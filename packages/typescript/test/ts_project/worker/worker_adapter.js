// TODO: deal with shuffling stdout out of the way
// maybe sth like https://www.npmjs.com/package/intercept-stdout can be useful
// process.stdout.write = () => {}

const worker = require('@bazel/worker');
// TODO: read stdin and reply to Bazel every time we see a WorkRequest

// First bazel will start our process with just a
// --persistent_worker argument
// FIXME: if we don't see that arg, it's a one-shot build
const workerArg = process.argv.indexOf('--persistent_worker')
if (workerArg > 0) {
    process.argv.splice(workerArg, 1)
}

// At this point we fall through to the first line of the vanilla tsc process
// and let TypeScript do its non-Bazel-aware goodness.
