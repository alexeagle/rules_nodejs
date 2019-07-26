# Copyright 2017 The Bazel Authors. All rights reserved.
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

"""NodeModuleInfo providers and apsect to collect node_modules from deps.
"""

# NodeModuleInfo provider is provided by targets that are npm dependencies by the
# `node_module_library` rule as well as other targets that have direct or transitive deps on
# `node_module_library` targets via the `node_modules_aspect` below.
NodeModuleInfo = provider(
    doc = "Provides information about npm dependencies installed with yarn_install and npm_install rules",
    fields = {
        "sources": "Source files that are direct npm depedendencies",
        "transitive_sources": "Source files that are direct & transitive npm depedendencies",
        "workspace": "The workspace name that the npm dependencies are provided from",
    },
)

def _node_modules_aspect_impl(target, ctx):
    providers = []

    # provide NodeModuleInfo if it is not already provided there are NodeModuleInfo deps
    if not NodeModuleInfo in target:
        transitive_sources = depset()
        nm_wksp = None
        if hasattr(ctx.rule.attr, "deps"):
            for dep in ctx.rule.attr.deps:
                if NodeModuleInfo in dep:
                    if nm_wksp and dep[NodeModuleInfo].workspace != nm_wksp:
                        fail("All npm dependencies need to come from a single workspace. Found '%s' and '%s'." % (nm_wksp, dep[NodeModuleInfo].workspace))
                    nm_wksp = dep[NodeModuleInfo].workspace
                    transitive_sources = depset(transitive = [dep[NodeModuleInfo].transitive_sources, transitive_sources])
            if nm_wksp:
                providers.extend([NodeModuleInfo(sources = depset(), transitive_sources = transitive_sources, workspace = nm_wksp)])

    return providers

node_modules_aspect = aspect(
    _node_modules_aspect_impl,
    attr_aspects = ["deps"],
)
