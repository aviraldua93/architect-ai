/**
 * Study Command — Adaptive study sessions with spaced repetition.
 *
 * Unlike quiz mode (random selection), study mode is adaptive:
 * it picks questions based on weakness and shows educational context
 * including source file references and concept links.
 */

import * as readline from 'readline';
import { getQuestions } from '../content/questions';
import { SpacedRepetitionEngine } from '../context/spaced-repetition';
import type { Question } from '../types';
import {
  DOMAIN_NAMES,
  TASK_STATEMENT_NAMES,
  normalizeDifficulty,
} from '../types';
import {
  c, colours, banner, box, progressBar, scoreBar,
  sectionHeader, divider, gap, wrapText,
} from './formatter';

// ── Types ──────────────────────────────────────────────────────

export interface StudyOptions {
  domain?: number;
  taskStatement?: string;
  count?: number;
}

interface StudyRecord {
  question: Question;
  userAnswer: string;
  correct: boolean;
}

// ── Progress persistence ───────────────────────────────────────

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DATA_DIR = join(homedir(), '.architect-ai');
const PROGRESS_FILE = join(DATA_DIR, 'progress.json');

interface ProgressEntry {
  questionId: string;
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
  domain: number;
  taskStatement: string;
  timestamp: string;
}

interface ProgressData {
  answers: ProgressEntry[];
  lastUpdated: string;
}

