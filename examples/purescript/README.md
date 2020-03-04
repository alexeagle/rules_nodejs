# PureScript Bazel example

[PureScript](http://www.purescript.org/) is a strongly-typed functional programming language that compiles to JavaScript.

## Options for hosting the PureScript toolchain

PureScript has a few layers of build tooling:

- spago: PureScript package manager and build tool powered by Dhall and package-sets.
  - Dhall is a programmable configuration language optimized for maintainability.
  - package-sets is a curated list of PureScript packages for Psc-Package and Spago.
- Pulp: A build tool for PureScript, contributed by community.
- purs: the compiler maintained by the PureScript team

The PureScript community generally uses Bower as the package manager, rather than npm/yarn.

## Tasks to get this working

- [ ] https://www.npmjs.com/package/purescript#installation says that purescript needs to do non-hermetic things during install like download binaries.
