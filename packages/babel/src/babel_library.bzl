"Bazel rules for running Babel https://babeljs.io"
_DOC = """"""
_ATTRS = {
    "srcs": attr.label_list(
        doc = "TODO",
        allow_files = [".js"],
    ),
    "babel_cli": attr.label(
        default = Label("@npm//@babel/cli/bin:babel"),
        executable = True,
        cfg = "host",
    ),
}

def _outs():
    return {}

def _impl(ctx):
    return []

babel_library = rule(_impl, doc = _DOC, attrs = _ATTRS, outputs = _outs)
