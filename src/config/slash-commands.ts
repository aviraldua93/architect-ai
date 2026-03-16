/**
 * Task 3.2: Custom Slash Commands — Extending Claude Code's Command Palette
 *
 * Commands are files, not code. Anyone can add a slash command by creating a
 * .md file in the `.claude/commands/` directory. This is the democratisation
 * of AI tooling — a PM can write a `/review-prd` command without touching TS.
 *
 * Anatomy of a custom command:
 *   .claude/commands/review-prd.md     → invoked as /project:review-prd
 *   ~/.claude/commands/fix-typos.md    → invoked as /user:fix-typos
 *
 * The file content is a Markdown template. The special placeholder $ARGUMENTS
 * is replaced with whatever the user types after the command name:
 *   /project:review-prd signup flow   → $ARGUMENTS = "signup flow"
 *
 * Exam concepts:
 * - Project commands live in `.claude/commands/` (shared via git).
 * - User commands live in `~/.claude/commands/` (personal, not committed).
 * - The command name is derived from the filename (minus .md extension).
 * - Commands can reference $ARGUMENTS zero or more times in the template.
 * - Nested directories create namespaced commands: `frontend/lint.md` → `/project:frontend:lint`.
 * - Skills are a related but distinct concept — they are more structured and
 *   use a `skill.md` manifest rather than a plain template.
 *
 * @module config/slash-commands
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * A custom slash command definition parsed from a .md file.
 *
 * Exam trap: `acceptsArguments` is true when the template contains at least
 * one `$ARGUMENTS` placeholder. Commands without it silently ignore any args.
 */
export interface SlashCommand {
  /** Display name — derived from filename, e.g. "review-prd" */
  name: string;

  /**
   * Human-readable description. Extracted from the first line of the .md file
   * if it starts with `>` (a Markdown blockquote), otherwise auto-generated.
   */
  description: string;

  /** Absolute path to the .md template file */
  filePath: string;

  /** Raw Markdown template content, with $ARGUMENTS placeholders intact */
  template: string;

  /**
   * Whether the template contains $ARGUMENTS.
   * When false, extra arguments are ignored — they don't cause errors.
   */
  acceptsArguments: boolean;
}

/**
 * A skill definition — the structured cousin of a slash command.
 *
 * Skills differ from commands in key ways (exam-relevant):
 * - Skills have a `skill.md` manifest that specifies triggers and context.
 * - Skills can be invoked implicitly (Claude decides to use them) or
 *   explicitly via `/skill:name`.
 * - Skills are more powerful: they can include multi-step instructions,
 *   required tools, and validation steps.
 */
export interface SkillDefinition {
  /** Unique skill name */
  name: string;

  /** Path to the skill.md manifest file */
  skillMdPath: string;

