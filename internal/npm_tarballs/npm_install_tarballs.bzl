""
load("//:providers.bzl", "ExternalNpmPackageInfo")
load(":npm_tarball.bzl", "NpmTarballInfo")

def _npm_install_tarballs(ctx):
    out = ctx.actions.declare_directory("node_modules")
    chdir = ctx.actions.declare_file("_%s.chdir.js" % ctx.label.name)

    tarballs = depset(transitive = [d[NpmTarballInfo].tarballs for d in ctx.attr.packages]).to_list()
    if len(tarballs) == 0:
        fail("packages cannot be empty")
    
    # FIXME: We should use the user's file if there is one in this directory
    package_json = ctx.actions.declare_file("package.json")

    # to find our way back to the execroot we go out of bazel-out/arch/bin plus the package name
    segments_to_root = 3 + len(ctx.label.package.split("/"))
    relative_path_to_root = "/".join([".."] * segments_to_root)
    ctx.actions.write(chdir, "process.chdir(__dirname)")
    ctx.actions.write(package_json, json.encode({
        "dependencies": {
            t.package_name: "file:" + relative_path_to_root + "/" + t.tarball.path
            for t in tarballs
            #"typescript": "../../../" + ctx.files.packages[0].path,
        },
        "description": "generated by Bazel node_modules rule",
        "name": "bazel-internal-installation",
        "private": True,
    }))

    args = ctx.actions.args()
    args.add_all([
        "--require=./" + chdir.path,
        ctx.file._npm.path,
        "install",
        # Don't write a package-lock file as nothing expects to read it
        "--no-package-lock",
    ])
    if ctx.attr.offline:
        args.add("--offline")
    else:
        args.add("--prefer-offline")

    ctx.actions.run(
        executable = ctx.executable._node,
        arguments = [args],
        inputs = [t.tarball for t in tarballs] + ctx.files._npm + [chdir, package_json],
        outputs = [out],
        env = {
            "npm_config_audit": "false",
            "npm_config_cache": "../../../" + tarballs[0].tarball.dirname,
            "npm_config_update_notifier": "false",
        },
    )
    return [
        DefaultInfo(
            files = depset([out]),
        ),
        ExternalNpmPackageInfo(
        #             "direct_sources": "Depset of direct source files in these external npm package(s)",
        # "sources": "Depset of direct & transitive source files in these external npm package(s) and transitive dependencies",
        # "workspace": "The workspace name that these external npm package(s) are provided from",
            direct_sources = depset([out]),
            sources = depset([out]),
            workspace = ctx.label.workspace_name,
        ),
    ]

# tRy
# - a package with deps like rollup
# - try using the resulting node_modules as a dep/tool
# - generate a package.json with tarball urls with resolve for transitive deps
# - toolchains?
# - no way to reference files inside the node_modules

npm_install_tarballs = rule(
    implementation = _npm_install_tarballs,
    attrs = {
        "packages": attr.label_list(
            mandatory = True,
            providers = [NpmTarballInfo],
        ),
        "offline": attr.bool(
            doc = """"disallow npm from talking to the network during install

requires that the cache was fully populated when the tarballs were fetched"""),
        "_node": attr.label(
            executable = True,
            cfg = "target",
            allow_files = True,
            default = Label("@nodejs//:node_bin"),
        ),
        "_npm": attr.label(
            executable = True,
            cfg = "target",
            allow_single_file = True,
            default = Label("@nodejs//:npm_bin"),
        ),
    },
)
