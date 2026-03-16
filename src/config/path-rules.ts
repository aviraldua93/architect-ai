/**
 * Task 3.3: Path-Specific Rules — Scoped Configuration via Glob Patterns
 *
 * Path rules are scoped, not global. A rule for *.test.ts won't affect
 * production code. This is how teams enforce different standards for different
 * parts of the codebase without a single monolithic ruleset.
 *
 * Rule files live in `.claude/rules/` and follow a naming convention:
 *   .claude/rules/testing.md          → rules about test files
 *   .claude/rules/frontend-styles.md  → rules about CSS/styling
 *   .claude/rules/api-security.md     → rules about API endpoints
 *
 * Each rule file contains:
 *   1. A glob pattern (in a special `globs:` frontmatter field or as a heading).
 *   2. A list of rules that apply when the pattern matches.
 *
 * Exam concepts:
 * - Path rules are ADDITIVE to CLAUDE.md rules — they don't replace them.
 * - When multiple patterns match a file, all matching rules are combined.
 * - Glob syntax: `*` matches within a directory, `**` matches across dirs,
 *   `{a,b}` matches alternatives, `?` matches a single character.
 * - Rule precedence: CLAUDE.md rules first, then path-specific rules in
 *   alphabetical order of the rule filenames.
 * - `.claude/rules/` is project-scoped; `~/.claude/rules/` is user-scoped.
 *
 * @module config/path-rules
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * A single path-scoped rule entry.
 *
 * Exam trap: `pattern` is a glob string, NOT a regex. Students often confuse
 * `*.ts` (glob: all .ts files in current dir) with `/.*\.ts$/` (regex).
 * In Claude Code, patterns are always globs.
 */
export interface PathRule {
  /** Glob pattern that determines which files this rule applies to */
  pattern: string;

  /** Array of rule strings that apply when the pattern matches */
  rules: string[];

  /** Absolute path to the rule file this was loaded from */
  source: string;
}

/**
 * Result of matching a file path against all loaded path rules.
 */
export interface PathRuleMatch {
  /** The file that was matched */
  filePath: string;

  /** All rules that apply, in order of precedence */
  matchedRules: PathRule[];

  /** Flattened list of all rule strings */
  effectiveRules: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Directory (relative to project root) where path rule files live. */
const RULES_DIR = '.claude/rules';

/**
 * Frontmatter key used to specify the glob pattern in a rule file.
 * Format: `globs: *.test.ts` or `globs: src/agents/**`
 */
const GLOBS_FRONTMATTER_KEY = 'globs';

// ---------------------------------------------------------------------------
// Glob Matching Engine
// ---------------------------------------------------------------------------

/**
 * Minimatch-compatible glob matcher implemented from scratch.
 *
 * Supports the glob features that Claude Code actually uses:
 * - `*`     → matches any characters EXCEPT path separators
 * - `**`    → matches any characters INCLUDING path separators (cross-dir)
 * - `?`     → matches exactly one character (not a separator)
 * - `{a,b}` → matches either alternative
 * - Literal characters match themselves
 *
 * Exam concept: `**` is the key differentiator. `src/*.ts` matches
 * `src/foo.ts` but NOT `src/utils/foo.ts`. Use `src/**\/*.ts` to match both.
 */
export function globToRegex(pattern: string): RegExp {
  // First, expand brace alternatives {a,b} into regex (a|b)
  let regexStr = '';
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];

    if (char === '{') {
      // Find the matching closing brace
      const closeIdx = pattern.indexOf('}', i);
      if (closeIdx === -1) {
        regexStr += '\\{';
        i++;
        continue;
      }
      const alternatives = pattern.substring(i + 1, closeIdx).split(',');
      regexStr += `(${alternatives.map(escapeRegexLiteral).join('|')})`;
      i = closeIdx + 1;
      continue;
    }

    if (char === '*') {
      if (pattern[i + 1] === '*') {
        // ** — match across directory boundaries
        if (pattern[i + 2] === '/') {
          regexStr += '(?:.+/)?'; // optional path prefix
          i += 3;
        } else {
          regexStr += '.*'; // match everything
          i += 2;
        }
      } else {
        // * — match within a single directory
        regexStr += '[^/]*';
        i++;
      }
      continue;
    }

    if (char === '?') {
      regexStr += '[^/]';
      i++;
      continue;
    }

    if (char === '.') {
      regexStr += '\\.';
      i++;
      continue;
    }

    // Path separator normalisation
    if (char === '\\' || char === '/') {
      regexStr += '/';
      i++;
      continue;
    }

    regexStr += char;
    i++;
  }

  return new RegExp(`^${regexStr}$`, 'i');
}

