import * as ts from 'typescript';

/**
 * The list of supported patterns useable in ConformancePatternRule. The
 * patterns whose name match JSConformance patterns should behave similarly (see
 * https://github.com/google/closure-compiler/wiki/JS-Conformance-Framework)
 */
export enum PatternKind {
  BANNED_NAME = 'banned-name',
  BANNED_PROPERTY_WRITE = 'banned-property-write',
  BANNED_PROPERTY_NON_CONSTANT_WRITE = 'banned-property-non-constant-write'
}

/**
 * A config for ConformancePatternRule.
 */
export interface Config<P extends PatternKind> {
  kind: P;

  /**
   * Values have a pattern-specific syntax.
   *
   * TODO(rjamet): We'll document them, but for now see each patternKind's tests
   * for examples.
   */
  values: string[];

  /** The error message this pattern will create. */
  errorMessage: string;

  /** A list of whitelist blocks. */
  whitelistEntries?: WhitelistEntry[];
}

/**
 * A whitelist entry, corresponding to a logical whitelisting rule. Use these to
 * distinguish between various logical reasons for whitelisting something: for
 * instance, tie these to particular bugs that needed whitelisting, per legacy
 * project, manually reviewed entries, and so on.
 *
 * Whitelists are based on the file paths provided by the TS compiler, with both
 * regexp-based checks and prefix-based checks.
 *
 *
 * Follows the logic in
 * https://github.com/google/closure-compiler/blob/master/src/com/google/javascript/jscomp/conformance.proto.
 */
export interface WhitelistEntry {
  /** The category corresponding to this entry. */
  reason: WhitelistReason;
  /** Why is this okay to whitelist. */
  explanation?: string;

  /**
   * Regexps for the paths of files that will be ignored by the
   * ConformancePattern. Beware, escaping can be tricky.
   */
  regexp?: string[];
  /**
   * Prefixes for the paths of files that will be ignored by the
   * ConformancePattern.
   */
  prefix?: string[];
}

/**
 * The categories of whitelist entries.
 */
export enum WhitelistReason {
  /** No reason. */
  UNSPECIFIED,
  /** Code that has to be grandfathered in (no guarantees). */
  LEGACY,
  /**
   * Code that does not enter the scope of this particular check  (no
   * guarantees).
   */
  OUT_OF_SCOPE,
  /** Manually reviewed exceptions (supposedly okay). */
  MANUALLY_REVIEWED
}

/** Maps the type of nodes that each `PatternType` consumes. */
export interface MatchedNodeTypes {
  [PatternKind.BANNED_PROPERTY_WRITE]: ts.BinaryExpression;
  [PatternKind.BANNED_PROPERTY_NON_CONSTANT_WRITE]: ts.BinaryExpression;
  [PatternKind.BANNED_NAME]: ts.Identifier;
}
