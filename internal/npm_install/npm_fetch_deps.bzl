""

load("//internal/node:node_labels.bzl", "get_node_label", "get_npm_label")

def _basename(p):
    return p.split("/")[-1]

def _fetch(repository_ctx, packages):
    for (name, dep) in packages["dependencies"].items():
        if "resolved" not in dep.keys():
            continue
        repository_ctx.download(
            output = _basename(dep["resolved"]),
            url = dep["resolved"],
            integrity = dep["integrity"],
        )

def _npm_fetch_deps(repository_ctx):
    build_content = "# Generated by npm_fetch_deps.bzl\n"

    # Fetch each tarball listed in the package_lock
    lock_content = json.decode(repository_ctx.read(repository_ctx.attr.package_lock))
    lock_version = lock_content["lockfileVersion"]
    if lock_version < 2:
        fail("npm_fetch_deps only works with npm 7 lockfiles (lockfileVersion >= 2), found %s" % lock_version)
    _fetch(repository_ctx, lock_content)
    # recurse one level deeper
    for (name, dep) in lock_content["dependencies"].items():
        if "dependencies" in dep.keys():
            #for (p, attrs) in dep["dependencies"].items():
            _fetch(repository_ctx, dep)
 

    # Stuff the tarballs into the npm cache for later
    npm = get_npm_label(repository_ctx)
    repository_ctx.execute(
        [npm, "cache", "add", "typescript-4.1.3.tgz"],
        environment = {"npm_config_cache": "."},
    )
    repository_ctx.template(
        "index.js",
        repository_ctx.path(Label("//internal/npm_install:index2.js")),
        {},
    )
    result = repository_ctx.execute([
        get_node_label(repository_ctx),
        "index.js",
    ])
    if result.return_code:
        fail("index2.ts failed: \nSTDOUT:\n%s\nSTDERR:\n%s" % (result.stdout, result.stderr))

#     # Export all the tarballs
#     repository_ctx.file(
#         "BUILD.bazel",
#         content = """

# filegroup(
#     name = "%s_all",
#     # FIXME: look on the disk and find the files to avoid glob perf penalty
#     srcs = glob([
#         "*.tgz",
#         "_cache/**",
#     ]),
#     visibility = ["//visibility:public"],
# )
# """ % repository_ctx.attr.name,
#     )

npm_fetch_deps = repository_rule(
    implementation = _npm_fetch_deps,
    attrs = {
        "package_lock": attr.label(mandatory = True),
    },
)