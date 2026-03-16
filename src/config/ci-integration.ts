/**
 * Task 3.6: CI/CD Integration — Running Claude Code in Automated Pipelines
 *
 * CI mode strips interactivity. No plan mode toggle, no user prompts, no
 * Shift+Tab. Claude Code in CI is a headless worker that reads a task,
 * executes it, and produces structured output.
 *
 * This is how teams integrate Claude Code into GitHub Actions, Jenkins,
 * GitLab CI, and other automation platforms. Key differences from interactive:
 *
 * | Feature              | Interactive       | CI Mode            |
 * |----------------------|-------------------|--------------------|
 * | User prompts         | Yes               | No (auto-accept)   |
 * | Plan mode toggle     | Shift+Tab         | Always direct      |
 * | Tool permissions     | Ask on first use  | Pre-configured     |
 * | Output format        | Rich terminal     | JSON / plain text  |
 * | Session persistence  | Yes               | No (stateless)     |
 *
 * Exam concepts:
 * - `--print` flag: Single-turn mode — send prompt, get response, exit.
 *   No interactive conversation. Perfect for CI where you need one answer.
 * - `--non-interactive`: Disables all user prompts. Required in CI.
 * - `--allowedTools`: Whitelist of tools Claude can use. Security boundary.
 * - `--output-format json`: Machine-readable output for downstream parsing.
 * - `--max-turns N`: Limits the agentic loop to N iterations in CI.
 * - Trust settings: `--trust-tools` grants blanket permission to listed tools.
 * - MCP server integration: Claude Code can connect to MCP servers in CI for
 *   custom tool access (e.g., deployment tools, database access).
 *
 * @module config/ci-integration
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Configuration for running Claude Code in CI/CD mode.
 *
 * Exam trap: `nonInteractive` must be true in CI. If it's false, Claude will
 * hang waiting for user input that never comes, and the CI job will timeout.
 */
export interface CIMode {
  /** When true, all user prompts are suppressed and auto-accepted */
  nonInteractive: boolean;

  /**
   * Whitelist of tools Claude is allowed to use.
   * In CI, this is a security boundary — you don't want Claude running
   * arbitrary shell commands on your CI runner.
   *
   * Common CI-safe tools: Read, Write, Edit, Grep, Glob
   * Dangerous in CI: Bash (unrestricted), WebFetch
   *
   * Exam concept: The `--allowedTools` flag accepts glob patterns:
   * `--allowedTools "Edit,Write,Read"` or `--allowedTools "*"` (allow all)
   */
  allowedTools: string[];

  /**
   * Output format for CI consumption.
   * - 'text': Human-readable plain text
   * - 'json': Machine-readable JSON with structured fields
   * - 'stream-json': JSONL streaming format for real-time processing
   */
  outputFormat: 'text' | 'json' | 'stream-json';
}

/**
 * Options for creating a CI configuration.
 */
export interface CIConfigOptions {
  /** Maximum number of agentic loop turns */
  maxTurns: number;

  /** Tools to allow — defaults to a safe read/write subset */
  allowedTools?: string[];

  /** Whether to include file diffs in output */
  includeDiff?: boolean;

  /** Custom environment variables to pass to Claude */
  envVars?: Record<string, string>;

  /** Model to use — CI often uses a specific model version for reproducibility */
  model?: string;

  /**
   * Trust configuration — which permissions to auto-grant.
   *
   * Exam concept: In CI, you pre-grant permissions because there's no human
   * to approve them. The `settings.json` or `--trust-tools` flag handles this.
   * Over-granting is a security risk; under-granting causes CI failures.
   */
  trustSettings?: {
    /** Tools that are pre-approved without asking */
    trustedTools: string[];
    /** Whether to trust all MCP server tools */
    trustMcpTools: boolean;
  };
}

/**
 * Result of a CI execution run.
 */
export interface CIRunResult {
  /** Whether the task completed successfully */
  success: boolean;

  /** Output text or structured data from the run */
  output: string;

  /** Files that were created or modified */
  filesChanged: string[];

