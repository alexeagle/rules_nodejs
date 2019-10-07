/* THIS FILE GENERATED FROM .ts; see BUILD.bazel */ /* clang-format off */"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
var _this = this;
exports.__esModule = true;
/**
 * @fileoverview Creates a node_modules directory in the current working directory
 * and symlinks in the node modules needed to run a program.
 * This replaces the need for custom module resolution logic inside the process.
 */
var fs = require("fs");
var path = require("path");
// Run Bazel with --define=VERBOSE_LOGS=1 to enable this logging
var VERBOSE_LOGS = !!process.env['VERBOSE_LOGS'];
function log_verbose() {
    var m = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        m[_i] = arguments[_i];
    }
    if (VERBOSE_LOGS)
        console.error.apply(console, __spread(['[link_node_modules.js]'], m));
}
function panic(m) {
    throw new Error("Internal error! Please run again with\n   --define=VERBOSE_LOG=1\nand file an issue: https://github.com/bazelbuild/rules_nodejs/issues/new?template=bug_report.md\nInclude as much of the build output as you can without disclosing anything confidential.\n\n  Error:\n  " + m + "\n  ");
}
/**
 * Create a new directory and any necessary subdirectories
 * if they do not exist.
 */
function mkdirp(p) {
    if (!fs.existsSync(p)) {
        mkdirp(path.dirname(p));
        fs.mkdirSync(p);
    }
}
function symlink(target, path) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    log_verbose("symlink( " + path + " -> " + target + " )");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fs.promises.symlink(target, path, 'junction')];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    if (e_1.code !== 'EEXIST') {
                        throw e_1;
                    }
                    return [3 /*break*/, 4];
                case 4:
                    if (VERBOSE_LOGS) {
                        // Be verbose about creating a bad symlink
                        // Maybe this should fail in production as well, but again we want to avoid
                        // any unneeded file I/O
                        if (!fs.existsSync(path)) {
                            log_verbose('ERROR\n***\nLooks like we created a bad symlink:' +
                                ("\n  pwd " + process.cwd() + "\n  target " + target + "\n  path " + path + "\n***"));
                        }
                    }
                    return [2 /*return*/];
            }
        });
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
    var fromManifest = runfiles.lookupDirectory(root);
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
var Runfiles = /** @class */ (function () {
    function Runfiles(env) {
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
            log_verbose("Workaround https://github.com/bazelbuild/bazel/issues/7994\n                 RUNFILES_MANIFEST_FILE should have been set but wasn't.\n                 falling back to using runfiles symlinks.\n                 If you want to test runfiles manifest behavior, add\n                 --spawn_strategy=standalone to the command line.");
        }
        var wksp = env['TEST_WORKSPACE'];
        var target = env['TEST_TARGET'];
        if (!!wksp && !!target) {
            // //path/to:target -> //path/to
            var pkg = target.split(':')[0];
            this.packagePath = path.posix.join(wksp, pkg);
        }
    }
    Runfiles.prototype.lookupDirectory = function (dir) {
        var e_2, _a;
        if (!this.manifest)
            return undefined;
        try {
            for (var _b = __values(this.manifest), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), k = _d[0], v = _d[1];
                // Account for Bazel --legacy_external_runfiles
                // which pollutes the workspace with 'my_wksp/external/...'
                if (k.startsWith(dir + "/external"))
                    continue;
                // Entry looks like
                // k: npm/node_modules/semver/LICENSE
                // v: /path/to/external/npm/node_modules/semver/LICENSE
                // calculate l = length(`/semver/LICENSE`)
                if (k.startsWith(dir)) {
                    var l = k.length - dir.length;
                    return v.substring(0, v.length - l);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
    };
    /**
     * The runfiles manifest maps from short_path
     * https://docs.bazel.build/versions/master/skylark/lib/File.html#short_path
     * to the actual location on disk where the file can be read.
     *
     * In a sandboxed execution, it does not exist. In that case, runfiles must be
     * resolved from a symlink tree under the runfiles dir.
     * See https://github.com/bazelbuild/bazel/issues/3726
     */
    Runfiles.prototype.loadRunfilesManifest = function (manifestPath) {
        var e_3, _a;
        log_verbose("using runfiles manifest " + manifestPath);
        var runfilesEntries = new Map();
        var input = fs.readFileSync(manifestPath, { encoding: 'utf-8' });
        try {
            for (var _b = __values(input.split('\n')), _c = _b.next(); !_c.done; _c = _b.next()) {
                var line = _c.value;
                if (!line)
                    continue;
                var _d = __read(line.split(' '), 2), runfilesPath = _d[0], realPath = _d[1];
                runfilesEntries.set(runfilesPath, realPath);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return runfilesEntries;
    };
    Runfiles.prototype.resolve = function (modulePath) {
        // Look in the runfiles first
        if (this.manifest) {
            return this.lookupDirectory(modulePath);
        }
        if (exports.runfiles.dir) {
            return path.join(exports.runfiles.dir, modulePath);
        }
        throw new Error("could not resolve modulePath " + modulePath);
    };
    Runfiles.prototype.resolvePackageRelative = function (modulePath) {
        if (!this.packagePath) {
            throw new Error('packagePath could not be determined from the environment');
        }
        return this.resolve(path.posix.join(this.packagePath, modulePath));
    };
    return Runfiles;
}());
exports.Runfiles = Runfiles;
// There is no fs.promises.exists function because
// node core is of the opinion that exists is always too racey to rely on.
function exists(p) {
    return __awaiter(this, void 0, void 0, function () {
        var e_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs.promises.stat(p)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    e_4 = _a.sent();
                    if (e_4.code === 'ENOENT') {
                        return [2 /*return*/, false];
                    }
                    throw e_4;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function main(args, runfiles) {
    return __awaiter(this, void 0, void 0, function () {
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
        var e_5, _a, _b, modulesManifest, _c, bin, root, modules, workspace, rootDir, workspaceDir, workspaceAbs, links, linkModule, _d, _e, m, segments, _f, kind, modulePath, code;
        var _this = this;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    if (!args || args.length < 1)
                        throw new Error('link_node_modules.js requires one argument: modulesManifest path');
                    _b = __read(args, 1), modulesManifest = _b[0];
                    _c = JSON.parse(fs.readFileSync(modulesManifest)), bin = _c.bin, root = _c.root, modules = _c.modules, workspace = _c.workspace;
                    modules = modules || {};
                    log_verbose("module manifest: workspace " + workspace + ", bin " + bin + ", root " + root + " with first-party packages\n", modules);
                    rootDir = resolveRoot(root, runfiles);
                    log_verbose('resolved root', root, 'to', rootDir);
                    workspaceDir = path.resolve('.');
                    // Create the $pwd/node_modules directory that node will resolve from
                    return [4 /*yield*/, symlink(rootDir, 'node_modules')];
                case 1:
                    // Create the $pwd/node_modules directory that node will resolve from
                    _g.sent();
                    process.chdir(rootDir);
                    workspaceAbs = path.resolve(workspaceDir);
                    links = [];
                    linkModule = function (name, root, modulePath) { return __awaiter(_this, void 0, void 0, function () {
                        var target, _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    target = '<package linking failed>';
                                    _a = root;
                                    switch (_a) {
                                        case 'bin': return [3 /*break*/, 1];
                                        case 'src': return [3 /*break*/, 3];
                                        case 'runfiles': return [3 /*break*/, 4];
                                    }
                                    return [3 /*break*/, 5];
                                case 1:
                                    // FIXME(#1196)
                                    target = path.join(workspaceAbs, bin, toWorkspaceDir(modulePath));
                                    return [4 /*yield*/, exists(target)];
                                case 2:
                                    // Spend an extra FS lookup to give better error in this case
                                    if (!(_b.sent())) {
                                        // TODO: there should be some docs explaining how users are
                                        // expected to declare ahead of time where the package is loaded,
                                        // how that relates to npm link scenarios,
                                        // and where the configuration can go.
                                        return [2 /*return*/, Promise.reject("ERROR: no output directory found for package " + modulePath + "\n        Did you mean to declare this as a from-source package?\n        See https://github.com/bazelbuild/rules_nodejs/pull/1197\n        until this feature is properly documented.")];
                                    }
                                    return [3 /*break*/, 5];
                                case 3:
                                    target = path.join(workspaceAbs, toWorkspaceDir(modulePath));
                                    return [3 /*break*/, 5];
                                case 4:
                                    target = runfiles.resolve(modulePath) || '<runfiles resolution failed>';
                                    return [3 /*break*/, 5];
                                case 5: return [4 /*yield*/, symlink(target, name)];
                                case 6:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    try {
                        for (_d = __values(Object.keys(modules)), _e = _d.next(); !_e.done; _e = _d.next()) {
                            m = _e.value;
                            segments = m.split('/');
                            if (segments.length > 2) {
                                throw new Error("module " + m + " has more than 2 segments which is not a valid node module name");
                            }
                            if (segments.length == 2) {
                                // ensure the scope exists
                                mkdirp(segments[0]);
                            }
                            _f = __read(modules[m], 2), kind = _f[0], modulePath = _f[1];
                            links.push(linkModule(m, kind, modulePath));
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (_e && !_e.done && (_a = _d["return"])) _a.call(_d);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                    code = 0;
                    return [4 /*yield*/, Promise.all(links)["catch"](function (e) {
                            console.error(e);
                            code = 1;
                        })];
                case 2:
                    _g.sent();
                    return [2 /*return*/, code];
            }
        });
    });
}
exports.main = main;
exports.runfiles = new Runfiles(process.env);
if (require.main === module) {
    (function () { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = process;
                    return [4 /*yield*/, main(process.argv.slice(2), exports.runfiles)];
                case 1:
                    _a.exitCode = _b.sent();
                    return [2 /*return*/];
            }
        });
    }); })();
}
