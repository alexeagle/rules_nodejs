/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("build_bazel_rules_nodejs/internal/linker/link_node_modules", ["require", "exports", "fs", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @fileoverview Creates a node_modules directory in the current working directory
     * and symlinks in the node modules needed to run a program.
     * This replaces the need for custom module resolution logic inside the process.
     */
    const fs = require("fs");
    const path = require("path");
    // Run Bazel with --define=VERBOSE_LOGS=1 to enable this logging
    const VERBOSE_LOGS = !!process.env['VERBOSE_LOGS'];
    function log_verbose(...m) {
        if (VERBOSE_LOGS)
            console.error('[link_node_modules.js]', ...m);
    }
    function panic(m) {
        throw new Error(`Internal error! Please run again with
   --define=VERBOSE_LOG=1
and file an issue: https://github.com/bazelbuild/rules_nodejs/issues/new?template=bug_report.md
Include as much of the build output as you can without disclosing anything confidential.

  Error:
  ${m}
  `);
    }
    function symlink(target, path) {
        return __awaiter(this, void 0, void 0, function* () {
            log_verbose(`symlink( ${path} -> ${target} )`);
            // Use junction on Windows since symlinks require elevated permissions.
            // We only link to directories so junctions work for us.
            try {
                yield fs.promises.symlink(target, path, 'junction');
            }
            catch (e) {
                if (e.code !== 'EEXIST') {
                    throw e;
                }
                // We assume here that the path is already linked to the correct target.
                // Could add some logic that asserts it here, but we want to avoid an extra
                // filesystem access so we should only do it under some kind of strict mode.
            }
            if (VERBOSE_LOGS) {
                // Be verbose about creating a bad symlink
                // Maybe this should fail in production as well, but again we want to avoid
                // any unneeded file I/O
                if (!fs.existsSync(path)) {
                    log_verbose('ERROR\n***\nLooks like we created a bad symlink:' +
                        `\n  pwd ${process.cwd()}\n  target ${target}\n***`);
                }
            }
        });
    }
    /**
     * Resolve a root directory string to the actual location on disk
     * where node_modules was installed
     * @param root a string like 'npm/node_modules'
     */
    function resolveRoot(root, runfiles) {
        // create a node_modules directory if no root
        // this will be the case if only first-party modules are installed
        if (!root) {
            if (!fs.existsSync('node_modules')) {
                log_verbose('no third-party packages; mkdir node_modules in ', process.cwd());
                fs.mkdirSync('node_modules');
            }
            return 'node_modules';
        }
        // If we got a runfilesManifest map, look through it for a resolution
        // This will happen if we are running a binary that had some npm packages
        // "statically linked" into its runfiles
        const fromManifest = runfiles.lookupDirectory(root);
        if (fromManifest)
            return fromManifest;
        // Account for Bazel --legacy_external_runfiles
        // which look like 'my_wksp/external/npm/node_modules'
        if (fs.existsSync(path.join('external', root))) {
            log_verbose('Found legacy_external_runfiles, switching root to', path.join('external', root));
            return path.join('external', root);
        }
        // The repository should be layed out in the parent directory
        // since bazel sets our working directory to the repository where the build is happening
        return path.join('..', root);
    }
    class Runfiles {
        constructor(env) {
            // If Bazel sets a variable pointing to a runfiles manifest,
            // we'll always use it.
            // Note that this has a slight performance implication on Mac/Linux
            // where we could use the runfiles tree already laid out on disk
            // but this just costs one file read for the external npm/node_modules
            // and one for each first-party module, not one per file.
            if (!!env['RUNFILES_MANIFEST_FILE']) {
                this.manifest = this.loadRunfilesManifest(env['RUNFILES_MANIFEST_FILE']);
            }
            else if (!!env['RUNFILES_DIR']) {
                this.dir = path.resolve(env['RUNFILES_DIR']);
            }
            else {
                panic('Every node program run under Bazel must have a $RUNFILES_DIR or $RUNFILES_MANIFEST_FILE environment variable');
            }
            // Under --noenable_runfiles (in particular on Windows)
            // Bazel sets RUNFILES_MANIFEST_ONLY=1.
            // When this happens, we need to read the manifest file to locate
            // inputs
            if (env['RUNFILES_MANIFEST_ONLY'] === '1' && !env['RUNFILES_MANIFEST_FILE']) {
                log_verbose(`Workaround https://github.com/bazelbuild/bazel/issues/7994
                 RUNFILES_MANIFEST_FILE should have been set but wasn't.
                 falling back to using runfiles symlinks.
                 If you want to test runfiles manifest behavior, add
                 --spawn_strategy=standalone to the command line.`);
            }
            const wksp = env['TEST_WORKSPACE'];
            const target = env['TEST_TARGET'];
            if (!!wksp && !!target) {
                // //path/to:target -> //path/to
                const pkg = target.split(':')[0];
                this.packagePath = path.posix.join(wksp, pkg);
            }
        }
        lookupDirectory(dir) {
            if (!this.manifest)
                return undefined;
            for (const [k, v] of this.manifest) {
                // Account for Bazel --legacy_external_runfiles
                // which pollutes the workspace with 'my_wksp/external/...'
                if (k.startsWith(`${dir}/external`))
                    continue;
                // Entry looks like
                // k: npm/node_modules/semver/LICENSE
                // v: /path/to/external/npm/node_modules/semver/LICENSE
                // calculate l = length(`/semver/LICENSE`)
                if (k.startsWith(dir)) {
                    const l = k.length - dir.length;
                    return v.substring(0, v.length - l);
                }
            }
        }
        /**
         * The runfiles manifest maps from short_path
         * https://docs.bazel.build/versions/master/skylark/lib/File.html#short_path
         * to the actual location on disk where the file can be read.
         *
         * In a sandboxed execution, it does not exist. In that case, runfiles must be
         * resolved from a symlink tree under the runfiles dir.
         * See https://github.com/bazelbuild/bazel/issues/3726
         */
        loadRunfilesManifest(manifestPath) {
            log_verbose(`using runfiles manifest ${manifestPath}`);
            const runfilesEntries = new Map();
            const input = fs.readFileSync(manifestPath, { encoding: 'utf-8' });
            for (const line of input.split('\n')) {
                if (!line)
                    continue;
                const [runfilesPath, realPath] = line.split(' ');
                runfilesEntries.set(runfilesPath, realPath);
            }
            return runfilesEntries;
        }
        resolve(modulePath) {
            // Look in the runfiles first
            if (this.manifest) {
                return this.lookupDirectory(modulePath);
            }
            // how can we avoid this FS lookup every time? we don't know when process.cwd changed...
            // const runfilesRelative = runfiles.dir ? path.relative('.', runfiles.dir) : undefined;
            if (exports.runfiles.dir) {
                return path.join(exports.runfiles.dir, modulePath);
            }
            throw new Error(`could not resolve modulePath ${modulePath}`);
        }
        resolvePackageRelative(modulePath) {
            if (!this.packagePath) {
                throw new Error('packagePath could not be determined from the environment');
            }
            return this.resolve(path.posix.join(this.packagePath, modulePath));
        }
    }
    exports.Runfiles = Runfiles;
    // There is no fs.promises.exists function because
    // node core is of the opinion that exists is always too racey to rely on.
    function exists(p) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs.promises.stat(p);
                return true;
            }
            catch (e) {
                if (e.code === 'ENOENT') {
                    return false;
                }
                throw e;
            }
        });
    }
    function main(args, runfiles) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!args || args.length < 1)
                throw new Error('link_node_modules.js requires one argument: modulesManifest path');
            const [modulesManifest] = args;
            let { bin, root, modules, workspace } = JSON.parse(fs.readFileSync(modulesManifest));
            modules = modules || {};
            log_verbose(`module manifest: workspace ${workspace}, bin ${bin}, root ${root} with first-party packages\n`, modules);
            const rootDir = resolveRoot(root, runfiles);
            log_verbose('resolved root', root, 'to', rootDir);
            // Bazel starts actions with pwd=execroot/my_wksp
            const workspaceDir = path.resolve('.');
            // Convert from runfiles path
            // this_wksp/path/to/file OR other_wksp/path/to/file
            // to execroot path
            // path/to/file OR external/other_wksp/path/to/file
            function toWorkspaceDir(p) {
                if (p === workspace) {
                    return '.';
                }
                // The manifest is written with forward slash on all platforms
                if (p.startsWith(workspace + '/')) {
                    return p.substring(workspace.length + 1);
                }
                return path.join('external', p);
            }
            // Create the $pwd/node_modules directory that node will resolve from
            yield symlink(rootDir, 'node_modules');
            process.chdir(rootDir);
            // Symlinks to packages need to reach back to the workspace/runfiles directory
            const workspaceRelative = path.relative('.', workspaceDir);
            // Now add symlinks to each of our first-party packages so they appear under the node_modules tree
            const links = [];
            const linkModule = (name, modulePath) => __awaiter(this, void 0, void 0, function* () {
                // First try dynamic-linked bin directory
                let target = path.join(workspaceRelative, bin, toWorkspaceDir(modulePath));
                // It sucks that we have to do a FS call here.
                // TODO: could we know which packages are statically linked??
                if (!target || !(yield exists(target))) {
                    // Try the dynamic-linked source directory
                    target = path.join(workspaceRelative, toWorkspaceDir(modulePath));
                    if (!(yield exists(target))) {
                        // Try the runfiles
                        target = runfiles.resolve(modulePath) || '<resolution failed>';
                    }
                }
                yield symlink(target, name);
            });
            for (const m of Object.keys(modules)) {
                links.push(linkModule(m, modules[m]));
            }
            yield Promise.all(links);
            return 0;
        });
    }
    exports.main = main;
    exports.runfiles = new Runfiles(process.env);
    if (require.main === module) {
        (() => __awaiter(this, void 0, void 0, function* () {
            process.exitCode = yield main(process.argv.slice(2), exports.runfiles);
        }))();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua19ub2RlX21vZHVsZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9pbnRlcm5hbC9saW5rZXIvbGlua19ub2RlX21vZHVsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUFBOzs7O09BSUc7SUFDSCx5QkFBeUI7SUFDekIsNkJBQTZCO0lBRTdCLGdFQUFnRTtJQUNoRSxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUVuRCxTQUFTLFdBQVcsQ0FBQyxHQUFHLENBQVc7UUFDakMsSUFBSSxZQUFZO1lBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxTQUFTLEtBQUssQ0FBQyxDQUFTO1FBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUM7Ozs7OztJQU1kLENBQUM7R0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBZSxPQUFPLENBQUMsTUFBYyxFQUFFLElBQVk7O1lBQ2pELFdBQVcsQ0FBQyxZQUFZLElBQUksT0FBTyxNQUFNLElBQUksQ0FBQyxDQUFDO1lBQy9DLHVFQUF1RTtZQUN2RSx3REFBd0Q7WUFDeEQsSUFBSTtnQkFDRixNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7YUFDckQ7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO29CQUN2QixNQUFNLENBQUMsQ0FBQztpQkFDVDtnQkFDRCx3RUFBd0U7Z0JBQ3hFLDJFQUEyRTtnQkFDM0UsNEVBQTRFO2FBQzdFO1lBRUQsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLDBDQUEwQztnQkFDMUMsMkVBQTJFO2dCQUMzRSx3QkFBd0I7Z0JBQ3hCLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUN4QixXQUFXLENBQ1Asa0RBQWtEO3dCQUNsRCxXQUFXLE9BQU8sQ0FBQyxHQUFHLEVBQUUsY0FBYyxNQUFNLE9BQU8sQ0FBQyxDQUFDO2lCQUMxRDthQUNGO1FBQ0gsQ0FBQztLQUFBO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMsV0FBVyxDQUFDLElBQXNCLEVBQUUsUUFBa0I7UUFDN0QsNkNBQTZDO1FBQzdDLGtFQUFrRTtRQUNsRSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ1QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLEVBQUU7Z0JBQ2xDLFdBQVcsQ0FBQyxpREFBaUQsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDOUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQzthQUM5QjtZQUNELE9BQU8sY0FBYyxDQUFDO1NBQ3ZCO1FBRUQscUVBQXFFO1FBQ3JFLHlFQUF5RTtRQUN6RSx3Q0FBd0M7UUFDeEMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwRCxJQUFJLFlBQVk7WUFBRSxPQUFPLFlBQVksQ0FBQztRQUV0QywrQ0FBK0M7UUFDL0Msc0RBQXNEO1FBQ3RELElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFO1lBQzlDLFdBQVcsQ0FBQyxtREFBbUQsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzlGLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDcEM7UUFFRCw2REFBNkQ7UUFDN0Qsd0ZBQXdGO1FBQ3hGLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUVELE1BQWEsUUFBUTtRQVNuQixZQUFZLEdBQXVCO1lBQ2pDLDREQUE0RDtZQUM1RCx1QkFBdUI7WUFDdkIsbUVBQW1FO1lBQ25FLGdFQUFnRTtZQUNoRSxzRUFBc0U7WUFDdEUseURBQXlEO1lBQ3pELElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFO2dCQUNuQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUUsQ0FBQyxDQUFDO2FBQzNFO2lCQUFNLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRTtnQkFDaEMsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUUsQ0FBQyxDQUFDO2FBQy9DO2lCQUFNO2dCQUNMLEtBQUssQ0FDRCw4R0FBOEcsQ0FBQyxDQUFDO2FBQ3JIO1lBQ0QsdURBQXVEO1lBQ3ZELHVDQUF1QztZQUN2QyxpRUFBaUU7WUFDakUsU0FBUztZQUNULElBQUksR0FBRyxDQUFDLHdCQUF3QixDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLEVBQUU7Z0JBQzNFLFdBQVcsQ0FBQzs7OztrRUFJZ0QsQ0FBQyxDQUFDO2FBQy9EO1lBRUQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDbkMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFO2dCQUN0QixnQ0FBZ0M7Z0JBQ2hDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQy9DO1FBQ0gsQ0FBQztRQUVELGVBQWUsQ0FBQyxHQUFXO1lBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUTtnQkFBRSxPQUFPLFNBQVMsQ0FBQztZQUVyQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDbEMsK0NBQStDO2dCQUMvQywyREFBMkQ7Z0JBQzNELElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsV0FBVyxDQUFDO29CQUFFLFNBQVM7Z0JBRTlDLG1CQUFtQjtnQkFDbkIscUNBQXFDO2dCQUNyQyx1REFBdUQ7Z0JBQ3ZELDBDQUEwQztnQkFDMUMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUNyQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7b0JBQ2hDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztpQkFDckM7YUFDRjtRQUNILENBQUM7UUFHRDs7Ozs7Ozs7V0FRRztRQUNILG9CQUFvQixDQUFDLFlBQW9CO1lBQ3ZDLFdBQVcsQ0FBQywyQkFBMkIsWUFBWSxFQUFFLENBQUMsQ0FBQztZQUV2RCxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLEVBQUMsUUFBUSxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUM7WUFFakUsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNwQyxJQUFJLENBQUMsSUFBSTtvQkFBRSxTQUFTO2dCQUNwQixNQUFNLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2pELGVBQWUsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQzdDO1lBRUQsT0FBTyxlQUFlLENBQUM7UUFDekIsQ0FBQztRQUVELE9BQU8sQ0FBQyxVQUFrQjtZQUN4Qiw2QkFBNkI7WUFDN0IsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO2dCQUNqQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDekM7WUFDRCx3RkFBd0Y7WUFDeEYsd0ZBQXdGO1lBQ3hGLElBQUksZ0JBQVEsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2hCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBUSxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQzthQUM1QztZQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsZ0NBQWdDLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELHNCQUFzQixDQUFDLFVBQWtCO1lBQ3ZDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLDBEQUEwRCxDQUFDLENBQUM7YUFDN0U7WUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7S0FDRjtJQTVHRCw0QkE0R0M7SUFTRCxrREFBa0Q7SUFDbEQsMEVBQTBFO0lBQzFFLFNBQWUsTUFBTSxDQUFDLENBQVM7O1lBQzdCLElBQUk7Z0JBQ0YsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDekIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUU7b0JBQ3ZCLE9BQU8sS0FBSyxDQUFDO2lCQUNkO2dCQUNELE1BQU0sQ0FBQyxDQUFDO2FBQ1Q7UUFDSCxDQUFDO0tBQUE7SUFFRCxTQUFzQixJQUFJLENBQUMsSUFBYyxFQUFFLFFBQWtCOztZQUMzRCxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxrRUFBa0UsQ0FBQyxDQUFDO1lBRXRGLE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDL0IsSUFBSSxFQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1lBQ25GLE9BQU8sR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO1lBQ3hCLFdBQVcsQ0FDUCw4QkFBOEIsU0FBUyxTQUFTLEdBQUcsVUFDL0MsSUFBSSw4QkFBOEIsRUFDdEMsT0FBTyxDQUFDLENBQUM7WUFFYixNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzVDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUVsRCxpREFBaUQ7WUFDakQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUV2Qyw2QkFBNkI7WUFDN0Isb0RBQW9EO1lBQ3BELG1CQUFtQjtZQUNuQixtREFBbUQ7WUFDbkQsU0FBUyxjQUFjLENBQUMsQ0FBUztnQkFDL0IsSUFBSSxDQUFDLEtBQUssU0FBUyxFQUFFO29CQUNuQixPQUFPLEdBQUcsQ0FBQztpQkFDWjtnQkFDRCw4REFBOEQ7Z0JBQzlELElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDLEVBQUU7b0JBQ2pDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO2lCQUMxQztnQkFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLENBQUM7WUFFRCxxRUFBcUU7WUFDckUsTUFBTSxPQUFPLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3ZDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFdkIsOEVBQThFO1lBQzlFLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFFM0Qsa0dBQWtHO1lBQ2xHLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUVqQixNQUFNLFVBQVUsR0FDWixDQUFPLElBQVksRUFBRSxVQUFrQixFQUFFLEVBQUU7Z0JBQzdDLHlDQUF5QztnQkFDekMsSUFBSSxNQUFNLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBRW5GLDhDQUE4QztnQkFDOUMsNkRBQTZEO2dCQUM3RCxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQSxNQUFNLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQSxFQUFFO29CQUNwQywwQ0FBMEM7b0JBQzFDLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO29CQUNsRSxJQUFJLENBQUMsQ0FBQSxNQUFNLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQSxFQUFFO3dCQUN6QixtQkFBbUI7d0JBQ25CLE1BQU0sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLHFCQUFxQixDQUFDO3FCQUNoRTtpQkFDRjtnQkFFRCxNQUFNLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUIsQ0FBQyxDQUFBLENBQUE7WUFFRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ3BDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3ZDO1lBRUQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXpCLE9BQU8sQ0FBQyxDQUFDO1FBQ1gsQ0FBQztLQUFBO0lBckVELG9CQXFFQztJQUVZLFFBQUEsUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUVsRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO1FBQzNCLENBQUMsR0FBUyxFQUFFO1lBQ1YsT0FBTyxDQUFDLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBUSxDQUFDLENBQUM7UUFDakUsQ0FBQyxDQUFBLENBQUMsRUFBRSxDQUFDO0tBQ04iLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgQ3JlYXRlcyBhIG5vZGVfbW9kdWxlcyBkaXJlY3RvcnkgaW4gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnlcbiAqIGFuZCBzeW1saW5rcyBpbiB0aGUgbm9kZSBtb2R1bGVzIG5lZWRlZCB0byBydW4gYSBwcm9ncmFtLlxuICogVGhpcyByZXBsYWNlcyB0aGUgbmVlZCBmb3IgY3VzdG9tIG1vZHVsZSByZXNvbHV0aW9uIGxvZ2ljIGluc2lkZSB0aGUgcHJvY2Vzcy5cbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gUnVuIEJhemVsIHdpdGggLS1kZWZpbmU9VkVSQk9TRV9MT0dTPTEgdG8gZW5hYmxlIHRoaXMgbG9nZ2luZ1xuY29uc3QgVkVSQk9TRV9MT0dTID0gISFwcm9jZXNzLmVudlsnVkVSQk9TRV9MT0dTJ107XG5cbmZ1bmN0aW9uIGxvZ192ZXJib3NlKC4uLm06IHN0cmluZ1tdKSB7XG4gIGlmIChWRVJCT1NFX0xPR1MpIGNvbnNvbGUuZXJyb3IoJ1tsaW5rX25vZGVfbW9kdWxlcy5qc10nLCAuLi5tKTtcbn1cblxuZnVuY3Rpb24gcGFuaWMobTogc3RyaW5nKSB7XG4gIHRocm93IG5ldyBFcnJvcihgSW50ZXJuYWwgZXJyb3IhIFBsZWFzZSBydW4gYWdhaW4gd2l0aFxuICAgLS1kZWZpbmU9VkVSQk9TRV9MT0c9MVxuYW5kIGZpbGUgYW4gaXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9iYXplbGJ1aWxkL3J1bGVzX25vZGVqcy9pc3N1ZXMvbmV3P3RlbXBsYXRlPWJ1Z19yZXBvcnQubWRcbkluY2x1ZGUgYXMgbXVjaCBvZiB0aGUgYnVpbGQgb3V0cHV0IGFzIHlvdSBjYW4gd2l0aG91dCBkaXNjbG9zaW5nIGFueXRoaW5nIGNvbmZpZGVudGlhbC5cblxuICBFcnJvcjpcbiAgJHttfVxuICBgKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc3ltbGluayh0YXJnZXQ6IHN0cmluZywgcGF0aDogc3RyaW5nKSB7XG4gIGxvZ192ZXJib3NlKGBzeW1saW5rKCAke3BhdGh9IC0+ICR7dGFyZ2V0fSApYCk7XG4gIC8vIFVzZSBqdW5jdGlvbiBvbiBXaW5kb3dzIHNpbmNlIHN5bWxpbmtzIHJlcXVpcmUgZWxldmF0ZWQgcGVybWlzc2lvbnMuXG4gIC8vIFdlIG9ubHkgbGluayB0byBkaXJlY3RvcmllcyBzbyBqdW5jdGlvbnMgd29yayBmb3IgdXMuXG4gIHRyeSB7XG4gICAgYXdhaXQgZnMucHJvbWlzZXMuc3ltbGluayh0YXJnZXQsIHBhdGgsICdqdW5jdGlvbicpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUuY29kZSAhPT0gJ0VFWElTVCcpIHtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICAgIC8vIFdlIGFzc3VtZSBoZXJlIHRoYXQgdGhlIHBhdGggaXMgYWxyZWFkeSBsaW5rZWQgdG8gdGhlIGNvcnJlY3QgdGFyZ2V0LlxuICAgIC8vIENvdWxkIGFkZCBzb21lIGxvZ2ljIHRoYXQgYXNzZXJ0cyBpdCBoZXJlLCBidXQgd2Ugd2FudCB0byBhdm9pZCBhbiBleHRyYVxuICAgIC8vIGZpbGVzeXN0ZW0gYWNjZXNzIHNvIHdlIHNob3VsZCBvbmx5IGRvIGl0IHVuZGVyIHNvbWUga2luZCBvZiBzdHJpY3QgbW9kZS5cbiAgfVxuXG4gIGlmIChWRVJCT1NFX0xPR1MpIHtcbiAgICAvLyBCZSB2ZXJib3NlIGFib3V0IGNyZWF0aW5nIGEgYmFkIHN5bWxpbmtcbiAgICAvLyBNYXliZSB0aGlzIHNob3VsZCBmYWlsIGluIHByb2R1Y3Rpb24gYXMgd2VsbCwgYnV0IGFnYWluIHdlIHdhbnQgdG8gYXZvaWRcbiAgICAvLyBhbnkgdW5uZWVkZWQgZmlsZSBJL09cbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMocGF0aCkpIHtcbiAgICAgIGxvZ192ZXJib3NlKFxuICAgICAgICAgICdFUlJPUlxcbioqKlxcbkxvb2tzIGxpa2Ugd2UgY3JlYXRlZCBhIGJhZCBzeW1saW5rOicgK1xuICAgICAgICAgIGBcXG4gIHB3ZCAke3Byb2Nlc3MuY3dkKCl9XFxuICB0YXJnZXQgJHt0YXJnZXR9XFxuKioqYCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmVzb2x2ZSBhIHJvb3QgZGlyZWN0b3J5IHN0cmluZyB0byB0aGUgYWN0dWFsIGxvY2F0aW9uIG9uIGRpc2tcbiAqIHdoZXJlIG5vZGVfbW9kdWxlcyB3YXMgaW5zdGFsbGVkXG4gKiBAcGFyYW0gcm9vdCBhIHN0cmluZyBsaWtlICducG0vbm9kZV9tb2R1bGVzJ1xuICovXG5mdW5jdGlvbiByZXNvbHZlUm9vdChyb290OiBzdHJpbmd8dW5kZWZpbmVkLCBydW5maWxlczogUnVuZmlsZXMpIHtcbiAgLy8gY3JlYXRlIGEgbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSBpZiBubyByb290XG4gIC8vIHRoaXMgd2lsbCBiZSB0aGUgY2FzZSBpZiBvbmx5IGZpcnN0LXBhcnR5IG1vZHVsZXMgYXJlIGluc3RhbGxlZFxuICBpZiAoIXJvb3QpIHtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICBsb2dfdmVyYm9zZSgnbm8gdGhpcmQtcGFydHkgcGFja2FnZXM7IG1rZGlyIG5vZGVfbW9kdWxlcyBpbiAnLCBwcm9jZXNzLmN3ZCgpKTtcbiAgICAgIGZzLm1rZGlyU3luYygnbm9kZV9tb2R1bGVzJyk7XG4gICAgfVxuICAgIHJldHVybiAnbm9kZV9tb2R1bGVzJztcbiAgfVxuXG4gIC8vIElmIHdlIGdvdCBhIHJ1bmZpbGVzTWFuaWZlc3QgbWFwLCBsb29rIHRocm91Z2ggaXQgZm9yIGEgcmVzb2x1dGlvblxuICAvLyBUaGlzIHdpbGwgaGFwcGVuIGlmIHdlIGFyZSBydW5uaW5nIGEgYmluYXJ5IHRoYXQgaGFkIHNvbWUgbnBtIHBhY2thZ2VzXG4gIC8vIFwic3RhdGljYWxseSBsaW5rZWRcIiBpbnRvIGl0cyBydW5maWxlc1xuICBjb25zdCBmcm9tTWFuaWZlc3QgPSBydW5maWxlcy5sb29rdXBEaXJlY3Rvcnkocm9vdCk7XG4gIGlmIChmcm9tTWFuaWZlc3QpIHJldHVybiBmcm9tTWFuaWZlc3Q7XG5cbiAgLy8gQWNjb3VudCBmb3IgQmF6ZWwgLS1sZWdhY3lfZXh0ZXJuYWxfcnVuZmlsZXNcbiAgLy8gd2hpY2ggbG9vayBsaWtlICdteV93a3NwL2V4dGVybmFsL25wbS9ub2RlX21vZHVsZXMnXG4gIGlmIChmcy5leGlzdHNTeW5jKHBhdGguam9pbignZXh0ZXJuYWwnLCByb290KSkpIHtcbiAgICBsb2dfdmVyYm9zZSgnRm91bmQgbGVnYWN5X2V4dGVybmFsX3J1bmZpbGVzLCBzd2l0Y2hpbmcgcm9vdCB0bycsIHBhdGguam9pbignZXh0ZXJuYWwnLCByb290KSk7XG4gICAgcmV0dXJuIHBhdGguam9pbignZXh0ZXJuYWwnLCByb290KTtcbiAgfVxuXG4gIC8vIFRoZSByZXBvc2l0b3J5IHNob3VsZCBiZSBsYXllZCBvdXQgaW4gdGhlIHBhcmVudCBkaXJlY3RvcnlcbiAgLy8gc2luY2UgYmF6ZWwgc2V0cyBvdXIgd29ya2luZyBkaXJlY3RvcnkgdG8gdGhlIHJlcG9zaXRvcnkgd2hlcmUgdGhlIGJ1aWxkIGlzIGhhcHBlbmluZ1xuICByZXR1cm4gcGF0aC5qb2luKCcuLicsIHJvb3QpO1xufVxuXG5leHBvcnQgY2xhc3MgUnVuZmlsZXMge1xuICBtYW5pZmVzdDogTWFwPHN0cmluZywgc3RyaW5nPnx1bmRlZmluZWQ7XG4gIGRpcjogc3RyaW5nfHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIElmIHRoZSBlbnZpcm9ubWVudCBnaXZlcyB1cyBlbm91Z2ggaGludHMsIHdlIGNhbiBrbm93IHRoZSBwYXRoIHRvIHRoZSBwYWNrYWdlXG4gICAqIGluIHRoZSBmb3JtIHdvcmtzcGFjZV9uYW1lL3BhdGgvdG8vcGFja2FnZVxuICAgKi9cbiAgcGFja2FnZVBhdGg6IHN0cmluZ3x1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoZW52OiB0eXBlb2YgcHJvY2Vzcy5lbnYpIHtcbiAgICAvLyBJZiBCYXplbCBzZXRzIGEgdmFyaWFibGUgcG9pbnRpbmcgdG8gYSBydW5maWxlcyBtYW5pZmVzdCxcbiAgICAvLyB3ZSdsbCBhbHdheXMgdXNlIGl0LlxuICAgIC8vIE5vdGUgdGhhdCB0aGlzIGhhcyBhIHNsaWdodCBwZXJmb3JtYW5jZSBpbXBsaWNhdGlvbiBvbiBNYWMvTGludXhcbiAgICAvLyB3aGVyZSB3ZSBjb3VsZCB1c2UgdGhlIHJ1bmZpbGVzIHRyZWUgYWxyZWFkeSBsYWlkIG91dCBvbiBkaXNrXG4gICAgLy8gYnV0IHRoaXMganVzdCBjb3N0cyBvbmUgZmlsZSByZWFkIGZvciB0aGUgZXh0ZXJuYWwgbnBtL25vZGVfbW9kdWxlc1xuICAgIC8vIGFuZCBvbmUgZm9yIGVhY2ggZmlyc3QtcGFydHkgbW9kdWxlLCBub3Qgb25lIHBlciBmaWxlLlxuICAgIGlmICghIWVudlsnUlVORklMRVNfTUFOSUZFU1RfRklMRSddKSB7XG4gICAgICB0aGlzLm1hbmlmZXN0ID0gdGhpcy5sb2FkUnVuZmlsZXNNYW5pZmVzdChlbnZbJ1JVTkZJTEVTX01BTklGRVNUX0ZJTEUnXSEpO1xuICAgIH0gZWxzZSBpZiAoISFlbnZbJ1JVTkZJTEVTX0RJUiddKSB7XG4gICAgICB0aGlzLmRpciA9IHBhdGgucmVzb2x2ZShlbnZbJ1JVTkZJTEVTX0RJUiddISk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhbmljKFxuICAgICAgICAgICdFdmVyeSBub2RlIHByb2dyYW0gcnVuIHVuZGVyIEJhemVsIG11c3QgaGF2ZSBhICRSVU5GSUxFU19ESVIgb3IgJFJVTkZJTEVTX01BTklGRVNUX0ZJTEUgZW52aXJvbm1lbnQgdmFyaWFibGUnKTtcbiAgICB9XG4gICAgLy8gVW5kZXIgLS1ub2VuYWJsZV9ydW5maWxlcyAoaW4gcGFydGljdWxhciBvbiBXaW5kb3dzKVxuICAgIC8vIEJhemVsIHNldHMgUlVORklMRVNfTUFOSUZFU1RfT05MWT0xLlxuICAgIC8vIFdoZW4gdGhpcyBoYXBwZW5zLCB3ZSBuZWVkIHRvIHJlYWQgdGhlIG1hbmlmZXN0IGZpbGUgdG8gbG9jYXRlXG4gICAgLy8gaW5wdXRzXG4gICAgaWYgKGVudlsnUlVORklMRVNfTUFOSUZFU1RfT05MWSddID09PSAnMScgJiYgIWVudlsnUlVORklMRVNfTUFOSUZFU1RfRklMRSddKSB7XG4gICAgICBsb2dfdmVyYm9zZShgV29ya2Fyb3VuZCBodHRwczovL2dpdGh1Yi5jb20vYmF6ZWxidWlsZC9iYXplbC9pc3N1ZXMvNzk5NFxuICAgICAgICAgICAgICAgICBSVU5GSUxFU19NQU5JRkVTVF9GSUxFIHNob3VsZCBoYXZlIGJlZW4gc2V0IGJ1dCB3YXNuJ3QuXG4gICAgICAgICAgICAgICAgIGZhbGxpbmcgYmFjayB0byB1c2luZyBydW5maWxlcyBzeW1saW5rcy5cbiAgICAgICAgICAgICAgICAgSWYgeW91IHdhbnQgdG8gdGVzdCBydW5maWxlcyBtYW5pZmVzdCBiZWhhdmlvciwgYWRkXG4gICAgICAgICAgICAgICAgIC0tc3Bhd25fc3RyYXRlZ3k9c3RhbmRhbG9uZSB0byB0aGUgY29tbWFuZCBsaW5lLmApO1xuICAgIH1cblxuICAgIGNvbnN0IHdrc3AgPSBlbnZbJ1RFU1RfV09SS1NQQUNFJ107XG4gICAgY29uc3QgdGFyZ2V0ID0gZW52WydURVNUX1RBUkdFVCddO1xuICAgIGlmICghIXdrc3AgJiYgISF0YXJnZXQpIHtcbiAgICAgIC8vIC8vcGF0aC90bzp0YXJnZXQgLT4gLy9wYXRoL3RvXG4gICAgICBjb25zdCBwa2cgPSB0YXJnZXQuc3BsaXQoJzonKVswXTtcbiAgICAgIHRoaXMucGFja2FnZVBhdGggPSBwYXRoLnBvc2l4LmpvaW4od2tzcCwgcGtnKTtcbiAgICB9XG4gIH1cblxuICBsb29rdXBEaXJlY3RvcnkoZGlyOiBzdHJpbmcpOiBzdHJpbmd8dW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMubWFuaWZlc3QpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiB0aGlzLm1hbmlmZXN0KSB7XG4gICAgICAvLyBBY2NvdW50IGZvciBCYXplbCAtLWxlZ2FjeV9leHRlcm5hbF9ydW5maWxlc1xuICAgICAgLy8gd2hpY2ggcG9sbHV0ZXMgdGhlIHdvcmtzcGFjZSB3aXRoICdteV93a3NwL2V4dGVybmFsLy4uLidcbiAgICAgIGlmIChrLnN0YXJ0c1dpdGgoYCR7ZGlyfS9leHRlcm5hbGApKSBjb250aW51ZTtcblxuICAgICAgLy8gRW50cnkgbG9va3MgbGlrZVxuICAgICAgLy8gazogbnBtL25vZGVfbW9kdWxlcy9zZW12ZXIvTElDRU5TRVxuICAgICAgLy8gdjogL3BhdGgvdG8vZXh0ZXJuYWwvbnBtL25vZGVfbW9kdWxlcy9zZW12ZXIvTElDRU5TRVxuICAgICAgLy8gY2FsY3VsYXRlIGwgPSBsZW5ndGgoYC9zZW12ZXIvTElDRU5TRWApXG4gICAgICBpZiAoay5zdGFydHNXaXRoKGRpcikpIHtcbiAgICAgICAgY29uc3QgbCA9IGsubGVuZ3RoIC0gZGlyLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHYuc3Vic3RyaW5nKDAsIHYubGVuZ3RoIC0gbCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cblxuICAvKipcbiAgICogVGhlIHJ1bmZpbGVzIG1hbmlmZXN0IG1hcHMgZnJvbSBzaG9ydF9wYXRoXG4gICAqIGh0dHBzOi8vZG9jcy5iYXplbC5idWlsZC92ZXJzaW9ucy9tYXN0ZXIvc2t5bGFyay9saWIvRmlsZS5odG1sI3Nob3J0X3BhdGhcbiAgICogdG8gdGhlIGFjdHVhbCBsb2NhdGlvbiBvbiBkaXNrIHdoZXJlIHRoZSBmaWxlIGNhbiBiZSByZWFkLlxuICAgKlxuICAgKiBJbiBhIHNhbmRib3hlZCBleGVjdXRpb24sIGl0IGRvZXMgbm90IGV4aXN0LiBJbiB0aGF0IGNhc2UsIHJ1bmZpbGVzIG11c3QgYmVcbiAgICogcmVzb2x2ZWQgZnJvbSBhIHN5bWxpbmsgdHJlZSB1bmRlciB0aGUgcnVuZmlsZXMgZGlyLlxuICAgKiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvYmF6ZWwvaXNzdWVzLzM3MjZcbiAgICovXG4gIGxvYWRSdW5maWxlc01hbmlmZXN0KG1hbmlmZXN0UGF0aDogc3RyaW5nKSB7XG4gICAgbG9nX3ZlcmJvc2UoYHVzaW5nIHJ1bmZpbGVzIG1hbmlmZXN0ICR7bWFuaWZlc3RQYXRofWApO1xuXG4gICAgY29uc3QgcnVuZmlsZXNFbnRyaWVzID0gbmV3IE1hcCgpO1xuICAgIGNvbnN0IGlucHV0ID0gZnMucmVhZEZpbGVTeW5jKG1hbmlmZXN0UGF0aCwge2VuY29kaW5nOiAndXRmLTgnfSk7XG5cbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgaW5wdXQuc3BsaXQoJ1xcbicpKSB7XG4gICAgICBpZiAoIWxpbmUpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgW3J1bmZpbGVzUGF0aCwgcmVhbFBhdGhdID0gbGluZS5zcGxpdCgnICcpO1xuICAgICAgcnVuZmlsZXNFbnRyaWVzLnNldChydW5maWxlc1BhdGgsIHJlYWxQYXRoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcnVuZmlsZXNFbnRyaWVzO1xuICB9XG5cbiAgcmVzb2x2ZShtb2R1bGVQYXRoOiBzdHJpbmcpIHtcbiAgICAvLyBMb29rIGluIHRoZSBydW5maWxlcyBmaXJzdFxuICAgIGlmICh0aGlzLm1hbmlmZXN0KSB7XG4gICAgICByZXR1cm4gdGhpcy5sb29rdXBEaXJlY3RvcnkobW9kdWxlUGF0aCk7XG4gICAgfVxuICAgIC8vIGhvdyBjYW4gd2UgYXZvaWQgdGhpcyBGUyBsb29rdXAgZXZlcnkgdGltZT8gd2UgZG9uJ3Qga25vdyB3aGVuIHByb2Nlc3MuY3dkIGNoYW5nZWQuLi5cbiAgICAvLyBjb25zdCBydW5maWxlc1JlbGF0aXZlID0gcnVuZmlsZXMuZGlyID8gcGF0aC5yZWxhdGl2ZSgnLicsIHJ1bmZpbGVzLmRpcikgOiB1bmRlZmluZWQ7XG4gICAgaWYgKHJ1bmZpbGVzLmRpcikge1xuICAgICAgcmV0dXJuIHBhdGguam9pbihydW5maWxlcy5kaXIsIG1vZHVsZVBhdGgpO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYGNvdWxkIG5vdCByZXNvbHZlIG1vZHVsZVBhdGggJHttb2R1bGVQYXRofWApO1xuICB9XG5cbiAgcmVzb2x2ZVBhY2thZ2VSZWxhdGl2ZShtb2R1bGVQYXRoOiBzdHJpbmcpIHtcbiAgICBpZiAoIXRoaXMucGFja2FnZVBhdGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigncGFja2FnZVBhdGggY291bGQgbm90IGJlIGRldGVybWluZWQgZnJvbSB0aGUgZW52aXJvbm1lbnQnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVzb2x2ZShwYXRoLnBvc2l4LmpvaW4odGhpcy5wYWNrYWdlUGF0aCwgbW9kdWxlUGF0aCkpO1xuICB9XG59XG5cbi8vIFR5cGVTY3JpcHQgbGliLmVzNS5kLnRzIGhhcyBhIG1pc3Rha2U6IEpTT04ucGFyc2UgZG9lcyBhY2NlcHQgQnVmZmVyLlxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgSlNPTiB7XG4gICAgcGFyc2UoYjoge3RvU3RyaW5nOiAoKSA9PiBzdHJpbmd9KTogYW55O1xuICB9XG59XG5cbi8vIFRoZXJlIGlzIG5vIGZzLnByb21pc2VzLmV4aXN0cyBmdW5jdGlvbiBiZWNhdXNlXG4vLyBub2RlIGNvcmUgaXMgb2YgdGhlIG9waW5pb24gdGhhdCBleGlzdHMgaXMgYWx3YXlzIHRvbyByYWNleSB0byByZWx5IG9uLlxuYXN5bmMgZnVuY3Rpb24gZXhpc3RzKHA6IHN0cmluZykge1xuICB0cnkge1xuICAgIGF3YWl0IGZzLnByb21pc2VzLnN0YXQocClcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChlLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRocm93IGU7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1haW4oYXJnczogc3RyaW5nW10sIHJ1bmZpbGVzOiBSdW5maWxlcykge1xuICBpZiAoIWFyZ3MgfHwgYXJncy5sZW5ndGggPCAxKVxuICAgIHRocm93IG5ldyBFcnJvcignbGlua19ub2RlX21vZHVsZXMuanMgcmVxdWlyZXMgb25lIGFyZ3VtZW50OiBtb2R1bGVzTWFuaWZlc3QgcGF0aCcpO1xuXG4gIGNvbnN0IFttb2R1bGVzTWFuaWZlc3RdID0gYXJncztcbiAgbGV0IHtiaW4sIHJvb3QsIG1vZHVsZXMsIHdvcmtzcGFjZX0gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhtb2R1bGVzTWFuaWZlc3QpKTtcbiAgbW9kdWxlcyA9IG1vZHVsZXMgfHwge307XG4gIGxvZ192ZXJib3NlKFxuICAgICAgYG1vZHVsZSBtYW5pZmVzdDogd29ya3NwYWNlICR7d29ya3NwYWNlfSwgYmluICR7YmlufSwgcm9vdCAke1xuICAgICAgICAgIHJvb3R9IHdpdGggZmlyc3QtcGFydHkgcGFja2FnZXNcXG5gLFxuICAgICAgbW9kdWxlcyk7XG5cbiAgY29uc3Qgcm9vdERpciA9IHJlc29sdmVSb290KHJvb3QsIHJ1bmZpbGVzKTtcbiAgbG9nX3ZlcmJvc2UoJ3Jlc29sdmVkIHJvb3QnLCByb290LCAndG8nLCByb290RGlyKTtcblxuICAvLyBCYXplbCBzdGFydHMgYWN0aW9ucyB3aXRoIHB3ZD1leGVjcm9vdC9teV93a3NwXG4gIGNvbnN0IHdvcmtzcGFjZURpciA9IHBhdGgucmVzb2x2ZSgnLicpO1xuXG4gIC8vIENvbnZlcnQgZnJvbSBydW5maWxlcyBwYXRoXG4gIC8vIHRoaXNfd2tzcC9wYXRoL3RvL2ZpbGUgT1Igb3RoZXJfd2tzcC9wYXRoL3RvL2ZpbGVcbiAgLy8gdG8gZXhlY3Jvb3QgcGF0aFxuICAvLyBwYXRoL3RvL2ZpbGUgT1IgZXh0ZXJuYWwvb3RoZXJfd2tzcC9wYXRoL3RvL2ZpbGVcbiAgZnVuY3Rpb24gdG9Xb3Jrc3BhY2VEaXIocDogc3RyaW5nKSB7XG4gICAgaWYgKHAgPT09IHdvcmtzcGFjZSkge1xuICAgICAgcmV0dXJuICcuJztcbiAgICB9XG4gICAgLy8gVGhlIG1hbmlmZXN0IGlzIHdyaXR0ZW4gd2l0aCBmb3J3YXJkIHNsYXNoIG9uIGFsbCBwbGF0Zm9ybXNcbiAgICBpZiAocC5zdGFydHNXaXRoKHdvcmtzcGFjZSArICcvJykpIHtcbiAgICAgIHJldHVybiBwLnN1YnN0cmluZyh3b3Jrc3BhY2UubGVuZ3RoICsgMSk7XG4gICAgfVxuICAgIHJldHVybiBwYXRoLmpvaW4oJ2V4dGVybmFsJywgcCk7XG4gIH1cblxuICAvLyBDcmVhdGUgdGhlICRwd2Qvbm9kZV9tb2R1bGVzIGRpcmVjdG9yeSB0aGF0IG5vZGUgd2lsbCByZXNvbHZlIGZyb21cbiAgYXdhaXQgc3ltbGluayhyb290RGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gIHByb2Nlc3MuY2hkaXIocm9vdERpcik7XG5cbiAgLy8gU3ltbGlua3MgdG8gcGFja2FnZXMgbmVlZCB0byByZWFjaCBiYWNrIHRvIHRoZSB3b3Jrc3BhY2UvcnVuZmlsZXMgZGlyZWN0b3J5XG4gIGNvbnN0IHdvcmtzcGFjZVJlbGF0aXZlID0gcGF0aC5yZWxhdGl2ZSgnLicsIHdvcmtzcGFjZURpcik7XG5cbiAgLy8gTm93IGFkZCBzeW1saW5rcyB0byBlYWNoIG9mIG91ciBmaXJzdC1wYXJ0eSBwYWNrYWdlcyBzbyB0aGV5IGFwcGVhciB1bmRlciB0aGUgbm9kZV9tb2R1bGVzIHRyZWVcbiAgY29uc3QgbGlua3MgPSBbXTtcblxuICBjb25zdCBsaW5rTW9kdWxlID1cbiAgICAgIGFzeW5jIChuYW1lOiBzdHJpbmcsIG1vZHVsZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIC8vIEZpcnN0IHRyeSBkeW5hbWljLWxpbmtlZCBiaW4gZGlyZWN0b3J5XG4gICAgbGV0IHRhcmdldDogc3RyaW5nID0gcGF0aC5qb2luKHdvcmtzcGFjZVJlbGF0aXZlLCBiaW4sIHRvV29ya3NwYWNlRGlyKG1vZHVsZVBhdGgpKTtcbiAgXG4gICAgLy8gSXQgc3Vja3MgdGhhdCB3ZSBoYXZlIHRvIGRvIGEgRlMgY2FsbCBoZXJlLlxuICAgIC8vIFRPRE86IGNvdWxkIHdlIGtub3cgd2hpY2ggcGFja2FnZXMgYXJlIHN0YXRpY2FsbHkgbGlua2VkPz9cbiAgICBpZiAoIXRhcmdldCB8fCAhYXdhaXQgZXhpc3RzKHRhcmdldCkpIHtcbiAgICAgIC8vIFRyeSB0aGUgZHluYW1pYy1saW5rZWQgc291cmNlIGRpcmVjdG9yeVxuICAgICAgdGFyZ2V0ID0gcGF0aC5qb2luKHdvcmtzcGFjZVJlbGF0aXZlLCB0b1dvcmtzcGFjZURpcihtb2R1bGVQYXRoKSk7XG4gICAgICBpZiAoIWF3YWl0IGV4aXN0cyh0YXJnZXQpKSB7XG4gICAgICAgIC8vIFRyeSB0aGUgcnVuZmlsZXNcbiAgICAgICAgdGFyZ2V0ID0gcnVuZmlsZXMucmVzb2x2ZShtb2R1bGVQYXRoKSB8fCAnPHJlc29sdXRpb24gZmFpbGVkPic7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXdhaXQgc3ltbGluayh0YXJnZXQsIG5hbWUpO1xuICB9XG5cbiAgZm9yIChjb25zdCBtIG9mIE9iamVjdC5rZXlzKG1vZHVsZXMpKSB7XG4gICAgbGlua3MucHVzaChsaW5rTW9kdWxlKG0sIG1vZHVsZXNbbV0pKTtcbiAgfVxuXG4gIGF3YWl0IFByb21pc2UuYWxsKGxpbmtzKTtcblxuICByZXR1cm4gMDtcbn1cblxuZXhwb3J0IGNvbnN0IHJ1bmZpbGVzID0gbmV3IFJ1bmZpbGVzKHByb2Nlc3MuZW52KTtcblxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIChhc3luYyAoKSA9PiB7XG4gICAgcHJvY2Vzcy5leGl0Q29kZSA9IGF3YWl0IG1haW4ocHJvY2Vzcy5hcmd2LnNsaWNlKDIpLCBydW5maWxlcyk7XG4gIH0pKCk7XG59XG4iXX0=