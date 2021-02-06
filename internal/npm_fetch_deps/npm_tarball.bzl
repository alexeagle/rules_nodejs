""

NpmTarballInfo = provider(
    doc = "",
    fields = {
        "tarballs": "depset of needed tarballs",
    }
)

def _npm_tarball(ctx):
    if ctx.attr.src and not ctx.attr.package_name:
        fail("when given a src, must also tell the package_name for it")
    direct = []
    if ctx.attr.src:
        direct.push(struct(
            package_name = ctx.attr.package_name,
            tarball = ctx.file.src,
        ))
    return [NpmTarballInfo(tarballs = depset(
        direct,
        transitive = [d[NpmTarballInfo] for d in ctx.attr.deps],
    ))]

npm_tarball = rule(
    implementation = _npm_tarball,
    attrs = {
        "src": attr.label(allow_single_file = True),
        "package_name": attr.string(),
        "deps": attr.label_list(providers = [NpmTarballInfo]),
    },
    doc = "",
)
