/**
 * Task 3.1: CLAUDE.md Hierarchy — Configuration Inheritance System
 *
 * CLAUDE.md files are the project-level memory for Claude Code. They live at
 * any level of the directory tree and form a hierarchy:
 *
 *   /CLAUDE.md                    ← project root: global rules
 *   /src/CLAUDE.md                ← source tree: narrows scope
 *   /src/agents/CLAUDE.md         ← agent subsystem: most specific
 *
 * Child CLAUDE.md inherits and overrides parent. This is like CSS specificity —
 * a rule defined closer to the file wins over one defined further away.
 *
 * Exam concepts:
 * - CLAUDE.md is read automatically — no flag needed to enable it.
 * - Three scopes: project root (always loaded), directory-level (loaded when
 *   working in that subtree), and user-level (~/.claude/CLAUDE.md).
 * - The merge strategy is "child overrides parent" — if the same key or rule
 *   appears at two levels, the more-specific (deeper) one wins.
 * - CLAUDE.md supports Markdown format with headings, lists, and code blocks.
 * - Common uses: coding conventions, test commands, architecture notes,
 *   forbidden patterns, and PR review checklists.
 *
 * @module config/claude-md
 */

import type { Question } from '../types/index.js';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Represents a single CLAUDE.md configuration file discovered in the tree.
 *
 * Exam trap: `parentPath` is null only for the root CLAUDE.md. Every other
 * file must reference its nearest ancestor so the merge chain is unbroken.
 */
export interface ClaudeMdConfig {
  /** Absolute path to the CLAUDE.md file */
  path: string;

  /** Raw Markdown content of the file */
  content: string;

  /**
   * Path to the parent CLAUDE.md (one level up in the hierarchy).
   * Null for the project-root CLAUDE.md — it has no parent.
   */
  parentPath: string | null;

  /**
   * Parsed rule strings extracted from the content.
   * Rules are typically list items under headings like "## Rules" or "## Conventions".
   */
  rules: string[];

  /**
   * Free-form project context extracted from the file.
   * This is everything that is NOT a rule — architecture notes, tech stack, etc.
   */
  projectContext: string;
}

/**
 * Lightweight reference used during hierarchy traversal.
 */
interface HierarchyNode {
  config: ClaudeMdConfig;
  depth: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The canonical filename Claude Code looks for at every directory level. */
const CLAUDE_MD_FILENAME = 'CLAUDE.md';

/**
 * Headings whose list items are treated as rules during parsing.
 * Everything else is classified as "project context".
 */
const RULE_HEADINGS = ['rules', 'conventions', 'requirements', 'constraints'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a CLAUDE.md Markdown string into rules and project context.
 *
 * Rules are list items (lines starting with `- ` or `* `) that appear under
 * a heading whose lowercase text is in {@link RULE_HEADINGS}.
 *
 * Everything else (paragraphs, code blocks, other headings) becomes project
 * context. This mirrors how Claude Code processes CLAUDE.md internally —
 * rules are actionable instructions; context is reference material.
 */
function parseClaudeMd(content: string): { rules: string[]; projectContext: string } {
  const lines = content.split('\n');
  const rules: string[] = [];
  const contextLines: string[] = [];
  let inRuleSection = false;

  for (const line of lines) {
    // Detect heading — e.g. "## Rules" or "# Conventions"
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      const headingText = headingMatch[1].trim().toLowerCase();
      inRuleSection = RULE_HEADINGS.some((h) => headingText.includes(h));
      if (!inRuleSection) contextLines.push(line);
      continue;
    }

    // List items under a rule heading become rules
    const listMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
    if (inRuleSection && listMatch) {
      rules.push(listMatch[1].trim());
    } else {
      contextLines.push(line);
    }
  }

  return {
    rules,
    projectContext: contextLines.join('\n').trim(),
  };
}

/**
 * Walk up from `startDir` to `rootDir`, collecting every directory along the
 * way. The result is ordered root-first so callers can merge parent → child.
 *
 * Exam concept: The traversal always starts at the project root and ends at
 * the deepest directory. This ensures the root CLAUDE.md is the "base" config
 * and each child layer can override it progressively.
 */
function getAncestorDirs(startDir: string, rootDir: string): string[] {
  const ancestors: string[] = [];
  let current = normalizePath(startDir);
  const root = normalizePath(rootDir);

  while (current.startsWith(root)) {
    ancestors.unshift(current); // prepend → root first
    const parent = current.substring(0, current.lastIndexOf('/'));
    if (parent === current) break; // filesystem root — stop
    current = parent;
  }

  return ancestors;
}

/** Normalise Windows backslashes to forward slashes for consistent handling. */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

// ---------------------------------------------------------------------------
// ClaudeMdHierarchy
// ---------------------------------------------------------------------------

/**
 * Discovers, parses, and merges CLAUDE.md files across a project tree.
 *
 * Usage in an exam scenario:
 * ```
 * const hierarchy = new ClaudeMdHierarchy();
 * await hierarchy.loadHierarchy('/project');
 * const rules = hierarchy.getEffectiveRules('/project/src/agents/orchestrator.ts');
 * // → merged rules from /, /src, /src/agents (if CLAUDE.md exists at each)
 * ```
 *
 * Exam trap: `getEffectiveRules` always includes the project-root rules as a
 * base. Even if a subdirectory CLAUDE.md doesn't mention them, they still
 * apply — child overrides, but does NOT erase parent rules unless explicitly
 * contradicted.
 */
export class ClaudeMdHierarchy {
  /** Map of directory path → parsed config */
  private configs: Map<string, ClaudeMdConfig> = new Map();

