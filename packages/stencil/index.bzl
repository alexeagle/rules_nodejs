def _stencil_component(ctx):
    config = ctx.actions.declare_file("_%s.config.js" % ctx.label.name)
    ctx.actions.expand_template(
        template = ctx.file._stencil_config_tmpl,
        output = config,
        substitutions = {
            
        },
    )
    output = ctx.actions.declare_file("foo")
    

    ctx.actions.run(
        inputs = ctx.files.srcs + [config] + ctx.files._stencil_typings,
        outputs = [output],
        executable = ctx.executable.stencil_bin,
        arguments = ["build", "--config=%s" % config.path],
    )
    return [DefaultInfo(files = depset([output]))]

stencil_component = rule(
    implementation = _stencil_component,
    attrs = {
        "srcs": attr.label_list(allow_files = True),
        "namespace": attr.string(),
        "stencil_bin": attr.label(
            default = Label("@npm//@stencil/core/bin:stencil"),
            executable = True,
            cfg = "host",
        ),
        "_stencil_config_tmpl": attr.label(
            allow_single_file = True,
            default = Label("@npm_bazel_stencil//:stencil.config.js")),
        "_stencil_typings": attr.label_list(
            allow_files = True,
            default = [
                Label("@npm//node_modules/@stencil/core:dist/client/declarations/stencil.core.d.ts"),
            ]
        ),
    },    
)