function loadProgress(): ProgressData {
  try {
    if (existsSync(PROGRESS_FILE)) {
      return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch { /* start fresh */ }
  return { answers: [], lastUpdated: new Date().toISOString() };
}

function saveProgress(data: ProgressData): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  data.lastUpdated = new Date().toISOString();
  writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf-8');
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

// ── Sanitisation ───────────────────────────────────────────────

function sanitiseInput(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, 10);
}

// ── Presentation ───────────────────────────────────────────────

function difficultyBadge(d: string): string {
  const norm = normalizeDifficulty(d);
  switch (norm) {
    case 'foundation':   return c.green('● Foundation');
    case 'intermediate': return c.yellow('●● Intermediate');
    case 'advanced':     return c.red('●●● Advanced');
    default:             return c.dim(d);
  }
}

function presentQuestion(q: Question, index: number, total: number): void {
  console.log('');
  console.log(`  ${c.dim(`Question ${index + 1} of ${total}`)}  ${progressBar(index + 1, total, 24)}`);
  const domainLabel = DOMAIN_NAMES[q.domain] ?? 'Unknown';
  const taskLabel = TASK_STATEMENT_NAMES[q.taskStatement] ?? 'Unknown';
  console.log(`  ${c.dim(`Domain ${q.domain}: ${domainLabel}`)}  ${c.dim('•')}  ${c.dim(`Task ${q.taskStatement}: ${taskLabel}`)}`);
  console.log(`  ${c.dim('Difficulty:')} ${difficultyBadge(q.difficulty)}`);

  console.log('');
  console.log(box(q.scenario, { title: '📋 SCENARIO', colour: colours.cyan }));

  console.log('');
  const questionLines = wrapText(q.question, 64);
  for (const line of questionLines) {
    console.log(`  ${c.bold('❓')} ${c.bold(line)}`);
  }

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

function showStudyResult(q: Question, correct: boolean, taskAccuracy: number): void {
  if (correct) {
    console.log(`  ${c.correct('✅ Correct!')} Well done.`);
  } else {
    console.log(`  ${c.incorrect('✗ Incorrect.')} The correct answer is ${c.correct(q.correctAnswer + ')')}`);
  }

  // Full explanation
  console.log('');
  console.log(box(q.explanation, { title: '💡 EXPLANATION', colour: colours.yellow }));

  // Exam trap
  if (q.examTrap) {
    console.log('');
    console.log(box(q.examTrap, { title: '⚠️  EXAM TRAP', colour: colours.red }));
  }

  // Concepts tested
  if (q.conceptsTested && q.conceptsTested.length > 0) {
    console.log('');
    console.log(`  ${c.dim('Concepts:')} ${q.conceptsTested.map(ct => c.cyan(ct)).join(c.dim(', '))}`);
  }

  // Source file references based on domain
  const domainSources: Record<number, string[]> = {
    1: ['src/agents/loop.ts', 'src/agents/orchestrator.ts', 'src/agents/subagent.ts'],
    2: ['src/tools/', 'src/mcp/'],
    3: ['src/cli/', 'src/config/'],
    4: ['src/prompts/'],
    5: ['src/context/'],
  };
  const sources = domainSources[q.domain];
  if (sources) {
    console.log(`  ${c.dim('Relevant source:')} ${sources.map(s => c.blue(s)).join(c.dim(', '))}`);
  }

  // Task statement accuracy
  console.log(`  ${c.dim('Task ' + q.taskStatement + ' accuracy:')} ${taskAccuracy >= 72 ? c.green(taskAccuracy + '%') : taskAccuracy >= 50 ? c.yellow(taskAccuracy + '%') : c.red(taskAccuracy + '%')}`);
}

function getTaskAccuracy(progress: ProgressData, taskStatement: string): number {
  const taskAnswers = progress.answers.filter(a => a.taskStatement === taskStatement);
  if (taskAnswers.length === 0) return 0;
  const correct = taskAnswers.filter(a => a.correct).length;
  return Math.round((correct / taskAnswers.length) * 100);
}

// ── Improvement Summary ────────────────────────────────────────

function showImprovementSummary(records: StudyRecord[], progressBefore: ProgressData, progressAfter: ProgressData): void {
  const total = records.length;
  if (total === 0) return;

  const correctCount = records.filter(r => r.correct).length;
  const pct = Math.round((correctCount / total) * 100);

  sectionHeader('📈', 'SESSION SUMMARY');
  console.log('');
  console.log(`    ${c.bold('This session:')} ${correctCount}/${total} correct (${pct >= 72 ? c.green(pct + '%') : c.yellow(pct + '%')})`);
  console.log(`    ${scoreBar(correctCount, total, 20)}`);

  // Overall progress
  const totalBefore = progressBefore.answers.length;
  const totalAfter = progressAfter.answers.length;
  const correctBefore = progressBefore.answers.filter(a => a.correct).length;
  const correctAfter = progressAfter.answers.filter(a => a.correct).length;

  const overallBefore = totalBefore > 0 ? Math.round((correctBefore / totalBefore) * 100) : 0;
  const overallAfter = totalAfter > 0 ? Math.round((correctAfter / totalAfter) * 100) : 0;
  const delta = overallAfter - overallBefore;

  console.log('');
  console.log(`    ${c.bold('Overall accuracy:')} ${overallAfter}% ${delta > 0 ? c.green(`(+${delta}%)`) : delta < 0 ? c.red(`(${delta}%)`) : c.dim('(no change)')}`);
  console.log(`    ${c.dim(`Total questions answered: ${totalAfter}`)}`);

  // Domain breakdown for this session
  const domainMap = new Map<number, { correct: number; total: number }>();
  for (const r of records) {
    const d = r.question.domain;
    const entry = domainMap.get(d) || { correct: 0, total: 0 };
    entry.total++;
    if (r.correct) entry.correct++;
    domainMap.set(d, entry);
  }

  if (domainMap.size > 0) {
    console.log('');
    console.log(`  ${c.bold('Session breakdown by domain:')}`);
    console.log(`  ${divider()}`);
    for (const [domNum, stats] of [...domainMap.entries()].sort((a, b) => a[0] - b[0])) {
      const name = DOMAIN_NAMES[domNum] ?? 'Unknown';
      const label = `D${domNum} ${name}`;
      const padded = label + ' '.repeat(Math.max(0, 28 - label.length));
      console.log(`    ${padded} ${c.bold(`${stats.correct}/${stats.total}`)}  ${scoreBar(stats.correct, stats.total)}`);
    }
  }

  // Next recommendation
  console.log('');
  console.log(`  ${c.dim('Continue studying:')} ${c.accent('architect-ai study')}`);
  console.log(`  ${c.dim('Check readiness:')}   ${c.accent('architect-ai assess')}`);
  gap();
}

// ── Main Study Runner ──────────────────────────────────────────

export async function runStudy(opts: StudyOptions = {}): Promise<void> {
  const records: StudyRecord[] = [];
  const srs = new SpacedRepetitionEngine();
  const progressBefore = loadProgress();
  const progress = loadProgress(); // working copy

  const sigHandler = () => {
    console.log('\n');
    if (records.length > 0) {
      const correct = records.filter(r => r.correct).length;
      console.log(c.dim(`  Study session interrupted. Score so far: ${correct}/${records.length} (${Math.round((correct / records.length) * 100)}%)`));
    }
    // Save whatever we have
    saveProgress(progress);
    srs.saveState();
    if (records.length > 0) {
      showImprovementSummary(records, progressBefore, progress);
    }
    console.log(c.dim('  Session saved. See you next time! 👋\n'));
    process.exit(0);
  };
  process.on('SIGINT', sigHandler);

  try {
    banner();
    sectionHeader('📚', 'ADAPTIVE STUDY SESSION');
    console.log('');

    // Load all questions
    let allQuestions: Question[];
    try {
      allQuestions = getQuestions();
    } catch (error) {
      console.error(`\n  Failed to load questions: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      process.exit(1);
    }

    // Filter by domain/task if specified
    let pool = [...allQuestions];
    if (opts.taskStatement) {
      pool = pool.filter(q => q.taskStatement === opts.taskStatement);
    } else if (opts.domain) {
      pool = pool.filter(q => q.domain === opts.domain);
    }

    if (pool.length === 0) {
      console.error('  No questions match your filters.\n');
      process.exit(1);
    }

    const count = opts.count || Math.min(pool.length, 10);
    const filterDesc = opts.taskStatement
      ? `Task ${opts.taskStatement}: ${TASK_STATEMENT_NAMES[opts.taskStatement] || 'Unknown'}`
      : opts.domain
        ? `Domain ${opts.domain}: ${DOMAIN_NAMES[opts.domain] || 'Unknown'}`
        : 'All Domains (SRS-guided)';

    const dueCount = srs.getDueCount(pool.map(q => q.id));
    console.log(`  ${c.bold('Mode:')} ${c.cyan(filterDesc)}`);
    console.log(`  ${c.dim(`${count} question${count === 1 ? '' : 's'} · ${dueCount} due for review · Answer A/B/C/D · Ctrl+C to save & quit`)}`);
    console.log(`  ${divider()}`);

    const { ask, close } = createPrompt();
    const usedIds = new Set<string>();

    try {
      for (let i = 0; i < count; i++) {
        // Pick next question via SRS
        const availableIds = pool
          .filter(q => !usedIds.has(q.id))
          .map(q => q.id);

        if (availableIds.length === 0) break;

        const nextId = srs.getNextQuestion(availableIds)
          ?? availableIds[Math.floor(Math.random() * availableIds.length)];

        const q = pool.find(p => p.id === nextId);
        if (!q) {
          console.error(c.dim(`  Warning: Question ${nextId} not found, skipping`));
          continue;
        }
        usedIds.add(q.id);

        presentQuestion(q, i, count);

        // Get valid answer
        let answer = '';
        while (!['A', 'B', 'C', 'D'].includes(answer)) {
          const raw = await ask(`  ${c.bold('Your answer (A/B/C/D):')} `);
          answer = raw.toUpperCase();
          if (!['A', 'B', 'C', 'D'].includes(answer)) {
            console.log(c.dim('  Please enter A, B, C, or D.'));
          }
        }

        const correct = answer === q.correctAnswer;
        records.push({ question: q, userAnswer: sanitiseInput(answer), correct });

        // Save to progress
        progress.answers.push({
          questionId: q.id,
          correct,
          userAnswer: sanitiseInput(answer),
          correctAnswer: q.correctAnswer,
          domain: q.domain,
          taskStatement: q.taskStatement,
          timestamp: new Date().toISOString(),
        });

        // Update SRS (correct=4, incorrect=1)
        srs.recordReview(q.id, correct ? 4 : 1);

        // Show result with educational context
        console.log('');
        const taskAcc = getTaskAccuracy(progress, q.taskStatement);
        showStudyResult(q, correct, taskAcc);

        // Pause between questions (except last)
        if (i < count - 1) {
          console.log('');
          await ask(c.dim('  Press Enter to continue...'));
        }
      }
    } finally {
      close();
    }

    // Save everything
    saveProgress(progress);
    srs.saveState();

    // Show summary
    showImprovementSummary(records, progressBefore, progress);

  } finally {
    process.removeListener('SIGINT', sigHandler);
  }
}
