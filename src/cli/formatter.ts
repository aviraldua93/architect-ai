/**
 * Terminal output formatting for architect-ai CLI.
 * ANSI colour helpers, box drawing, progress bars, and score displays.
 *
 * Zero dependencies — pure ANSI escape sequences.
 */

const ESC = '\x1b[';

// ── Colour Primitives ──────────────────────────────────────────

export const colours = {
  reset:     `${ESC}0m`,
  bold:      `${ESC}1m`,
  dim:       `${ESC}2m`,
  italic:    `${ESC}3m`,
  underline: `${ESC}4m`,
  red:       `${ESC}31m`,
  green:     `${ESC}32m`,
  yellow:    `${ESC}33m`,
  blue:      `${ESC}34m`,
  magenta:   `${ESC}35m`,
  cyan:      `${ESC}36m`,
  white:     `${ESC}37m`,
  grey:      `${ESC}90m`,
} as const;

/** Handy colour/style wrappers — each returns a styled string */
export const c = {
  // Style
  bold:      (s: string) => `${colours.bold}${s}${colours.reset}`,
  dim:       (s: string) => `${colours.dim}${s}${colours.reset}`,
  italic:    (s: string) => `${colours.italic}${s}${colours.reset}`,
  underline: (s: string) => `${colours.underline}${s}${colours.reset}`,

  // Colours
  red:       (s: string) => `${colours.red}${s}${colours.reset}`,
  green:     (s: string) => `${colours.green}${s}${colours.reset}`,
  yellow:    (s: string) => `${colours.yellow}${s}${colours.reset}`,
  blue:      (s: string) => `${colours.blue}${s}${colours.reset}`,
  magenta:   (s: string) => `${colours.magenta}${s}${colours.reset}`,
  cyan:      (s: string) => `${colours.cyan}${s}${colours.reset}`,
  white:     (s: string) => `${colours.white}${s}${colours.reset}`,
  grey:      (s: string) => `${colours.grey}${s}${colours.reset}`,

  // Semantic — use these for consistent meaning across the CLI
  correct:     (s: string) => `${colours.bold}${colours.green}${s}${colours.reset}`,
  incorrect:   (s: string) => `${colours.bold}${colours.red}${s}${colours.reset}`,
  explanation: (s: string) => `${colours.yellow}${s}${colours.reset}`,
  scenario:    (s: string) => `${colours.cyan}${s}${colours.reset}`,
  header:      (s: string) => `${colours.bold}${colours.magenta}${s}${colours.reset}`,
  accent:      (s: string) => `${colours.bold}${colours.cyan}${s}${colours.reset}`,
};


// ── Text Utilities ─────────────────────────────────────────────

/** Strip ANSI escape codes (for measuring visible string length) */
export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

/** Word-wrap text to a given visible width */
export function wrapText(text: string, width: number = 66): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = '';

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (stripAnsi(test).length > width && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

/** Pad a string (accounting for ANSI) to a visible width */
export function padEnd(s: string, width: number): string {
  const visible = stripAnsi(s).length;
  return s + ' '.repeat(Math.max(0, width - visible));
}


// ── Box Drawing ────────────────────────────────────────────────

/**
 * Draw a bordered box around text content.
 *
 * @example
 *   box('Hello world', { title: 'Greeting', colour: colours.cyan })
 */
export function box(content: string, opts: {
  title?: string;
  width?: number;
  colour?: string;
  indent?: number;
} = {}): string {
  const { title, width = 68, colour = colours.cyan, indent = 2 } = opts;
  const innerWidth = width - 4;               // 2 border + 2 padding
  const pad = ' '.repeat(indent);
  const wrapped = wrapText(content, innerWidth);

  // Top border
  let top: string;
  if (title) {
    const titleText = ` ${title} `;
    const remaining = Math.max(0, width - 2 - titleText.length - 1);
    top = `${pad}${colour}╭─${colours.reset}${colours.bold}${titleText}${colours.reset}${colour}${'─'.repeat(remaining)}╮${colours.reset}`;
  } else {
    top = `${pad}${colour}╭${'─'.repeat(width - 2)}╮${colours.reset}`;
  }

  const bottom = `${pad}${colour}╰${'─'.repeat(width - 2)}╯${colours.reset}`;
  const emptyLine = `${pad}${colour}│${colours.reset}${' '.repeat(width - 2)}${colour}│${colours.reset}`;

  const body = wrapped.map(line => {
    const visLen = stripAnsi(line).length;
    const trailing = Math.max(0, innerWidth - visLen);
    return `${pad}${colour}│${colours.reset} ${line}${' '.repeat(trailing)} ${colour}│${colours.reset}`;
  });

  return [top, emptyLine, ...body, emptyLine, bottom].join('\n');
}


// ── Progress & Score Bars ──────────────────────────────────────

/** Quiz progress bar: ▓▓▓▓▓░░░░░ 50% */
export function progressBar(current: number, total: number, width: number = 20): string {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const filled = total > 0 ? Math.round((current / total) * width) : 0;
  const empty = width - filled;
  const bar = '▓'.repeat(filled) + '░'.repeat(empty);
  return `${c.cyan(bar)} ${c.bold(String(pct) + '%')}`;
}

/** Score bar with colour-coded threshold (green ≥80, yellow ≥60, red <60) */
export function scoreBar(score: number, total: number, width: number = 10): string {
  if (total === 0) return c.grey('░'.repeat(width));
  const pct = Math.round((score / total) * 100);
  const filled = Math.round((score / total) * width);
  const empty = width - filled;

  const fn = pct >= 80 ? c.green : pct >= 60 ? c.yellow : c.red;
  return `${fn('█'.repeat(filled))}${c.grey('░'.repeat(empty))} ${fn(String(pct) + '%')}`;
}


// ── Display Components ─────────────────────────────────────────

/** The architect-ai welcome banner */
export function banner(): void {
  console.log('');
  console.log(c.cyan('  ╔══════════════════════════════════════════════════════════════╗'));
  console.log(c.cyan('  ║') + '  🏗️  ' + c.bold('architect-ai') + '                                            ' + c.cyan('║'));
  console.log(c.cyan('  ║') + '  ' + c.dim('Claude Certified Architect — Exam Preparation Tool') + '         ' + c.cyan('║'));
  console.log(c.cyan('  ╚══════════════════════════════════════════════════════════════╝'));
  console.log('');
}

/** Horizontal divider line */
export function divider(width: number = 58, char: string = '─'): string {
  return c.grey(char.repeat(width));
}

/** Section header with emoji and label */
export function sectionHeader(emoji: string, label: string): void {
  console.log('');
  console.log(`  ${emoji} ${c.bold(label)}`);
  console.log(`  ${divider()}`);
}

/** Print a key-value line with alignment */
export function kvLine(key: string, value: string, indent: number = 4): void {
  console.log(`${' '.repeat(indent)}${c.dim(key + ':')} ${value}`);
}

/** Print an empty line */
export function gap(): void {
  console.log('');
}
