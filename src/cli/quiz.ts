/**
 * Quiz Command — The heart of architect-ai.
 *
 * Loads questions, presents them interactively in the terminal,
 * tracks scores, and displays a domain-level breakdown.
 *
 * Tier 1: works offline with zero API keys.
 */

import * as readline from 'readline';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  c, colours, banner, box, progressBar, scoreBar,
  sectionHeader, divider, gap, wrapText, kvLine,
} from './formatter';

// ── Types ──────────────────────────────────────────────────────

export interface Question {
  id: string;
  domain: number;
  domainName: string;
  taskStatement: string;
  taskStatementName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  scenario: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  tags: string[];
}

export interface QuizOptions {
  domain?: number;
  taskStatement?: string;
  count?: number;
}

interface AnswerRecord {
  question: Question;
  userAnswer: string;
  correct: boolean;
}

// ── Domain metadata ────────────────────────────────────────────

const DOMAIN_NAMES: Record<number, string> = {
  1: 'Agentic Architecture',
  2: 'Tool Design & MCP',
  3: 'CLI & Commands',
  4: 'Prompt Engineering',
  5: 'Context Management',
};


// ── Question Loading ───────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const QUESTIONS_DIR = join(__dirname, '..', 'content', 'questions');

/** Load questions from JSON files in the content directory */
async function loadQuestionsFromFiles(): Promise<Question[]> {
  try {
    const files = await readdir(QUESTIONS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    if (jsonFiles.length === 0) return [];

    const allQuestions: Question[] = [];
    for (const file of jsonFiles) {
      const raw = await readFile(join(QUESTIONS_DIR, file), 'utf-8');
      const parsed = JSON.parse(raw);
      const questions = Array.isArray(parsed) ? parsed : [parsed];
      allQuestions.push(...questions);
    }
    return allQuestions;
  } catch {
    return [];
  }
}

/** Inline fallback questions in case the content directory is empty */
function fallbackQuestions(): Question[] {
  return [
    {
      id: 'fb-001',
      domain: 1,
      domainName: 'Agentic Architecture',
      taskStatement: '1.1',
      taskStatementName: 'Design Agentic Loops',
      difficulty: 'medium',
      scenario: 'You are building a research agent that must gather information from multiple sources, synthesise findings, and produce a report. The number of sources varies per query.',
      question: 'Which loop pattern allows the agent to adaptively decide when it has gathered enough information?',
      options: {
        A: 'A fixed for-loop iterating over a predefined list of sources',
        B: 'A while-loop with a satisfaction check after each source, capped at a maximum iteration count',
        C: 'A single LLM call with all sources concatenated into the prompt',
        D: 'A recursive function with no base case that keeps searching indefinitely',
      },
      correctAnswer: 'B',
      explanation: 'A while-loop with a satisfaction check lets the agent stop early when it has enough information, whilst the iteration cap prevents runaway costs. Fixed loops are inflexible, single calls miss the adaptive element, and unbounded recursion is dangerous.',
      tags: ['agentic-loop', 'adaptive', 'exit-conditions'],
    },
    {
      id: 'fb-002',
      domain: 2,
      domainName: 'Tool Design & MCP',
      taskStatement: '2.2',
      taskStatementName: 'MCP Protocol',
      difficulty: 'medium',
      scenario: 'Your organisation wants to expose internal databases as tools that Claude can use. Multiple teams own different databases and want to publish tools independently.',
      question: 'What is the primary benefit of using the Model Context Protocol (MCP) for this use case?',
      options: {
        A: 'MCP encrypts all database queries automatically',
        B: 'MCP provides a standardised interface for tool discovery and invocation, enabling independent tool publishing',
        C: 'MCP replaces the need for database authentication entirely',
        D: 'MCP compresses database responses to fit within token limits',
      },
      correctAnswer: 'B',
      explanation: 'MCP\'s core value is standardisation — it defines a protocol for tool discovery, schema declaration, and invocation. This lets each team publish tools independently with consistent interfaces. It does not handle encryption, authentication, or compression natively.',
      tags: ['MCP', 'tool-discovery', 'standardisation'],
    },
    {
      id: 'fb-003',
      domain: 3,
      domainName: 'CLI & Commands',
      taskStatement: '3.1',
      taskStatementName: 'Command Design',
      difficulty: 'easy',
      scenario: 'You are designing a CLI for a developer tool. Users need to perform CRUD operations on projects, each with several sub-commands and flags.',
      question: 'Which CLI design pattern provides the best user experience for a tool with nested sub-commands?',
      options: {
        A: 'A flat command structure where every operation is a top-level command with long flag names',
        B: 'A hierarchical command structure with noun-verb grouping (e.g., project create, project list)',
        C: 'A single interactive REPL that handles all operations through a menu system',
        D: 'Positional arguments only, with no named flags or sub-commands',
      },
      correctAnswer: 'B',
      explanation: 'Hierarchical noun-verb commands (like git remote add or docker container ls) are the industry standard for complex CLIs. They provide discoverability, tab-completion support, and logical grouping. Flat structures become unwieldy, REPLs are poor for scripting, and positional-only args are error-prone.',
      tags: ['CLI', 'command-design', 'user-experience'],
    },
    {
      id: 'fb-004',
      domain: 4,
      domainName: 'Prompt Engineering',
      taskStatement: '4.1',
      taskStatementName: 'Prompt Templates',
      difficulty: 'easy',
      scenario: 'Your team maintains 50+ prompt templates for different use cases. Templates frequently need updates as model behaviour changes between versions. Multiple team members edit templates simultaneously.',
      question: 'Which approach to prompt template management reduces maintenance burden and merge conflicts?',
      options: {
        A: 'Hardcode all prompts directly in application source code as string constants',
        B: 'Store templates as versioned, parameterised files with clear variable placeholders and a changelog',
        C: 'Generate all prompts dynamically at runtime using another LLM',
        D: 'Maintain a single monolithic prompt file containing all templates concatenated together',
      },
      correctAnswer: 'B',
      explanation: 'Versioned, parameterised template files enable independent updates, clear change tracking, and reduced merge conflicts. Hardcoded strings couple prompts to code. LLM-generated prompts are unpredictable. Monolithic files create constant merge conflicts with 50+ templates.',
      tags: ['prompt-templates', 'versioning', 'maintenance'],
    },
    {
      id: 'fb-005',
      domain: 5,
      domainName: 'Context Management',
      taskStatement: '5.1',
      taskStatementName: 'Optimise Context Windows',
      difficulty: 'medium',
      scenario: 'Your chatbot maintains a conversation history that grows with each turn. After 30+ turns, the context window is nearly full and the model starts losing track of early conversation details.',
      question: 'Which context management strategy preserves important early information whilst staying within token limits?',
      options: {
        A: 'Truncate the oldest messages to make room, always keeping only the most recent turns',
        B: 'Use a sliding window with periodic summarisation — compress older turns into summaries whilst keeping recent turns verbatim',
        C: 'Start a new conversation every 10 turns and lose all previous context',
        D: 'Double the model\'s max_tokens parameter to fit everything',
      },
      correctAnswer: 'B',
      explanation: 'Sliding window with summarisation is the gold standard for long conversations. It preserves the gist of earlier turns through compressed summaries whilst maintaining full detail for recent context. Simple truncation loses important early context. Restarting loses everything. You cannot arbitrarily increase context window size.',
      tags: ['context-window', 'summarisation', 'sliding-window'],
    },
  ];
}

/** Load all available questions, falling back to inline samples */
export async function loadQuestions(): Promise<Question[]> {
  const fromFiles = await loadQuestionsFromFiles();
  if (fromFiles.length > 0) return fromFiles;
  return fallbackQuestions();
}


// ── Filtering & Shuffling ──────────────────────────────────────

/** Filter questions by domain and/or task statement */
export function filterQuestions(questions: Question[], opts: QuizOptions): Question[] {
  let filtered = [...questions];

  if (opts.taskStatement) {
    filtered = filtered.filter(q => q.taskStatement === opts.taskStatement);
  } else if (opts.domain) {
    filtered = filtered.filter(q => q.domain === opts.domain);
  }

  return filtered;
}

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


// ── Readline Helper ────────────────────────────────────────────

function createPrompt(): { ask: (q: string) => Promise<string>; close: () => void } {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return {
    ask: (prompt: string) => new Promise<string>(resolve => {
      rl.question(prompt, answer => resolve(answer.trim()));
    }),
    close: () => rl.close(),
  };
}


// ── Quiz Presentation ──────────────────────────────────────────

function presentQuestion(q: Question, index: number, total: number): void {
  // Header with progress
  console.log('');
  console.log(`  ${c.dim(`Question ${index + 1} of ${total}`)}  ${progressBar(index + 1, total, 24)}`);
  console.log(`  ${c.dim(`Domain ${q.domain}: ${q.domainName}`)}  ${c.dim('•')}  ${c.dim(`Task ${q.taskStatement}: ${q.taskStatementName}`)}`);
  console.log(`  ${c.dim('Difficulty:')} ${difficultyBadge(q.difficulty)}`);

  // Scenario box
  console.log('');
  console.log(box(q.scenario, { title: '📋 SCENARIO', colour: colours.cyan }));

  // Question
  console.log('');
  const questionLines = wrapText(q.question, 64);
  for (const line of questionLines) {
    console.log(`  ${c.bold('❓')} ${c.bold(line)}`);
  }

  // Options
  console.log('');
  const labels = ['A', 'B', 'C', 'D'] as const;
  for (const label of labels) {
    const optLines = wrapText(q.options[label], 60);
    console.log(`    ${c.accent(label + ')')} ${optLines[0]}`);
    for (let i = 1; i < optLines.length; i++) {
      console.log(`       ${optLines[i]}`);
    }
  }
  console.log('');
}

function difficultyBadge(d: string): string {
  switch (d) {
    case 'easy':   return c.green('● Easy');
    case 'medium': return c.yellow('●● Medium');
    case 'hard':   return c.red('●●● Hard');
    default:       return c.dim(d);
  }
}

function showResult(q: Question, userAnswer: string, correct: boolean): void {
  if (correct) {
    console.log(`  ${c.correct('✅ Correct!')} Well done.`);
  } else {
    console.log(`  ${c.incorrect('✗ Incorrect.')} The correct answer is ${c.correct(q.correctAnswer + ')')}`);
  }

  // Explanation
  console.log('');
  console.log(box(q.explanation, { title: '💡 EXPLANATION', colour: colours.yellow }));
}


// ── Score Display ──────────────────────────────────────────────

function displayResults(records: AnswerRecord[]): void {
  const total = records.length;
  const correctCount = records.filter(r => r.correct).length;
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // Title
  sectionHeader('📊', 'QUIZ RESULTS');
  console.log('');
  console.log(`    Score: ${c.bold(`${correctCount}/${total}`)} (${pct >= 80 ? c.correct(pct + '%') : pct >= 60 ? c.yellow(pct + '%') : c.incorrect(pct + '%')})`);
  console.log(`    ${scoreBar(correctCount, total, 30)}`);

  // Domain breakdown
  console.log('');
  console.log(`  ${c.bold('Domain Breakdown')}`);
  console.log(`  ${divider()}`);

  const domainScores = new Map<number, { correct: number; total: number; name: string }>();
  for (const r of records) {
    const d = r.question.domain;
    const entry = domainScores.get(d) || { correct: 0, total: 0, name: r.question.domainName };
    entry.total++;
    if (r.correct) entry.correct++;
    domainScores.set(d, entry);
  }

  const sortedDomains = [...domainScores.entries()].sort((a, b) => a[0] - b[0]);
  for (const [domNum, stats] of sortedDomains) {
    const label = `D${domNum} ${stats.name}`;
    const padded = label + ' '.repeat(Math.max(0, 32 - label.length));
    console.log(`    ${padded} ${c.bold(`${stats.correct}/${stats.total}`)}  ${scoreBar(stats.correct, stats.total)}`);
  }

  // Task statement breakdown
  const taskScores = new Map<string, { correct: number; total: number; name: string }>();
  for (const r of records) {
    const ts = r.question.taskStatement;
    const entry = taskScores.get(ts) || { correct: 0, total: 0, name: r.question.taskStatementName };
    entry.total++;
    if (r.correct) entry.correct++;
    taskScores.set(ts, entry);
  }

  // Weak areas (< 60% or 0 correct)
  const weakAreas = [...taskScores.entries()]
    .filter(([_, s]) => s.total > 0 && (s.correct / s.total) < 0.6)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (weakAreas.length > 0) {
    console.log('');
    console.log(`  ${c.yellow('⚠️  Weak Areas — Focus your revision here:')}`);
    for (const [ts, stats] of weakAreas) {
      console.log(`    ${c.red('•')} Task ${ts}: ${stats.name} ${c.dim(`(${stats.correct}/${stats.total})`)}`);
    }
  }

  // Strong areas
  const strongAreas = [...taskScores.entries()]
    .filter(([_, s]) => s.total > 0 && (s.correct / s.total) >= 0.8)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (strongAreas.length > 0) {
    console.log('');
    console.log(`  ${c.green('💪 Strong Areas:')}`);
    for (const [ts, stats] of strongAreas) {
      console.log(`    ${c.green('✓')} Task ${ts}: ${stats.name} ${c.dim(`(${stats.correct}/${stats.total})`)}`);
    }
  }

  // Encouragement
  console.log('');
  if (pct >= 90) {
    console.log(`  ${c.correct('🏆 Outstanding! You\'re well prepared for the exam.')}`);
  } else if (pct >= 80) {
    console.log(`  ${c.green('🌟 Great job! A bit more practice and you\'ll be exam-ready.')}`);
  } else if (pct >= 60) {
    console.log(`  ${c.yellow('📚 Good effort! Focus on your weak areas and try again.')}`);
  } else {
    console.log(`  ${c.red('💪 Keep practising! Review the explanations and have another go.')}`);
  }
  console.log('');
}


// ── Main Quiz Runner ───────────────────────────────────────────

export async function runQuiz(opts: QuizOptions = {}): Promise<void> {
  // Graceful exit on Ctrl+C
  const sigHandler = () => {
    console.log('\n\n' + c.dim('  Quiz cancelled. See you next time! 👋\n'));
    process.exit(0);
  };
  process.on('SIGINT', sigHandler);

  try {
    banner();

    // Load and filter questions
    const allQuestions = await loadQuestions();
    let questions = filterQuestions(allQuestions, opts);

    if (questions.length === 0) {
      console.log(c.yellow('  ⚠️  No questions found for the selected filter.'));
      if (opts.domain) {
        console.log(c.dim(`     Domain: ${opts.domain} (${DOMAIN_NAMES[opts.domain] || 'Unknown'})`));
      }
      if (opts.taskStatement) {
        console.log(c.dim(`     Task Statement: ${opts.taskStatement}`));
      }
      console.log('');
      console.log(c.dim('  Try running without filters: ') + c.bold('architect-ai quiz'));
      console.log('');
      return;
    }

    // Shuffle and limit
    questions = shuffle(questions);
    const count = opts.count || Math.min(questions.length, 10);
    questions = questions.slice(0, count);

    // Quiz info
    const filterDesc = opts.taskStatement
      ? `Task ${opts.taskStatement}`
      : opts.domain
        ? `Domain ${opts.domain}: ${DOMAIN_NAMES[opts.domain] || 'Unknown'}`
        : 'All Domains';

    console.log(`  ${c.bold('Quiz:')} ${c.cyan(filterDesc)}`);
    console.log(`  ${c.dim(`${questions.length} question${questions.length === 1 ? '' : 's'} · Answer A/B/C/D · Ctrl+C to quit`)}`);
    console.log(`  ${divider()}`);

    // Run the quiz
    const { ask, close } = createPrompt();
    const records: AnswerRecord[] = [];

    try {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        presentQuestion(q, i, questions.length);

        // Get a valid answer
        let answer = '';
        while (!['A', 'B', 'C', 'D'].includes(answer)) {
          const raw = await ask(`  ${c.bold('Your answer (A/B/C/D):')} `);
          answer = raw.toUpperCase();

          if (!['A', 'B', 'C', 'D'].includes(answer)) {
            console.log(c.dim('  Please enter A, B, C, or D.'));
          }
        }

        const correct = answer === q.correctAnswer;
        records.push({ question: q, userAnswer: answer, correct });

        console.log('');
        showResult(q, answer, correct);

        // Pause between questions (except last)
        if (i < questions.length - 1) {
          console.log('');
          await ask(c.dim('  Press Enter to continue...'));
        }
      }
    } finally {
      close();
    }

    // Show results
    displayResults(records);

  } finally {
    process.removeListener('SIGINT', sigHandler);
  }
}
