#!/usr/bin/env node
/**
 * architect-ai CLI — Main entry point.
 *
 * Usage:
 *   architect-ai study          Start an interactive study session
 *   architect-ai quiz           Quick practice quiz (all domains)
 *   architect-ai quiz -d 1      Quiz filtered to Domain 1
 *   architect-ai quiz -t 1.1    Quiz filtered to Task Statement 1.1
 *   architect-ai assess         Check exam readiness
 *   architect-ai explain <c>    Explain a concept (Tier 3, requires API key)
 *   architect-ai version        Show version
 *   architect-ai help           Show help
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runQuiz } from './quiz';
import { runExam } from './exam';
import { runStudy } from './study';
import { runAssess } from './assess';
import { runDashboard } from './dashboard';
import { c, banner, gap, divider, sectionHeader } from './formatter';

// ── Version ────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

async function getVersion(): Promise<string> {
  try {
    const raw = await readFile(join(PROJECT_ROOT, 'VERSION'), 'utf-8');
    return raw.trim();
  } catch {
    return '0.1.0.0';
  }
}


// ── Argument Parsing ───────────────────────────────────────────

interface ParsedArgs {
  command: string;
  domain?: number;
  taskStatement?: string;
  concept?: string;
  questionCount?: number;
  flags: Set<string>;
}

function parseArgs(argv: string[]): ParsedArgs {
  // Skip 'bun', script path (and sometimes extra runner args)
  const args = argv.slice(2);

  const result: ParsedArgs = {
    command: 'help',
    flags: new Set(),
    questionCount: undefined,
  };

  if (args.length === 0) {
    return result;
  }

  // First positional arg is the command
  result.command = args[0].toLowerCase();

  // Parse remaining args
  let i = 1;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '-d' || arg === '--domain') {
      if (i + 1 < args.length) {
        result.domain = parseInt(args[i + 1], 10);
        i += 2;
        continue;
      }
    } else if (arg === '-t' || arg === '--task') {
      if (i + 1 < args.length) {
        result.taskStatement = args[i + 1];
        i += 2;
        continue;
      }
    } else if (arg === '-c' || arg === '--count') {
      if (i + 1 < args.length) {
        const n = parseInt(args[i + 1], 10);
        if (!isNaN(n) && n > 0) {
          result.questionCount = n;
        }
        i += 2;
        continue;
      }
    } else if (arg === '-q' || arg === '--questions') {
      if (i + 1 < args.length) {
        const n = parseInt(args[i + 1], 10);
        if (!isNaN(n) && n > 0) {
          result.questionCount = n;
        }
        i += 2;
        continue;
      }
    } else if (arg.startsWith('-')) {
      result.flags.add(arg);
    } else {
      // Positional arg — used for 'explain <concept>'
      if (!result.concept) {
        result.concept = args.slice(i).join(' ');
        break;
      }
    }
    i++;
  }

  return result;
}


// ── Commands ───────────────────────────────────────────────────

async function cmdHelp(): Promise<void> {
  banner();
  console.log(c.bold('  Commands'));
  console.log(`  ${divider()}`);
  console.log('');
  console.log(`    ${c.accent('study')}             Start an interactive study session`);
  console.log(`    ${c.accent('quiz')}              Quick practice quiz (10 random questions)`);
  console.log(`    ${c.accent('quiz')} -d ${c.dim('<n>')}       Quiz filtered to Domain n (1–5)`);
  console.log(`    ${c.accent('quiz')} -t ${c.dim('<n.n>')}     Quiz filtered to Task Statement (e.g. 1.1)`);
  console.log(`    ${c.accent('exam')}              Full CCA-F mock exam (60 questions, 120 min)`);
  console.log(`    ${c.accent('exam')} ${c.dim('--no-timer')}   Practice exam without countdown`);
  console.log(`    ${c.accent('exam')} ${c.dim('-q <n>')}       Custom question count (default 60)`);
  console.log(`    ${c.accent('assess')}            Check exam readiness (scores per domain)`);
  console.log(`    ${c.accent('dashboard')}         Progress dashboard with streaks & SRS stats`);
  console.log(`    ${c.accent('explain')} ${c.dim('<concept>')} Explain a concept ${c.dim('(Tier 3 — requires API key)')}`);
  console.log(`    ${c.accent('version')}           Show version`);
  console.log(`    ${c.accent('help')}              Show this help message`);
  console.log('');
  console.log(c.bold('  Domains'));
  console.log(`  ${divider()}`);
  console.log('');
  console.log(`    ${c.bold('1')}  Agentic Architecture      ${c.dim('Loops, orchestration, state')}`);
  console.log(`    ${c.bold('2')}  Tool Design & MCP          ${c.dim('Interfaces, protocol, registry')}`);
  console.log(`    ${c.bold('3')}  CLI & Commands              ${c.dim('Parsing, prompts, UX')}`);
  console.log(`    ${c.bold('4')}  Prompt Engineering          ${c.dim('Templates, CoT, few-shot')}`);
  console.log(`    ${c.bold('5')}  Context Management          ${c.dim('Windows, tokens, retrieval')}`);
  console.log('');
  console.log(c.dim('  Examples:'));
  console.log(c.dim('    bun run src/cli/index.ts quiz'));
  console.log(c.dim('    bun run src/cli/index.ts quiz -d 1'));
  console.log(c.dim('    bun run src/cli/index.ts quiz -t 1.1'));
  console.log(c.dim('    bun run src/cli/index.ts explain "agentic loops"'));
  console.log('');
}

async function cmdVersion(): Promise<void> {
  const version = await getVersion();
  console.log(`  ${c.bold('architect-ai')} ${c.cyan('v' + version)}`);
}

async function cmdQuiz(args: ParsedArgs): Promise<void> {
  await runQuiz({
    domain: args.domain,
    taskStatement: args.taskStatement,
  });
}

async function cmdExam(args: ParsedArgs): Promise<void> {
  await runExam({
    questionCount: args.questionCount,
    noTimer: args.flags.has('--no-timer'),
  });
}

async function cmdStudy(args: ParsedArgs): Promise<void> {
  await runStudy({
    domain: args.domain,
    taskStatement: args.taskStatement,
    count: args.questionCount,
  });
}

async function cmdAssess(): Promise<void> {
  await runAssess();
}

async function cmdDashboard(): Promise<void> {
  await runDashboard();
}

async function cmdExplain(args: ParsedArgs): Promise<void> {
  banner();
  const concept = args.concept;

  if (!concept) {
    console.log(c.yellow('  ⚠️  Please provide a concept to explain.'));
    console.log('');
    console.log(c.dim('  Usage:'));
    console.log(`    ${c.accent('architect-ai explain')} ${c.dim('"agentic loops"')}`);
    console.log(`    ${c.accent('architect-ai explain')} ${c.dim('"MCP protocol"')}`);
    console.log(`    ${c.accent('architect-ai explain')} ${c.dim('"context window optimisation"')}`);
    gap();
    return;
  }

  sectionHeader('🔒', `EXPLAIN: ${concept}`);
  console.log('');
  console.log(c.yellow('  This feature requires a Claude API key (Tier 3).'));
  console.log('');
  console.log(`  ${c.bold('Set your API key:')}`);
  console.log(c.dim('    export ANTHROPIC_API_KEY=sk-ant-...'));
  console.log('');
  console.log(`  ${c.bold('Then try:')}`);
  console.log(`    ${c.accent(`architect-ai explain "${concept}"`)}`);
  gap();
}


// ── Main ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  switch (args.command) {
    case 'quiz':
      await cmdQuiz(args);
      break;

    case 'exam':
      await cmdExam(args);
      break;

    case 'study':
      await cmdStudy(args);
      break;

    case 'assess':
    case 'assessment':
      await cmdAssess();
      break;

    case 'dashboard':
    case 'dash':
      await cmdDashboard();
      break;

    case 'explain':
      await cmdExplain(args);
      break;

    case 'version':
    case '-v':
    case '--version':
      await cmdVersion();
      break;

    case 'help':
    case '-h':
    case '--help':
    default:
      await cmdHelp();
      break;
  }
}

main().catch(err => {
  console.error(c.red(`\n  Error: ${err.message}\n`));
  process.exit(1);
});
