/**
 * Assess Command — Exam readiness assessment.
 *
 * Analyses saved progress to provide a weighted readiness score,
 * per-domain breakdown with visual bar chart, weak task statement
 * identification, and actionable next steps.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
  DOMAIN_NAMES,
  DOMAIN_WEIGHTS,
  TASK_STATEMENT_NAMES,
} from '../types';
import {
  c, colours, banner, box, divider,
  sectionHeader, gap, scoreBar,
} from './formatter';

// ── Progress loading ───────────────────────────────────────────

const PROGRESS_FILE = join(homedir(), '.architect-ai', 'progress.json');
const MIN_QUESTIONS = 30;
const PASS_THRESHOLD = 72;

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

function loadProgress(): ProgressData | null {
  try {
    if (existsSync(PROGRESS_FILE)) {
      return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
    }
  } catch { /* missing or corrupt */ }
  return null;
}

// ── Bar chart rendering ────────────────────────────────────────

function domainBar(score: number, width: number = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const filledStr = '█'.repeat(filled);
  const emptyStr = '░'.repeat(empty);

  if (score >= 80) return c.green(filledStr) + c.grey(emptyStr);
  if (score >= PASS_THRESHOLD) return c.yellow(filledStr) + c.grey(emptyStr);
  return c.red(filledStr) + c.grey(emptyStr);
}

function statusIcon(score: number): string {
  if (score >= 80) return '✅';
  if (score >= PASS_THRESHOLD) return '⚠️';
  return '❌';
}

// ── Main Assess Runner ─────────────────────────────────────────

