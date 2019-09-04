# For Developers

We strongly encourage you to review the project's scope described in the `README.md` file before working on new features. For large changes, consider writing a design document using [this template](https://goo.gl/YCQttR).

## Testing locally

This repository contains nested workspaces which are tested with the bazel-in-bazel bazel_integration_test rule. The integration tests must be run in series as they use up too many resources when run in parallel.

`bazel test ...` includes all these integration tests so if you want to run all tests except the integration tests you can use `bazel test ... --test_tag_filters=-e2e,-examples`. A shortcut for this is `yarn test`.

When running the e2e tests, it is recommended to tune the memory usage of Bazel locally. This can be done with `bazel --host_jvm_args=-Xms256m --host_jvm_args=-Xmx1280m test ... --test_tag_filters=e2e --local_resources=792,1.0,1.0 --test_arg=--local_resources=13288,1.0,1.0`. A shortcut for this is `yarn test_e2e`.

Similarly, for test examples run  `bazel --host_jvm_args=-Xms256m --host_jvm_args=-Xmx1280m test ... --test_tag_filters=examples --local_resources=792,1.0,1.0 --test_arg=--local_resources=13288,1.0,1.0`. A shortcut for this is `yarn test_examples`.

To test all targets locally in the main workspace and in all nested workspaces run:

```
yarn test_all
```

To do a full clean run:

```
yarn clean_all
```

## Testing on Windows

If you're not a Windows user, it's daunting to get a CI failure that seems it will take hours to reproduce and debug.
Here's one recipe to get up and running in about an hour:

1. In a Google Cloud project (I'm using Angular's devinfra project internal-200822) you add a compute VM instance: https://console.cloud.google.com/compute/instancesAdd?project=internal-200822
1. Pick a region that's near you
1. Change Boot disk to Windows with Desktop, I used "Windows Server 2019 Datacenter Server with Desktop Experience, x64 built on 20190827". Other defaults are okay.
1. Choose to set a password for your user account
1. After the instance boots, use the RDP button on the instance page. It will pop up a Chrome extension to run the remote desktop protocol.
1. Once you're logged in, use IE11 (yeah, seems like the only choice?) to install:
- GitHub Desktop https://desktop.github.com (because setting up auth is too hard otherwise)
- Visual C++ redistro https://www.microsoft.com/en-us/download/details.aspx?id=48145
- MSYS2 from https://msys2.org
- Open a `cmd.exe` shell and run `msys2` to open another shell, then `pacman -S zip unzip patch diffutils git` in there

Prereqs are done, so now you:

- In a powershell with admin enabled, `choco install bazel`

Now you should be able to

1. Clone your fork/branch with GitHub Desktop app
1. start a `cmd.exe` shell
1. run your `bazel build ...`

## Releasing

Start from a clean checkout at master/HEAD.

Note: if you are using a new clone, you'll need to configure `git-clang-format` to be able to commit the release:

1. `git config clangFormat.binary node_modules/.bin/clang-format`
1. `git config clangFormat.style file`

Googlers: you should npm login using the go/npm-publish service: `$ npm login --registry https://wombat-dressing-room.appspot.com`

Check if there are any breaking changes since the last tag - if so, this will be a minor, if not it's a patch.
(This may not sound like semver, but since our major version is a zero, the rule is that minors are breaking changes and patches are new features.)

1. `yarn install`
1. Re-generate the API docs: `yarn skydoc`
1. `git add docs/` (in case new files were created)
1. `git commit -a -m 'docs: update docs for release'`
1. `npm version minor` (replace `minor` with `patch` if no breaking changes)
1. Build npm packages and publish them: `./scripts/publish_release.sh`
1. `git push upstream && git push upstream --tags`
1. (Manual for now): go to the [releases] page, edit the release with rough changelog (especially note any breaking changes!) and upload the release artifact from `rules_nodejs-[version].tar.gz` 
1. Announce the release on Angular slack in `#tools-abc-discuss`

[releases]: https://github.com/bazelbuild/rules_nodejs/releases
