"Bazel rules for running Babel https://babeljs.io"

load("@build_bazel_rules_nodejs//internal/linker:link_node_modules.bzl", "module_mappings_aspect", "register_node_modules_linker")

_DOC = """"""
_ATTRS = {
    "srcs": attr.label_list(
        doc = "TODO",
        allow_files = [".js"],
        mandatory = True,
    ),
    "babel_cli": attr.label(
        default = Label("@npm//@babel/cli/bin:babel"),
        executable = True,
        cfg = "host",
    ),
    "config_file": attr.label(
        doc = "TODO",
        allow_single_file = [".babelrc"],
    ),
    "out_dir": attr.string(
        doc = "See Babel --out-dir option",
    ),
    "deps": attr.label_list(
        aspects = [module_mappings_aspect],
        doc = """Other libraries that are required by the code, or by the babel.config.js""",
    ),
}

def _outs(name, srcs, out_dir):
    result = {}
    if not out_dir:
        # Compile all together
        result["js"] = "%s.js" % name
    return result

def _impl(ctx):
    inputs = ctx.files.srcs + ctx.files.config_file
    outputs = [getattr(ctx.outputs, o) for o in dir(ctx.outputs)]
    args = ctx.actions.args()

    args.add_all([s.short_path for s in ctx.files.srcs])

    if ctx.attr.out_dir:
        outputs.append(ctx.actions.declare_directory(ctx.attr.out_dir))
        args.add_all(["--out-dir", outputs[0].path])
    else:
        args.add_all(["--out-file", outputs[0].path])

    if ctx.attr.config_file:
        args.add_all(["--config-file", ctx.file.config_file])

    # Enable verbose output with Bazel argument --define=VERBOSE_LOGS=1
    if "VERBOSE_LOGS" in ctx.var:
        args.add("--verbose")

    register_node_modules_linker(ctx, args, inputs)

    ctx.actions.run(
        executable = ctx.executable.babel_cli,
        inputs = inputs,
        outputs = outputs,
        arguments = [args],
        progress_message = "Transpiling JavaScript %s [babel]" % outputs[0].short_path,
    )
    return [
        DefaultInfo(files = depset(outputs)),
    ]

babel_library = rule(_impl, doc = _DOC, attrs = _ATTRS, outputs = _outs)