  /** Project root directory (set by loadHierarchy) */
  private rootDir: string = '';

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Discover all CLAUDE.md files in the directory tree rooted at `rootDir`.
   *
   * This performs a recursive directory scan — in a real implementation it
   * would use `fs.readdir` with `recursive: true`. Here we accept pre-scanned
   * file paths for testability and platform independence.
   *
   * @param rootDir  Absolute path to the project root.
   * @param files    Array of absolute paths to discovered CLAUDE.md files.
   *                 In production, Claude Code discovers these automatically.
   */
  async loadHierarchy(rootDir: string, files: string[] = []): Promise<void> {
    this.rootDir = normalizePath(rootDir);
    this.configs.clear();

    // Sort by depth (shallowest first) so parent configs are available when
    // processing children — important for setting parentPath correctly.
    const sorted = [...files]
      .map(normalizePath)
      .sort((a, b) => a.split('/').length - b.split('/').length);

    for (const filePath of sorted) {
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      const content = await this.readFile(filePath);
      const { rules, projectContext } = parseClaudeMd(content);

      // Find nearest ancestor that already has a config
      const parentDir = this.findParentConfigDir(dir);

      const config: ClaudeMdConfig = {
        path: filePath,
        content,
        parentPath: parentDir ? `${parentDir}/${CLAUDE_MD_FILENAME}` : null,
        rules,
        projectContext,
      };

      this.configs.set(dir, config);
    }
  }

  /**
   * Resolve the fully-merged configuration for a given source file.
   *
   * Walks from the project root down to the file's directory, merging every
   * CLAUDE.md found along the way. Child rules override parent rules.
   *
   * Exam concept: "Override" means *append and replace*. If parent says
   * "use tabs" and child says "use spaces", the child wins. But if the parent
   * says "always write tests" and the child is silent, that rule carries through.
   */
  resolveConfig(filePath: string): ClaudeMdConfig {
    const normalized = normalizePath(filePath);
    const fileDir = normalized.substring(0, normalized.lastIndexOf('/'));
    const ancestors = getAncestorDirs(fileDir, this.rootDir);

    let mergedRules: string[] = [];
    let mergedContext = '';
    let lastPath: string | null = null;

    for (const dir of ancestors) {
      const config = this.configs.get(dir);
      if (!config) continue;

      // Merge rules: child rules come after parent, so they take precedence
      // in any "last wins" evaluation. Duplicate rules are kept — the consumer
      // decides how to resolve conflicts.
      mergedRules = [...mergedRules, ...config.rules];

      // Context is concatenated with a separator for clarity
      mergedContext = mergedContext
        ? `${mergedContext}\n\n---\n\n${config.projectContext}`
        : config.projectContext;

      lastPath = config.path;
    }

    return {
      path: lastPath ?? '',
      content: mergedContext,
      parentPath: null, // merged config is a flattened view
      rules: mergedRules,
      projectContext: mergedContext,
    };
  }

  /**
   * Return the effective (merged) rules for a file path.
   *
   * This is the primary API consumers use — it answers the question:
   * "Given this source file, what rules should Claude follow?"
   *
   * Exam tip: This is the function that makes CLAUDE.md hierarchical.
   * Without it, you'd only get the nearest CLAUDE.md — not the full chain.
   */
  getEffectiveRules(filePath: string): string[] {
    const config = this.resolveConfig(filePath);
    return config.rules;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Stub file reader — in production this would call `fs.readFile`.
   * Keeping it as a method allows easy mocking in tests.
   */
  protected async readFile(_filePath: string): Promise<string> {
    return ''; // Override in tests or subclass for real I/O
  }

  /** Find the nearest ancestor directory that has a loaded config. */
  private findParentConfigDir(dir: string): string | null {
    let current = dir;
    while (true) {
      const parent = current.substring(0, current.lastIndexOf('/'));
      if (parent === current || !parent.startsWith(this.rootDir)) return null;
      if (this.configs.has(parent)) return parent;
      current = parent;
    }
  }
}

// ---------------------------------------------------------------------------
// Re-exports for barrel import convenience
// ---------------------------------------------------------------------------

export { parseClaudeMd, getAncestorDirs, normalizePath };
export { CLAUDE_MD_FILENAME, RULE_HEADINGS };