export async function runAssess(): Promise<void> {
  banner();

  const progress = loadProgress();

  if (!progress || progress.answers.length === 0) {
    sectionHeader('📊', 'EXAM READINESS ASSESSMENT');
    console.log('');
    console.log(box(
      'No study progress found. Complete at least 30 questions in study or quiz mode first.',
      { title: '⚠️  NOT ENOUGH DATA', colour: colours.yellow },
    ));
    console.log('');
    console.log(`  ${c.dim('Start studying:')} ${c.accent('architect-ai study')}`);
    console.log(`  ${c.dim('Quick quiz:')}     ${c.accent('architect-ai quiz')}`);
    gap();
    return;
  }

  if (progress.answers.length < MIN_QUESTIONS) {
    sectionHeader('📊', 'EXAM READINESS ASSESSMENT');
    console.log('');
    console.log(box(
      `You've answered ${progress.answers.length} question${progress.answers.length === 1 ? '' : 's'} so far. ` +
      `Complete at least ${MIN_QUESTIONS} questions for a reliable readiness assessment.`,
      { title: '⚠️  MORE DATA NEEDED', colour: colours.yellow },
    ));
    console.log('');
    console.log(`  ${c.dim('Continue studying:')} ${c.accent('architect-ai study')}`);
    gap();
    return;
  }

  // ── Compute scores ────────────────────────────────────────────

  const domainStats = new Map<number, { correct: number; total: number }>();
  const taskStats = new Map<string, { correct: number; total: number }>();

  for (const a of progress.answers) {
    // Domain
    const ds = domainStats.get(a.domain) ?? { correct: 0, total: 0 };
    ds.total++;
    if (a.correct) ds.correct++;
    domainStats.set(a.domain, ds);

    // Task statement
    const ts = taskStats.get(a.taskStatement) ?? { correct: 0, total: 0 };
    ts.total++;
    if (a.correct) ts.correct++;
    taskStats.set(a.taskStatement, ts);
  }

  // Per-domain scores + weighted calculation
  let weightedTotal = 0;
  const domainScores: Array<{
    domain: number;
    name: string;
    score: number;
    correct: number;
    total: number;
    weight: number;
    weighted: number;
  }> = [];

  for (let d = 1; d <= 5; d++) {
    const stats = domainStats.get(d) ?? { correct: 0, total: 0 };
    const score = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    const weight = DOMAIN_WEIGHTS[d] ?? 0;
    const weighted = (score * weight) / 100;
    weightedTotal += weighted;

    domainScores.push({
      domain: d,
      name: DOMAIN_NAMES[d] ?? `Domain ${d}`,
      score,
      correct: stats.correct,
      total: stats.total,
      weight,
      weighted: Math.round(weighted * 10) / 10,
    });
  }

  const overallScore = Math.round(weightedTotal);
  const passReady = overallScore >= PASS_THRESHOLD;

  // ── Render ────────────────────────────────────────────────────

  console.log('');
  const prediction = passReady ? c.correct('PASS') : c.incorrect('NEEDS WORK');
  const overallColour = overallScore >= 80 ? c.correct : overallScore >= PASS_THRESHOLD ? c.yellow : c.incorrect;
  console.log(`  📊 ${c.bold('EXAM READINESS:')} ${overallColour(overallScore + '%')} (Predicted: ${prediction})`);
  console.log('');

  // Domain bar chart
  console.log(`  ${c.bold('Domain Scores')}`);
  console.log(`  ${divider()}`);

  for (const ds of domainScores) {
    const label = `D${ds.domain} ${ds.name}`;
    const padded = label + ' '.repeat(Math.max(0, 28 - label.length));
    const scoreStr = String(ds.score).padStart(3) + '%';
    const icon = ds.total > 0 ? statusIcon(ds.score) : c.dim('—');
    const bar = ds.total > 0 ? domainBar(ds.score) : c.grey('░'.repeat(20));
    const detail = ds.total > 0 ? c.dim(` (${ds.correct}/${ds.total})`) : c.dim(' (no data)');

    console.log(`    ${padded} ${bar} ${scoreStr}  ${icon}${detail}`);
  }

  // Weight info
  console.log('');
  console.log(`  ${c.dim('Weights:')} ${domainScores.map(ds => `D${ds.domain}=${ds.weight}%`).join(c.dim(', '))}`);

  // ── Weak task statements ──────────────────────────────────────

  const weakTasks = [...taskStats.entries()]
    .filter(([_, s]) => s.total >= 2 && Math.round((s.correct / s.total) * 100) < PASS_THRESHOLD)
    .map(([ts, s]) => ({
      taskStatement: ts,
      name: TASK_STATEMENT_NAMES[ts] ?? 'Unknown',
      score: Math.round((s.correct / s.total) * 100),
      correct: s.correct,
      total: s.total,
    }))
    .sort((a, b) => a.score - b.score);

  if (weakTasks.length > 0) {
    console.log('');
    sectionHeader('⚠️', `WEAK AREAS (< ${PASS_THRESHOLD}% accuracy)`);
    console.log('');
    for (const wt of weakTasks) {
      const label = `Task ${wt.taskStatement}: ${wt.name}`;
      const padded = label + ' '.repeat(Math.max(0, 42 - label.length));
      console.log(`    ${c.red('•')} ${padded} ${c.red(wt.score + '%')} ${c.dim(`(${wt.correct}/${wt.total})`)}`);
    }
  }

  // ── Strong areas ──────────────────────────────────────────────

  const strongTasks = [...taskStats.entries()]
    .filter(([_, s]) => s.total >= 2 && Math.round((s.correct / s.total) * 100) >= 80)
    .map(([ts, s]) => ({
      taskStatement: ts,
      name: TASK_STATEMENT_NAMES[ts] ?? 'Unknown',
      score: Math.round((s.correct / s.total) * 100),
    }))
    .sort((a, b) => b.score - a.score);

  if (strongTasks.length > 0) {
    console.log('');
    sectionHeader('💪', 'STRONG AREAS (≥ 80% accuracy)');
    console.log('');
    for (const st of strongTasks.slice(0, 5)) {
      console.log(`    ${c.green('✓')} Task ${st.taskStatement}: ${st.name} ${c.dim(`(${st.score}%`)}`);
    }
    if (strongTasks.length > 5) {
      console.log(`    ${c.dim(`  ... and ${strongTasks.length - 5} more`)}`);
    }
  }

  // ── Recommendation ────────────────────────────────────────────

  console.log('');
  sectionHeader('🎯', 'RECOMMENDED NEXT STEPS');
  console.log('');

  if (!passReady) {
    const worstDomain = domainScores
      .filter(ds => ds.total > 0)
      .sort((a, b) => a.score - b.score)[0];

    if (worstDomain) {
      console.log(`    ${c.bold('1.')} Focus on ${c.cyan(worstDomain.name)} (${worstDomain.score}%):`);
      console.log(`       ${c.accent(`architect-ai study --domain ${worstDomain.domain}`)}`);
    }

    if (weakTasks.length > 0) {
      const worst = weakTasks[0];
      console.log(`    ${c.bold('2.')} Drill weakest task (${worst.taskStatement}: ${worst.name}):`);
      console.log(`       ${c.accent(`architect-ai study --task ${worst.taskStatement}`)}`);
    }

    console.log(`    ${c.bold('3.')} ${c.dim('After improving, re-assess:')} ${c.accent('architect-ai assess')}`);
  } else {
    console.log(`    ${c.green('🏆 You\'re on track to pass! Keep reviewing to maintain your edge.')}`);
    console.log(`    ${c.dim('Continue studying:')} ${c.accent('architect-ai study')}`);
    console.log(`    ${c.dim('View dashboard:')}   ${c.accent('architect-ai dashboard')}`);
  }

  // ── Stats footer ──────────────────────────────────────────────

  console.log('');
  console.log(`  ${divider()}`);
  const totalCorrect = progress.answers.filter(a => a.correct).length;
  console.log(`  ${c.dim(`Total: ${progress.answers.length} questions answered, ${totalCorrect} correct (${Math.round((totalCorrect / progress.answers.length) * 100)}%)`)}`);
  console.log(`  ${c.dim(`Last activity: ${new Date(progress.lastUpdated).toLocaleDateString()}`)}`);
  gap();
}