/** Escape special regex characters in literal alternatives. */
function escapeRegexLiteral(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Test whether a file path matches a glob pattern.
 *
 * The path is normalised to forward slashes before matching. Both relative
 * and absolute paths work — the match is performed against the normalised
 * path as-is.
 *
 * Exam tip: Claude Code normalises paths internally, so `src\utils\foo.ts`
 * and `src/utils/foo.ts` are equivalent for pattern matching purposes.
 */
export function matchGlob(pattern: string, filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const regex = globToRegex(pattern);
  return regex.test(normalized);
}

// ---------------------------------------------------------------------------
// Rule File Parser
// ---------------------------------------------------------------------------

/**
 * Parse a path-rule Markdown file into a PathRule.
 *
 * Expected format:
 * ```markdown
 * globs: *.test.ts
 *
 * - Always use `describe`/`it` blocks
 * - Mock external dependencies
 * - Keep tests focused on one behaviour
 * ```
 *
 * If no `globs:` frontmatter is found, the filename is used as a fallback
 * pattern key (e.g., `testing.md` → no pattern, rules apply to everything).
 */
export function parseRuleFile(
  filePath: string,
  content: string,
): PathRule {
  const lines = content.split('\n');
  let pattern = '**'; // default: match everything if no glob specified
  const rules: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for globs frontmatter
    if (trimmed.toLowerCase().startsWith(`${GLOBS_FRONTMATTER_KEY}:`)) {
      pattern = trimmed.substring(GLOBS_FRONTMATTER_KEY.length + 1).trim();
      continue;
    }

    // Skip empty lines and headings
    if (!trimmed || trimmed.startsWith('#')) continue;

    // List items are rules
    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      rules.push(listMatch[1].trim());
    }
  }

  return {
    pattern,
    rules,
    source: filePath.replace(/\\/g, '/'),
  };
}

// ---------------------------------------------------------------------------
// PathRuleEngine
// ---------------------------------------------------------------------------

/**
 * Engine for loading, matching, and combining path-specific rules.
 *
 * The engine works in two phases:
 * 1. **Load**: Scan the rules directory and parse each .md file into a PathRule.
 * 2. **Match**: For a given file path, find all PathRules whose glob matches
 *    and return the combined ruleset.
 *
 * Exam scenario:
 * ```
 * const engine = new PathRuleEngine();
 * await engine.loadRules('.claude/rules', entries);
 * const rules = engine.getEffectiveRules('src/components/Button.test.tsx');
 * // Returns rules from *.test.tsx rules, src/components/** rules, etc.
 * ```
 *
 * Exam trap: Path rules are ADDITIVE — they never remove a rule from the
 * CLAUDE.md base. If CLAUDE.md says "use TypeScript strict mode" and a path
 * rule for *.test.ts says "allow `any` in mocks", both rules apply to test
 * files. The model resolves the apparent conflict using its judgement.
 */
export class PathRuleEngine {
  /** All loaded path rules, sorted by source filename for deterministic order */
  private pathRules: PathRule[] = [];

  /**
   * Optional CLAUDE.md rules to combine with path-specific rules.
   * Set via `setBaseRules()` to integrate with the ClaudeMdHierarchy.
   */
  private baseRules: string[] = [];

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Load path rules from a rules directory.
   *
   * @param rulesDir  Path to the rules directory (e.g. `.claude/rules`)
   * @param entries   Pre-scanned file entries for testability
   */
  async loadRules(
    rulesDir: string,
    entries: Array<{ relativePath: string; content: string }> = [],
  ): Promise<void> {
    this.pathRules = [];

    // Sort entries alphabetically for deterministic rule ordering
    const sorted = [...entries].sort((a, b) =>
      a.relativePath.localeCompare(b.relativePath),
    );

    for (const entry of sorted) {
      const fullPath = `${rulesDir}/${entry.relativePath}`;
      const rule = parseRuleFile(fullPath, entry.content);
      this.pathRules.push(rule);
    }
  }

  /**
   * Set base rules from CLAUDE.md hierarchy. These are always included in
   * `getEffectiveRules()` results, before any path-specific rules.
   *
   * Exam concept: This is the integration point between Task 3.1 (CLAUDE.md
   * hierarchy) and Task 3.3 (path rules). The two systems are complementary:
   * CLAUDE.md provides the base; path rules add specificity.
   */
  setBaseRules(rules: string[]): void {
    this.baseRules = [...rules];
  }

  /**
   * Find all path rules whose glob pattern matches the given file path.
   *
   * @returns Array of matching PathRule objects, in load order.
   */
  match(filePath: string): PathRule[] {
    const normalized = filePath.replace(/\\/g, '/');
    return this.pathRules.filter((rule) => matchGlob(rule.pattern, normalized));
  }

  /**
   * Get the effective (combined) rules for a file path.
   *
   * Combines:
   * 1. Base rules from CLAUDE.md hierarchy (always first)
   * 2. All path-specific rules whose glob matches (in alphabetical file order)
   *
   * Exam concept: The ordering matters. Base rules establish defaults; path
   * rules refine them. If there's a conflict, the model uses the most specific
   * rule — but both are present in the context for the model to reason about.
   */
  getEffectiveRules(filePath: string): string[] {
    const matchingRules = this.match(filePath);
    const pathSpecificRules = matchingRules.flatMap((r) => r.rules);

    return [...this.baseRules, ...pathSpecificRules];
  }

  /**
   * Get the count of loaded path rules. Useful for diagnostics.
   */
  get ruleCount(): number {
    return this.pathRules.length;
  }
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { RULES_DIR, GLOBS_FRONTMATTER_KEY };