  /**
   * The instruction content — what Claude should do when this skill is
   * activated. Can be multi-paragraph Markdown with code examples.
   */
  instructions: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Directory (relative to project root) where project commands live. */
const PROJECT_COMMANDS_DIR = '.claude/commands';

/** Placeholder token that gets replaced with user-provided arguments. */
const ARGUMENTS_PLACEHOLDER = '$ARGUMENTS';

/**
 * Prefix used when invoking project commands in the Claude Code prompt.
 * User commands use the `/user:` prefix instead.
 */
const PROJECT_COMMAND_PREFIX = '/project:';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive a command name from a file path relative to the commands directory.
 *
 * Nested directories become colon-separated namespaces:
 *   "frontend/lint.md"       → "frontend:lint"
 *   "review-prd.md"          → "review-prd"
 *   "backend/db/migrate.md"  → "backend:db:migrate"
 *
 * Exam concept: The colon-namespace mirrors how Claude Code actually resolves
 * nested command directories. This is tested on the exam.
 */
function deriveCommandName(relativePath: string): string {
  return relativePath
    .replace(/\.md$/i, '')           // strip extension
    .replace(/\\/g, '/')             // normalise separators
    .replace(/\//g, ':');            // dirs → colon namespace
}

/**
 * Extract a description from the template content.
 * Convention: if the first line is a blockquote (`> ...`), it's the description.
 * Otherwise, fall back to a generic description.
 */
function extractDescription(template: string): string {
  const firstLine = template.split('\n')[0]?.trim() ?? '';
  if (firstLine.startsWith('>')) {
    return firstLine.replace(/^>\s*/, '').trim();
  }
  return 'Custom slash command';
}

/**
 * Replace all occurrences of $ARGUMENTS in a template with the provided args.
 *
 * Exam trap: This is a global replace — $ARGUMENTS can appear multiple times
 * in a template, and each occurrence is replaced. If no $ARGUMENTS exists,
 * the args string is silently discarded. This is intentional — it lets
 * command authors write templates that optionally accept arguments.
 */
function substituteArguments(template: string, args: string): string {
  return template.replaceAll(ARGUMENTS_PLACEHOLDER, args);
}

// ---------------------------------------------------------------------------
// CommandRegistry
// ---------------------------------------------------------------------------

/**
 * Registry for discovering, storing, and executing custom slash commands.
 *
 * Exam scenario:
 * ```
 * const registry = new CommandRegistry();
 * await registry.discover('.claude/commands');
 * const prompt = registry.execute('review-prd', 'the signup flow');
 * // prompt now contains the template with $ARGUMENTS → "the signup flow"
 * ```
 *
 * Key exam points:
 * - `discover()` is idempotent — calling it twice with the same dir won't
 *   duplicate commands.
 * - `execute()` returns a string prompt, NOT a result. Claude Code sends
 *   this prompt to the model as if the user typed it.
 * - Commands are evaluated lazily — the template is read at discover-time,
 *   but $ARGUMENTS substitution happens only at execute-time.
 */
export class CommandRegistry {
  /** Map of command name → SlashCommand definition */
  private commands: Map<string, SlashCommand> = new Map();

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Scan a commands directory for .md files and register each as a command.
   *
   * In production, this reads the filesystem recursively. Here we accept
   * pre-scanned entries for testability.
   *
   * @param commandsDir  Base directory to scan (e.g. `.claude/commands`)
   * @param entries      Array of { relativePath, content } for each .md file
   */
  async discover(
    commandsDir: string,
    entries: Array<{ relativePath: string; content: string }> = [],
  ): Promise<void> {
    for (const entry of entries) {
      const name = deriveCommandName(entry.relativePath);
      const template = entry.content;

      const command: SlashCommand = {
        name,
        description: extractDescription(template),
        filePath: `${commandsDir}/${entry.relativePath}`,
        template,
        acceptsArguments: template.includes(ARGUMENTS_PLACEHOLDER),
      };

      this.register(command);
    }
  }

  /**
   * Register a single command. Overwrites any existing command with the same name.
   *
   * Exam concept: Registration is explicit — even though discovery is automatic,
   * you can also programmatically register commands for testing or internal use.
   */
  register(command: SlashCommand): void {
    this.commands.set(command.name, command);
  }

  /**
   * Execute a command by name, substituting $ARGUMENTS with the provided args.
   *
   * @returns The fully-resolved prompt string ready to send to the model.
   * @throws  Error if the command name is not found in the registry.
   *
   * Exam trap: The return value is a *prompt*, not an action. Claude Code
   * feeds this string into the conversation as a user message. The model
   * then decides what to do based on the prompt content.
   */
  execute(name: string, args: string = ''): string {
    const command = this.commands.get(name);
    if (!command) {
      throw new Error(
        `Unknown command: "${name}". Available: ${[...this.commands.keys()].join(', ')}`,
      );
    }

    return substituteArguments(command.template, args);
  }

  /**
   * List all registered commands. Useful for help screens and tab-completion.
   *
   * Returns a shallow copy to prevent external mutation of the registry.
   */
  list(): SlashCommand[] {
    return [...this.commands.values()];
  }

  /**
   * Check whether a specific command exists in the registry.
   */
  has(name: string): boolean {
    return this.commands.has(name);
  }
}

// ---------------------------------------------------------------------------
// Skill helpers
// ---------------------------------------------------------------------------

/**
 * Parse a skill.md manifest into a SkillDefinition.
 *
 * Skill manifests follow a convention:
 *   - First `# heading` is the skill name.
 *   - Everything below is the instruction body.
 *
 * Exam concept: Skills and commands are complementary. Commands are user-invoked
 * templates; skills are AI-invoked capabilities with richer semantics.
 */
export function parseSkillManifest(skillMdPath: string, content: string): SkillDefinition {
  const lines = content.split('\n');
  let name = 'unnamed-skill';
  const instructionLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#\s+(.+)$/);
    if (headingMatch && name === 'unnamed-skill') {
      name = headingMatch[1].trim().toLowerCase().replace(/\s+/g, '-');
      continue;
    }
    instructionLines.push(line);
  }

  return {
    name,
    skillMdPath,
    instructions: instructionLines.join('\n').trim(),
  };
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export {
  deriveCommandName,
  extractDescription,
  substituteArguments,
  PROJECT_COMMANDS_DIR,
  ARGUMENTS_PLACEHOLDER,
  PROJECT_COMMAND_PREFIX,
};
