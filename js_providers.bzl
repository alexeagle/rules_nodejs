"""Providers for interop between JS rules.

This file has to live in the built-in so that all rules can load() the providers 
even if users haven't installed any of the @bazel/* packages.

These providers allows rules to interoperate without knowledge of each other.
You can think of a provider as a message bus.
A rule "publishes" a message as an instance of the provider, and some other rule
subscribes to these by having a (possibly transitive) dependency on the publisher.

## Debugging

Debug output is considered orthogonal to these providers.

Any output may or may not have user debugging affordances provided, such as
readable minification.
We expect that rules will have a boolean `debug` attribute, and/or accept a 
`--define=DEBUG` environment variable.

Note that this means a given build either produces debug or non-debug output.
If users really need to produce both in a single build, they'll need two rules with
differing `debug` attributes.
"""

JSNamedModuleInfo = provider(
    doc = """JavaScript files whose module name is self-contained.
For example named AMD/UMD or goog.module format.
These files can be efficiently served with the concatjs bundler.
These outputs should be named "foo.umd.js"
(note that renaming it from "foo.js" doesn't affect the module id)
Historical note: this was the typescript.es5_sources output.
""",
    fields = {
        "sources": "depset of JavaScript files",
    },
)

JSEcmaScriptModuleInfo = provider(
    doc = """JavaScript files (and sourcemaps) that are intended to be consumed by downstream tooling.
They should use modern syntax and ESModules.
These files should typically be named "foo.mjs"
TODO: should we require that?
Historical note: this was the typescript.es6_sources output""",
    fields = {
        "sources": "depset of JavaScript files",
    },
)