  /** Number of agentic loop turns consumed */
  turnsUsed: number;

  /** Total tokens used (input + output) */
  tokensUsed: number;

  /** Execution duration in milliseconds */
  durationMs: number;
}

/**
 * Structured PR description generated from a diff.
 */
export interface PRDescription {
  /** One-line summary suitable for the PR title */
  title: string;

  /** Detailed description in Markdown format */
  body: string;

  /** Suggested labels based on the changes */
  suggestedLabels: string[];

  /** Suggested reviewers based on file ownership */
  suggestedReviewers: string[];

  /** Risk assessment */
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Automated code review finding.
 */
export interface ReviewFinding {
  /** File path where the issue was found */
  file: string;

  /** Line number (approximate) */
  line: number;

  /** Severity of the finding */
  severity: 'info' | 'warning' | 'error';

  /** Category: bug, style, performance, security, etc. */
  category: string;

  /** Human-readable description of the issue */
  message: string;

  /** Suggested fix (if available) */
  suggestedFix?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default set of tools considered safe for CI environments.
 *
 * Exam concept: The default safe set is READ-ONLY tools plus Edit/Write.
 * Bash is notably absent because it allows arbitrary command execution.
 * To enable Bash in CI, you must explicitly add it to allowedTools —
 * this is an intentional security friction.
 */
const DEFAULT_CI_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Grep',
  'Glob',
  'ListDir',
] as const;

/**
 * Maximum number of agentic loop turns in CI before forced stop.
 * This prevents runaway executions that consume CI minutes.
 */
const DEFAULT_MAX_TURNS = 10;

// ---------------------------------------------------------------------------
// CIRunner
// ---------------------------------------------------------------------------

/**
 * Manages Claude Code execution in CI/CD environments.
 *
 * This class encapsulates the configuration, execution, and output formatting
 * needed to run Claude Code as part of automated pipelines.
 *
 * Exam scenario — GitHub Actions integration:
 * ```yaml
 * - name: Code Review with Claude
 *   run: |
 *     claude --print "Review this PR for bugs and security issues" \
 *       --non-interactive \
 *       --allowedTools "Read,Grep,Glob" \
 *       --output-format json \
 *       --max-turns 5
 * ```
 *
 * Exam trap: `--print` makes Claude run in single-turn mode (no back-and-forth).
 * This is different from `--non-interactive` which still allows multi-turn but
 * without user prompts. In CI, you typically use BOTH flags together.
 */
export class CIRunner {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Create a CI-appropriate configuration from options.
   *
   * Generates a CIMode config that disables interactivity, sets tool
   * permissions, and configures output format. This is the equivalent
   * of the command-line flags but as a programmatic API.
   *
   * Exam concept: The config is the "contract" between the CI pipeline
   * and Claude Code. It must be explicit about what's allowed — implicit
   * permissions that work interactively (like Bash access) are NOT
   * carried over to CI mode.
   */
  createCIConfig(options: Partial<CIConfigOptions> = {}): CIMode {
    const allowedTools = options.allowedTools ?? [...DEFAULT_CI_TOOLS];
    const outputFormat = options.envVars?.['CLAUDE_OUTPUT_FORMAT'] as CIMode['outputFormat']
      ?? 'json';

    return {
      nonInteractive: true, // Always true in CI — this is non-negotiable
      allowedTools,
      outputFormat,
    };
  }

