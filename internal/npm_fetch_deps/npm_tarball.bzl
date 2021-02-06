""

NpmTarballInfo = provider(
    doc = "",
    fields = {
        "tarballs": "depset of needed tarballs",
    }
)

def _npm_tarball(ctx):
    return [NpmTarballInfo(tarballs = depset([ctx.file.src] + ctx.files.deps))]

npm_tarball = rule(
    implementation = _npm_tarball,
    attrs = {
        "src": attr.label(allow_single_file = True),
        "deps": attr.label_list(allow_files = True),
    },
    doc = "",
)
