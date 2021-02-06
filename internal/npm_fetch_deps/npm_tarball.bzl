""

def _npm_tarball(ctx):
    return []

npm_tarball = rule(
    implementation = _npm_tarball,
    attrs = {
        "src": attr.label(),
        "deps": attr.label_list(),
    },
    doc = "",
)
