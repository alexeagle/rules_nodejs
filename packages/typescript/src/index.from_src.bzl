# Copyright 2019 The Bazel Authors. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

""" Defaults for usage without @npm//@bazel/typescript
"""

load("@build_bazel_rules_nodejs//internal/golden_file_test:golden_file_test.bzl", "golden_file_test")
load("@npm//typescript:index.bzl", "tsc")
load(
    ":index.bzl",
    _ts_devserver = "ts_devserver",
    _ts_library = "ts_library",
)

def ts_devserver(**kwargs):
    _ts_devserver(
        devserver = "@build_bazel_rules_typescript//devserver:devserver_bin",
        **kwargs
    )

def ts_library(**kwargs):
    _ts_library(
        compiler = "@build_bazel_rules_typescript//internal:tsc_wrapped_bin",
        **kwargs
    )

# In rules_nodejs "builtin" package, we are creating the toolchain for building
# npm_package_bin and executing the linker, so we cannot depend on them.
# However, we still want to be able to write our tooling in TypeScript.
# This macro lets us check in the resulting .js files, and still ensure that they are
# compiled from the .ts by using a golden file test.
def checked_in_ts_library(name, srcs, deps, checked_in_js, **kwargs):
    # We don't need the performance of ts_library
    # and want more control over the compilation - we don't
    # want inline sourcemaps.
    tsc(
        name = name,
        data = srcs + deps,
        outs = [s.replace(".ts", ext) for s in srcs for ext in [".js", ".d.ts"]],
        args = [
            "--outDir",
            "$@",
            "--lib",
            "es2017,dom",
            "--downlevelIteration",
            "--declaration",
        ] + [
            "$(location %s)" % s
            for s in srcs
        ],
    )

    # Don't trigger clang-format on the output js
    # Make sure we don't add any lines though, since that would
    # break the sourcemap
    native.genrule(
        name = "_%s_skip_formatting" % name,
        srcs = [s.replace(".ts", ".js") for s in srcs],
        outs = ["_%s_es5_no_format.js" % name],
        cmd = """echo -n "/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */" > $@; cat $< >> $@""",
    )

    # Assert that we kept the index.js up-to-date when changing the TS code
    golden_file_test(
        name = "%s_check_compiled" % name,
        actual = "_%s_es5_no_format.js" % name,
        golden = checked_in_js,
    )