  /**
   * Execute a task in CI mode with the given configuration.
   *
   * In production, this would:
   * 1. Spawn a Claude Code process with appropriate flags
   * 2. Pipe the task as the initial prompt
   * 3. Collect output as it streams
   * 4. Return structured results when complete
   *
   * Exam concept: CI execution is stateless — there's no conversation history
   * carried between runs. Each CI invocation starts fresh. To provide context,
   * you pipe in relevant files or use `--context` flags.
   *
   * @param task    The task prompt to send to Claude
   * @param config  CI configuration (from createCIConfig)
   * @returns       Structured result of the execution
   */
  async runInCI(task: string, config: CIMode): Promise<CIRunResult> {
    const startTime = Date.now();

    // Validate configuration
    this.validateConfig(config);

    // Build the command-line arguments that would be passed to Claude Code
    const _args = this.buildCLIArgs(task, config);

    // In production, we'd spawn the process here.
    // For the exam module, we return a structured result.
    return {
      success: true,
      output: `CI execution: ${task.substring(0, 100)}`,
      filesChanged: [],
      turnsUsed: 1,
      tokensUsed: 0,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Auto-generate a PR description from a code diff.
   *
   * This is one of the most popular CI use cases — Claude reads the diff
   * and writes a structured PR description including:
   * - What changed and why (inferred from the code)
   * - Risk assessment
   * - Suggested reviewers (based on file paths / CODEOWNERS)
   * - Suggested labels
   *
   * Exam concept: The `--print` flag is used here because we want a single
   * response, not an ongoing conversation. The prompt template explicitly
   * asks for structured output that can be parsed by the CI script.
   *
   * Real-world usage:
   * ```bash
   * git diff main...HEAD | claude --print \
   *   "Generate a PR description for this diff" \
   *   --output-format json
   * ```
   */
  generatePRDescription(diff: string): PRDescription {
    // Analyse the diff to extract metadata
    const filesChanged = this.extractFilesFromDiff(diff);
    const riskLevel = this.assessDiffRisk(filesChanged, diff);

    return {
      title: this.generateTitle(filesChanged),
      body: this.generateBody(diff, filesChanged),
      suggestedLabels: this.suggestLabels(filesChanged),
      suggestedReviewers: [], // Would use CODEOWNERS in production
      riskLevel,
    };
  }

  /**
   * Run an automated code review on a diff without human interaction.
   *
   * Claude analyses the diff for:
   * - Bugs and logic errors
   * - Security vulnerabilities
   * - Performance issues
   * - Style violations (if configured)
   * - Missing tests
   *
   * Exam concept: Automated review in CI is non-blocking by default — it
   * posts comments but doesn't block the PR. To make it blocking, configure
   * the CI job to fail on `severity: 'error'` findings.
   *
   * Exam trap: The review quality depends on context. A bare diff without
   * surrounding code context may miss issues that depend on the broader
   * codebase. Best practice: pipe full files, not just diffs.
   */
  automatedCodeReview(diff: string): ReviewFinding[] {
    const findings: ReviewFinding[] = [];
    const lines = diff.split('\n');

    // Pattern-based analysis (simplified for exam module)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect common issues in added lines
      if (!line.startsWith('+')) continue;
      const content = line.substring(1); // strip the '+' prefix

      // Security: hardcoded secrets
      if (/(?:password|secret|api_key|token)\s*=\s*['"][^'"]+['"]/i.test(content)) {
        findings.push({
          file: this.extractFileFromDiffContext(lines, i),
          line: i,
          severity: 'error',
          category: 'security',
          message: 'Potential hardcoded secret detected',
          suggestedFix: 'Use environment variables or a secrets manager',
        });
      }

      // Bug: console.log left in production code
      if (/console\.(log|debug|info)\(/.test(content)) {
        findings.push({
          file: this.extractFileFromDiffContext(lines, i),
          line: i,
          severity: 'warning',
          category: 'quality',
          message: 'Console logging statement in production code',
          suggestedFix: 'Remove or replace with a proper logging framework',
        });
      }

      // Performance: synchronous file operations
      if (/(?:readFileSync|writeFileSync|execSync)\(/.test(content)) {
        findings.push({
          file: this.extractFileFromDiffContext(lines, i),
          line: i,
          severity: 'warning',
          category: 'performance',
          message: 'Synchronous I/O operation detected — may block the event loop',
          suggestedFix: 'Use the async variant (readFile, writeFile, exec)',
        });
      }
    }

    return findings;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /** Validate that a CI config is usable. */
  private validateConfig(config: CIMode): void {
    if (!config.nonInteractive) {
      throw new Error(
        'CI mode requires nonInteractive: true. Without it, Claude will hang ' +
        'waiting for user input that never comes.',
      );
    }

    if (config.allowedTools.length === 0) {
      throw new Error(
        'CI mode requires at least one allowed tool. Without tools, Claude ' +
        'cannot make any changes or read any files.',
      );
    }
  }

  /** Build CLI argument array from config. */
  private buildCLIArgs(task: string, config: CIMode): string[] {
    const args: string[] = ['claude', '--print', task];

    if (config.nonInteractive) args.push('--non-interactive');
    args.push('--output-format', config.outputFormat);
    args.push('--allowedTools', config.allowedTools.join(','));

    return args;
  }

  /** Extract file paths from a unified diff. */
  private extractFilesFromDiff(diff: string): string[] {
    const files: string[] = [];
    const filePattern = /^(?:\+\+\+|---)\s+(?:a\/|b\/)?(.+)$/gm;
    let match: RegExpExecArray | null;

    while ((match = filePattern.exec(diff)) !== null) {
      const filePath = match[1].trim();
      if (filePath !== '/dev/null' && !files.includes(filePath)) {
        files.push(filePath);
      }
    }

    return files;
  }

  /** Determine the current file from diff context (look for --- or +++ headers). */
  private extractFileFromDiffContext(lines: string[], currentLine: number): string {
    for (let i = currentLine; i >= 0; i--) {
      if (lines[i].startsWith('+++ b/')) {
        return lines[i].substring(6).trim();
      }
    }
    return 'unknown';
  }

  /** Assess risk level based on files changed and diff content. */
  private assessDiffRisk(files: string[], diff: string): 'low' | 'medium' | 'high' {
    // High risk: security-sensitive files, infra, or large diffs
    const highRiskPatterns = [/auth/i, /security/i, /\.env/, /infra/i, /deploy/i];
    if (highRiskPatterns.some((p) => files.some((f) => p.test(f)))) return 'high';
    if (diff.split('\n').length > 500) return 'high';

    // Medium risk: more than 5 files or test changes
    if (files.length > 5) return 'medium';
    if (files.some((f) => /test/i.test(f))) return 'medium';

    return 'low';
  }

  /** Generate a PR title from changed files. */
  private generateTitle(files: string[]): string {
    if (files.length === 0) return 'Update code';
    if (files.length === 1) return `Update ${files[0]}`;

    // Find common directory prefix
    const dirs = files.map((f) => f.split('/').slice(0, -1).join('/'));
    const commonDir = dirs.reduce((common, dir) => {
      if (!common) return dir;
      const parts = common.split('/');
      const dirParts = dir.split('/');
      let i = 0;
      while (i < parts.length && i < dirParts.length && parts[i] === dirParts[i]) i++;
      return parts.slice(0, i).join('/');
    }, '');

    return commonDir
      ? `Update ${files.length} files in ${commonDir}`
      : `Update ${files.length} files`;
  }

  /** Generate PR body from diff and file list. */
  private generateBody(diff: string, files: string[]): string {
    const lines = diff.split('\n');
    const additions = lines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
    const deletions = lines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;

    return [
      '## Summary',
      '',
      `This PR modifies ${files.length} file(s) with ${additions} additions and ${deletions} deletions.`,
      '',
      '## Files Changed',
      '',
      ...files.map((f) => `- \`${f}\``),
      '',
      '## Review Notes',
      '',
      '_Auto-generated by Claude Code CI integration._',
    ].join('\n');
  }

  /** Suggest labels based on file paths. */
  private suggestLabels(files: string[]): string[] {
    const labels = new Set<string>();

    for (const file of files) {
      if (/\.test\.|\.spec\.|__tests__/.test(file)) labels.add('tests');
      if (/\.md$/.test(file)) labels.add('documentation');
      if (/\.css|\.scss|\.styled/.test(file)) labels.add('styles');
      if (/src\//.test(file)) labels.add('source');
      if (/\.ya?ml$|Dockerfile|\.env/.test(file)) labels.add('infrastructure');
    }

    return [...labels];
  }
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { DEFAULT_CI_TOOLS, DEFAULT_MAX_TURNS };
