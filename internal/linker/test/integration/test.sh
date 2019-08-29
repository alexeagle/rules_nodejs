#!/usr/bin/env bash

# Turn on extra logging so that test failures are easier to debug
export VERBOSE_LOGS=1
export NODE_DEBUG=module

# Assume node is on the machine
# This needs to be changed to use bazel toolchains before merging
/usr/bin/env node internal/linker/link_node_modules.js internal/linker/test/integration/_example.module_mappings.json
/usr/bin/env node --preserve-symlinks-main internal/linker/test/integration/program.js > $TEST_TMPDIR/out

out=`cat $TEST_TMPDIR/out`
if [[ "$out" != "1.2.3_a" ]]; then
  echo "expected 1.2.3_a but was ${out}" >&2
  exit 1
fi
