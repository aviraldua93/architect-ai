/**
 * Quiz Command — The heart of architect-ai.
 *
 * Loads questions, presents them interactively in the terminal,
 * tracks scores, and displays a domain-level breakdown.
 *
 * Tier 1: works offline with zero API keys.
 */

import * as readline from 'readline';
import { getQuestions } from '../content/questions';
import type { Question, QuizOptions } from '../types';
import {
  DOMAIN_NAMES,
  TASK_STATEMENT_NAMES,
  normalizeDifficulty,
} from '../types';
import {
  c, colours, banner, box, progressBar, scoreBar,
  sectionHeader, divider, gap, wrapText, kvLine,
} from './formatter';

// Re-export types used by other modules (e.g. tests, CLI index)
export type { Question, QuizOptions };
export { loadQuestions, filterQuestions };

interface AnswerRecord {
  question: Question;
  userAnswer: string;
  correct: boolean;
}

// Fix RT-001: Sanitise raw user input before storing in AnswerRecord.
// Strips control characters, newlines, and limits length to 10 chars (only A/B/C/D expected).
function sanitiseInput(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // strip control characters and newlines
    .slice(0, 10);                     // limit to 10 chars max
}

// ── Question Loading ───────────────────────────────────────────────────────

/**
 * Load all available questions via the content loader.
 * Falls back to a single inline question if the content layer fails.
 */
async function loadQuestions(): Promise<Question[]> {
  try {
    const questions = getQuestions();
    if (questions.length > 0) return questions;
  } catch {
    // Content loader failed — fall back gracefully.
  }
  return [
    {
      id: 'fb-001', domain: 1, taskStatement: '1.1', difficulty: 'intermediate',
      scenario: 'You are building a research agent that must gather information from multiple sources.',
      question: 'Which loop pattern allows the agent to adaptively decide when it has gathered enough information?',
      options: {
        A: 'A fixed for-loop iterating over a predefined list of sources',
        B: 'A while-loop with a satisfaction check, capped at a maximum iteration count',
        C: 'A single LLM call with all sources concatenated into the prompt',
        D: 'A recursive function with no base case that keeps searching indefinitely',
      },
      correctAnswer: 'B',
      explanation: 'A while-loop with a satisfaction check lets the agent stop early, whilst the cap prevents runaway costs.',
      examTrap: 'Option D seems adaptive but unbounded loops are an anti-pattern.',
      conceptsTested: ['agentic-loop', 'exit-conditions'],
    },
  ];
}


// ── Filtering & Shuffling ──────────────────────────────────────

/** Filter questions by domain and/or task statement */
function filterQuestions(questions: Question[], opts: QuizOptions): Question[] {
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
  const domainLabel = DOMAIN_NAMES[q.domain] ?? 'Unknown';
  const taskLabel = TASK_STATEMENT_NAMES[q.taskStatement] ?? 'Unknown';
  console.log(`  ${c.dim(`Domain ${q.domain}: ${domainLabel}`)}  ${c.dim('•')}  ${c.dim(`Task ${q.taskStatement}: ${taskLabel}`)}`);
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
  const norm = normalizeDifficulty(d);
  switch (norm) {
    case 'foundation':   return c.green('● Foundation');
    case 'intermediate': return c.yellow('●● Intermediate');
    case 'advanced':     return c.red('●●● Advanced');
    default:             return c.dim(d);
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
    const entry = domainScores.get(d) || { correct: 0, total: 0, name: DOMAIN_NAMES[d] ?? 'Unknown' };
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
    const entry = taskScores.get(ts) || { correct: 0, total: 0, name: TASK_STATEMENT_NAMES[ts] ?? 'Unknown' };
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
  // Fix RT-007: SIGINT handler prints current score summary before exiting.
  // records is declared here so the handler can access it.
  const records: AnswerRecord[] = [];
  const sigHandler = () => {
    console.log('\n');
    if (records.length > 0) {
      const correct = records.filter(r => r.correct).length;
      console.log(c.dim(`  Quiz interrupted. Score so far: ${correct}/${records.length} (${Math.round((correct / records.length) * 100)}%)`));
    }
    console.log(c.dim('  Quiz cancelled. See you next time! 👋\n'));
    process.exit(0);
  };
  process.on('SIGINT', sigHandler);

  try {
    banner();

    // Load and filter questions with error boundary
    let allQuestions: Question[];
    try {
      allQuestions = await loadQuestions();
    } catch (error) {
      console.error(`\n  Failed to start quiz: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      console.error('  Check that question files exist in src/content/questions/\n');
      process.exit(1);
    }

    let questions = filterQuestions(allQuestions, opts);

    if (questions.length === 0) {
      console.error('\n  No questions match your filters.\n');
      if (opts.domain) {
        console.log(c.dim(`     Domain: ${opts.domain} (${DOMAIN_NAMES[opts.domain] || 'Unknown'})`));
      }
      if (opts.taskStatement) {
        console.log(c.dim(`     Task Statement: ${opts.taskStatement}`));
      }
      console.log('');
      console.log(c.dim('  Try running without filters: ') + c.bold('architect-ai quiz'));
      console.log('');
      process.exit(1);
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
        // Fix RT-001: sanitise before storing in AnswerRecord
        records.push({ question: q, userAnswer: sanitiseInput(answer), correct });

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
