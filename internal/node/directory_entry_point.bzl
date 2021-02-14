""

load("//internal/providers:entry_point_info.bzl", "EntryPointInfo")

def _directory_entry_point(ctx):
    if not ctx.file.directory.is_directory:
        fail("directory should be a Bazel directory target (aka TreeArtifact)")
    return [
        # return one file in DefaultInfo so this can appear in an attr.label(allow_single_file=True)
        DefaultInfo(files = depset(ctx.files.directory)),
        EntryPointInfo(directory = ctx.file.directory, path = ctx.attr.path),
    ]

directory_entry_point = rule(
    implementation = _directory_entry_point,
    attrs = {
        "directory": attr.label(allow_single_file = True),
        "path": attr.string(),
    },
)
