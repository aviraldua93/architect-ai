/**
 * Dashboard Command — Rich terminal progress dashboard.
 *
 * Displays overall score, domain bars, study streak,
 * SRS due count, weakest task, and recommended command.
 * Uses box-drawing characters for a polished look.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { SpacedRepetitionEngine } from '../context/spaced-repetition';
import { getQuestions } from '../content/questions';
import {
  DOMAIN_NAMES,
  DOMAIN_WEIGHTS,
  TASK_STATEMENT_NAMES,
} from '../types';
import { c, colours, divider, gap } from './formatter';

// ── Data loading ───────────────────────────────────────────────

const DATA_DIR = join(homedir(), '.architect-ai');
const PROGRESS_FILE = join(DATA_DIR, 'progress.json');
const PASS_THRESHOLD = 72;

interface ProgressEntry {
  questionId: string;
  correct: boolean;
  domain: number;
  taskStatement: string;
  timestamp: string;
}

interface ProgressData {
  answers: ProgressEntry[];
  lastUpdated: string;
}

function loadProgress(): ProgressData | null {
  try {
    if (existsSync(PROGRESS_FILE)) {
      return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch { /* missing or corrupt */ }
  return null;
}

// ── Streak calculation ─────────────────────────────────────────

function calculateStreak(answers: ProgressEntry[]): number {
  if (answers.length === 0) return 0;

  // Group answers by date
  const dates = new Set<string>();
  for (const a of answers) {
    dates.add(a.timestamp.split('T')[0]);
  }

  const sortedDates = [...dates].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Streak must include today or yesterday
  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;

  let streak = 0;
  let checkDate = new Date(sortedDates[0]);
  for (const dateStr of sortedDates) {
    const expected = checkDate.toISOString().split('T')[0];
    if (dateStr === expected) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ── Box rendering ──────────────────────────────────────────────

function hLine(width: number, left: string, fill: string, right: string): string {
  return `  ${left}${fill.repeat(width - 2)}${right}`;
}

function padLine(content: string, width: number): string {
  // Measure visible length (strip ANSI)
  const visible = content.replace(/\x1b\[[0-9;]*m/g, '').length;
  const pad = Math.max(0, width - 4 - visible);
  return `  ${colours.cyan}║${colours.reset} ${content}${' '.repeat(pad)} ${colours.cyan}║${colours.reset}`;
}

function emptyLine(width: number): string {
  return padLine('', width);
}

function domainBar(score: number, width: number = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const filledStr = '█'.repeat(filled);
  const emptyStr = '░'.repeat(empty);

  if (score >= 80) return c.green(filledStr) + c.grey(emptyStr);
  if (score >= PASS_THRESHOLD) return c.yellow(filledStr) + c.grey(emptyStr);
  return c.red(filledStr) + c.grey(emptyStr);
}

function statusIcon(score: number, hasData: boolean): string {
  if (!hasData) return c.dim('—');
  if (score >= 80) return '✅';
  if (score >= PASS_THRESHOLD) return '⚠️';
  return '❌';
}

// ── Main Dashboard Runner ──────────────────────────────────────

export async function runDashboard(): Promise<void> {
  const progress = loadProgress();
  const W = 56; // inner width of the dashboard box

  // ── Header ──────────────────────────────────────────────────

  console.log('');
  console.log(hLine(W, `${colours.cyan}╔${'═'.repeat(W - 2)}╗${colours.reset}`, '', ''));
  // Re-render header manually to avoid double border chars
  const titleText = '📊 ArchitectAI Progress Dashboard';
  const titlePad = Math.max(0, W - 4 - titleText.length);
  console.log(`  ${colours.cyan}║${colours.reset} ${c.bold(titleText)}${' '.repeat(titlePad)} ${colours.cyan}║${colours.reset}`);
  console.log(hLine(W, `${colours.cyan}╠${'═'.repeat(W - 2)}╣${colours.reset}`, '', ''));

  if (!progress || progress.answers.length === 0) {
    console.log(emptyLine(W));
    console.log(padLine(c.yellow('No study data yet. Start learning!'), W));
    console.log(emptyLine(W));
    console.log(padLine(`Run: ${c.accent('architect-ai study')}`, W));
    console.log(emptyLine(W));
    console.log(hLine(W, `${colours.cyan}╚${'═'.repeat(W - 2)}╝${colours.reset}`, '', ''));
    gap();
    return;
  }

  const answers = progress.answers;
  const totalAnswered = answers.length;
  const totalCorrect = answers.filter(a => a.correct).length;
  const overallPct = Math.round((totalCorrect / totalAnswered) * 100);

  // Load SRS for due count
  const srs = new SpacedRepetitionEngine();
  let allQuestionIds: string[] = [];
  try {
    allQuestionIds = getQuestions().map(q => q.id);
  } catch { /* questions not available */ }
  const dueCount = srs.getDueCount(allQuestionIds);

  // Compute domain scores
  const domainStats = new Map<number, { correct: number; total: number }>();
  const taskStats = new Map<string, { correct: number; total: number }>();

  for (const a of answers) {
    const ds = domainStats.get(a.domain) ?? { correct: 0, total: 0 };
    ds.total++;
    if (a.correct) ds.correct++;
    domainStats.set(a.domain, ds);

    const ts = taskStats.get(a.taskStatement) ?? { correct: 0, total: 0 };
    ts.total++;
    if (a.correct) ts.correct++;
    taskStats.set(a.taskStatement, ts);
  }

  // Weighted score
  let weightedTotal = 0;
  const domainScores: Array<{ domain: number; name: string; score: number; total: number }> = [];
  for (let d = 1; d <= 5; d++) {
    const stats = domainStats.get(d) ?? { correct: 0, total: 0 };
    const score = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    weightedTotal += (score * (DOMAIN_WEIGHTS[d] ?? 0)) / 100;
    domainScores.push({ domain: d, name: DOMAIN_NAMES[d] ?? `D${d}`, score, total: stats.total });
  }
  const examScore = Math.round(weightedTotal);
  const passReady = examScore >= PASS_THRESHOLD;
  const passLabel = passReady ? c.correct('PASS ✅') : c.incorrect('NEEDS WORK ❌');

  // Streak
  const streak = calculateStreak(answers);

  // Weakest task
  const weakTasks = [...taskStats.entries()]
    .filter(([_, s]) => s.total >= 2)
    .map(([ts, s]) => ({
      ts,
      name: TASK_STATEMENT_NAMES[ts] ?? 'Unknown',
      score: Math.round((s.correct / s.total) * 100),
    }))
    .filter(t => t.score < PASS_THRESHOLD)
    .sort((a, b) => a.score - b.score);

  // ── Render body ─────────────────────────────────────────────

  console.log(emptyLine(W));

  // Overall stats
  const overallColor = overallPct >= 80 ? c.green : overallPct >= PASS_THRESHOLD ? c.yellow : c.red;
  console.log(padLine(`Overall: ${c.bold(`${totalCorrect}/${totalAnswered}`)} questions correct (${overallColor(overallPct + '%')})`, W));
  console.log(padLine(`Predicted Exam Score: ${overallColor(examScore + '%')} (${passLabel})`, W));
  console.log(emptyLine(W));

  // Domain scores
  console.log(padLine(c.bold('Domain Scores:'), W));
  for (const ds of domainScores) {
    const label = `D${ds.domain} ${ds.name}`;
    const padded = label + ' '.repeat(Math.max(0, 18 - label.length));
    const bar = ds.total > 0 ? domainBar(ds.score) : c.grey('░'.repeat(20));
    const scoreStr = ds.total > 0 ? String(ds.score).padStart(3) + '%' : ' — ';
    const icon = statusIcon(ds.score, ds.total > 0);
    console.log(padLine(`${padded} ${bar} ${scoreStr}  ${icon}`, W));
  }
  console.log(emptyLine(W));

  // Streak + SRS
  const streakDisplay = streak > 0 ? `${streak} day${streak === 1 ? '' : 's'} 🔥` : c.dim('0 days');
  console.log(padLine(`Study Streak: ${c.bold(streakDisplay)}`, W));
  console.log(padLine(`Questions Due (SRS): ${c.bold(String(dueCount))}`, W));

  // Weakest task
  if (weakTasks.length > 0) {
    const worst = weakTasks[0];
    console.log(padLine(`Weakest Task: ${c.red(`${worst.ts} (${worst.name})`)} — ${c.red(worst.score + '%')}`, W));
  } else {
    console.log(padLine(`Weakest Task: ${c.green('None below threshold!')}`, W));
  }

  console.log(emptyLine(W));

  // Recommendation
  if (weakTasks.length > 0) {
    console.log(padLine(`Next: ${c.accent(`architect-ai study --task ${weakTasks[0].ts}`)}`, W));
  } else {
    console.log(padLine(`Next: ${c.accent('architect-ai study')}`, W));
  }

  // Footer
  console.log(hLine(W, `${colours.cyan}╚${'═'.repeat(W - 2)}╝${colours.reset}`, '', ''));
  gap();
}
