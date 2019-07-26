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

"""Contains the node_module_library which is used by yarn_install & npm_install.
"""

load("@build_bazel_rules_nodejs//:declaration_provider.bzl", "DeclarationInfo")
load("@build_bazel_rules_nodejs//:providers.bzl", "transitive_js_module_info", "transitive_js_named_module_info")
load("@build_bazel_rules_nodejs//internal/common:node_module_info.bzl", "NodeModuleInfo")

def _node_module_library_impl(ctx):
    workspace = ctx.label.workspace_root.split("/")[1] if ctx.label.workspace_root else ctx.workspace_name

    # sources are all files in srcs
    sources = depset(ctx.files.srcs)

    # declarations are a subset of sources that are declaration files
    declarations = depset([
        f
        for f in ctx.files.srcs
        if f.path.endswith(".d.ts") and
           # exclude eg. external/npm/node_modules/protobufjs/node_modules/@types/node/index.d.ts
           # these would be duplicates of the typings provided directly in another dependency.
           # also exclude all /node_modules/typescript/lib/lib.*.d.ts files as these are determined by
           # the tsconfig "lib" attribute
           len(f.path.split("/node_modules/")) < 3 and f.path.find("/node_modules/typescript/lib/lib.") == -1
    ])

    # transitive_sources are all files in srcs plus those in direct & transitive dependencies
    transitive_sources = sources

    # transitive_declarations are all .d.ts files in srcs plus those in direct & transitive dependencies
    transitive_declarations = declarations

    for dep in ctx.attr.deps:
        if DeclarationInfo in dep:
            transitive_declarations = depset(transitive = [transitive_declarations, dep[DeclarationInfo].transitive_declarations])
        if NodeModuleInfo in dep:
            transitive_sources = depset(transitive = [transitive_sources, dep[NodeModuleInfo].transitive_sources])

    return struct(
        typescript = struct(
            declarations = declarations,
            devmode_manifest = None,
            es5_sources = depset(),
            es6_sources = depset(),
            replay_params = None,
            transitive_declarations = transitive_declarations,
            # still needed for compat with rules_typescript
            transitive_es6_sources = depset(),
            tsickle_externs = [],
            type_blacklisted_declarations = depset(),
        ),
        providers = [
            DefaultInfo(
                files = sources,
            ),
            NodeModuleInfo(
                sources = sources,
                transitive_sources = transitive_sources,
                workspace = workspace,
            ),
            DeclarationInfo(
                declarations = declarations,
                transitive_declarations = transitive_declarations,
            ),
            transitive_js_module_info(
                module_format = "",
                sources = sources,
                deps = ctx.attr.deps,
            ),
            transitive_js_named_module_info(
                sources = depset(ctx.files.named_sources),
                deps = ctx.attr.deps,
            ),
        ],
    )

node_module_library = rule(
    implementation = _node_module_library_impl,
    attrs = {
        "srcs": attr.label_list(
            doc = "The list of files that comprise the package",
            allow_files = True,
        ),
        "named_sources": attr.label_list(
            doc = "A subset of srcs that are javascript named-UMD or named-AMD for use in rules such as ts_devserver",
            allow_files = True,
        ),
        "deps": attr.label_list(
            doc = "Transitive dependencies of the package",
        ),
    },
    doc = "Defines an npm package under node_modules",
)
