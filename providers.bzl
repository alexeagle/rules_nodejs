"""Providers for interop between JS rules.

This file has to live in the built-in so that all rules can load() the providers
even if users haven't installed any of the packages/*

These providers allows rules to interoperate without knowledge
of each other.

You can think of a provider as a message bus.
A rule "publishes" a message as an instance of the provider, and some other rule
subscribes to these by having a (possibly transitive) dependency on the publisher.

## Debugging

Debug output is considered orthogonal to these providers.
Any output may or may not have user debugging affordances provided, such as
readable minification.
We expect that rules will have a boolean `debug` attribute, and/or accept the `DEBUG`
environment variable.
Note that this means a given build either produces debug or non-debug output.
If users really need to produce both in a single build, they'll need two rules with
differing 'debug' attributes.
"""

JSModuleInfo = provider(
    doc = """JavaScript files and sourcemaps.""",
    fields = {
        "module_format": "a string like [amd, cjs, esm, iife, umd] or \"mixed\" if the sources are of mixed formats",
        "sources": "depset of direct and transitive JavaScript files and sourcemaps",
    },
)

def transitive_js_module_info(module_format, sources, deps = []):
    """Constructs a JSModuleInfo including all transitive sources from JSModuleInfo providers in a list of deps.

`module_format` is set to `mixed` if there are JSModuleInfo providers with mixed module formats.

Returns a single JSModuleInfo.
"""
    return combine_js_module_info([JSModuleInfo(module_format = module_format, sources = sources)] + collect_js_module_infos(deps))

def combine_js_module_info(modules):
    """Combines all JavaScript sources and sourcemaps from a list of JSModuleInfo providers.

`module_format` is set to `mixed` if there are JSModuleInfo providers with mixed module formats.

Returns a single JSModuleInfo.
"""
    module_format = None
    sources_depsets = []
    for module in modules:
        # Set module_format as "mixed" if sources have mixed module formats
        if not module_format:
            module_format = module.module_format
        elif module_format != module.module_format:
            module_format = "mixed"
        sources_depsets.extend([module.sources])
    return JSModuleInfo(
        module_format = module_format,
        sources = depset(transitive = sources_depsets),
    )

def collect_js_module_infos(deps):
    """Collects all JSModuleInfo providers from a list of deps.

Returns a list of JSModuleInfo providers.
"""
    modules = []
    for dep in deps:
        if JSModuleInfo in dep:
            modules.extend([dep[JSModuleInfo]])
    return modules

JSNamedModuleInfo = provider(
    doc = """JavaScript files whose module name is self-contained.

For example named AMD/UMD or goog.module format.
These files can be efficiently served with the concatjs bundler.
These outputs should be named "foo.umd.js"
(note that renaming it from "foo.js" doesn't affect the module id)

Historical note: this was the typescript.es5_sources output.
""",
    fields = {
        "sources": "depset of direct and transitive JavaScript files and sourcemaps",
    },
)

def transitive_js_named_module_info(sources, deps = []):
    """Constructs a JSNamedModuleInfo including all transitive sources from JSNamedModuleInfo providers in a list of deps.

Returns a single JSNamedModuleInfo.
"""
    return combine_js_named_module_info([JSNamedModuleInfo(sources = sources)] + collect_js_named_module_infos(deps))

def combine_js_named_module_info(modules):
    """Combines all JavaScript sources and sourcemaps from a list of JSNamedModuleInfo providers.

Returns a single JSNamedModuleInfo.
"""
    sources_depsets = []
    for module in modules:
        sources_depsets.extend([module.sources])
    return JSNamedModuleInfo(
        sources = depset(transitive = sources_depsets),
    )

def collect_js_named_module_infos(deps):
    """Collects all JSNamedModuleInfo providers from a list of deps.

Returns a list of JSNamedModuleInfo providers.
"""
    modules = []
    for dep in deps:
        if JSNamedModuleInfo in dep:
            modules.extend([dep[JSNamedModuleInfo]])
    return modules

JSEcmaScriptModuleInfo = provider(
    doc = """JavaScript files (and sourcemaps) that are intended to be consumed by downstream tooling.

They should use modern syntax and ESModules.
These files should typically be named "foo.mjs"
TODO: should we require that?

Historical note: this was the typescript.es6_sources output""",
    fields = {
        "sources": "depset of direct and transitive JavaScript files and sourcemaps",
    },
)

def transitive_js_ecma_script_module_info(sources, deps = []):
    """Constructs a JSEcmaScriptModuleInfo including all transitive sources from JSEcmaScriptModuleInfo providers in a list of deps.

Returns a single JSEcmaScriptModuleInfo.
"""
    return combine_js_ecma_script_module_info([JSEcmaScriptModuleInfo(sources = sources)] + collect_js_ecma_script_module_infos(deps))

def combine_js_ecma_script_module_info(modules):
    """Combines all JavaScript sources and sourcemaps from a list of JSEcmaScriptModuleInfo providers.

Returns a single JSEcmaScriptModuleInfo.
"""
    sources_depsets = []
    for module in modules:
        sources_depsets.extend([module.sources])
    return JSEcmaScriptModuleInfo(
        sources = depset(transitive = sources_depsets),
    )

def collect_js_ecma_script_module_infos(deps):
    """Collects all JSEcmaScriptModuleInfo providers from a list of deps.

Returns a list of JSEcmaScriptModuleInfo providers.
"""
    modules = []
    for dep in deps:
        if JSEcmaScriptModuleInfo in dep:
            modules.extend([dep[JSEcmaScriptModuleInfo]])
    return modules

# TODO: TsickleInfo might be a needed provider to send tsickle_externs and type_blacklisted_declarations
