/**
 * Exam Simulation — Full CCA-F mock exam mode.
 *
 * Simulates the real Claude Certified Architect exam:
 * - 60 questions weighted by official domain percentages
 * - 120-minute countdown timer
 * - No explanations during exam (correct/incorrect only)
 * - Scaled score out of 1000, pass threshold 720
 * - Per-domain breakdown with bar charts
 * - Results saved to ~/.architect-ai/exams/
 *
 * Tier 1: works offline with zero API keys.
 */

import * as readline from 'readline';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { loadQuestions } from './quiz';
import type { Question } from '../types';
import { DOMAIN_NAMES } from '../types';
import {
  c, colours, banner, box, progressBar,
  sectionHeader, divider, gap, wrapText,
} from './formatter';

// ── Types ──────────────────────────────────────────────────────

export interface ExamOptions {
  /** Number of questions (default 60) */
  questionCount?: number;
  /** Disable the countdown timer */
  noTimer?: boolean;
}

export interface ExamAnswerRecord {
  questionId: string;
  domain: number;
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
}

export interface ExamResult {
  timestamp: string;
  totalQuestions: number;
  answered: number;
  correct: number;
  rawPercentage: number;
  scaledScore: number;
  passed: boolean;
  passThreshold: number;
  timeLimitMinutes: number;
  timeUsedSeconds: number;
  domainBreakdown: DomainScore[];
  weakestDomain: { domain: number; name: string; percentage: number } | null;
  answers: ExamAnswerRecord[];
}

export interface DomainScore {
  domain: number;
  name: string;
  attempted: number;
  correct: number;
  percentage: number;
}

// ── Domain Weights (official CCA-F percentages) ────────────────

const DOMAIN_WEIGHTS: Record<number, number> = {
  1: 27, // Agentic Architecture
  2: 18, // Tool Design & MCP
  3: 20, // Claude Code Config
  4: 20, // Prompt Engineering
  5: 15, // Context & Reliability
};

const PASS_THRESHOLD = 720;
const EXAM_TIME_MINUTES = 120;

// ── Question Selection (weighted by domain) ────────────────────

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Select questions weighted by domain percentages.
 * If a domain has fewer questions than its target, take all available
 * and redistribute remaining slots proportionally among other domains.
 */
export function selectWeightedQuestions(
  allQuestions: Question[],
  totalCount: number,
): Question[] {
  // Group questions by domain
  const byDomain = new Map<number, Question[]>();
  for (const q of allQuestions) {
    const list = byDomain.get(q.domain) || [];
    list.push(q);
    byDomain.set(q.domain, list);
  }

  // Shuffle each domain's questions
  for (const [domain, questions] of byDomain) {
    byDomain.set(domain, shuffle(questions));
  }

  // Calculate target counts per domain
  const domains = Object.keys(DOMAIN_WEIGHTS).map(Number);
  const targets = new Map<number, number>();
  for (const d of domains) {
    targets.set(d, Math.round((DOMAIN_WEIGHTS[d] / 100) * totalCount));
  }

  // Adjust rounding so targets sum to totalCount
  let targetSum = [...targets.values()].reduce((a, b) => a + b, 0);
  while (targetSum !== totalCount) {
    // Find domain with largest weight to adjust
    const sortedDomains = domains.sort((a, b) => DOMAIN_WEIGHTS[b] - DOMAIN_WEIGHTS[a]);
    if (targetSum < totalCount) {
      targets.set(sortedDomains[0], (targets.get(sortedDomains[0]) ?? 0) + 1);
      targetSum++;
    } else {
      // Find smallest non-zero to decrement
      const decrementable = sortedDomains.filter(d => (targets.get(d) ?? 0) > 0);
      targets.set(decrementable[decrementable.length - 1], (targets.get(decrementable[decrementable.length - 1]) ?? 0) - 1);
      targetSum--;
    }
  }

  // Select questions, redistributing if a domain is short
  const selected: Question[] = [];
  let deficit = 0;

  for (const d of domains) {
    const available = byDomain.get(d) || [];
    const target = targets.get(d) || 0;
    const take = Math.min(target, available.length);
    selected.push(...available.slice(0, take));
    deficit += target - take;
  }

  // Redistribute deficit: gather leftover questions from domains with surplus
  if (deficit > 0) {
    const leftover: Question[] = [];
    for (const d of domains) {
      const available = byDomain.get(d) || [];
      const target = targets.get(d) || 0;
      if (available.length > target) {
        leftover.push(...available.slice(target));
      }
    }
    const shuffledLeftover = shuffle(leftover);
    selected.push(...shuffledLeftover.slice(0, deficit));
  }

  return shuffle(selected);
}

// ── Scoring (pure function — testable) ─────────────────────────

/**
 * Calculate exam results from answer records.
 * Pure function: no side effects, fully testable.
 */
export function calculateExamResult(
  answers: ExamAnswerRecord[],
  totalQuestions: number,
  timeLimitMinutes: number,
  timeUsedSeconds: number,
): ExamResult {
  const correct = answers.filter(a => a.correct).length;
  const rawPercentage = totalQuestions > 0 ? correct / totalQuestions : 0;
  const scaledScore = Math.round(rawPercentage * 1000);

  // Per-domain breakdown
  const domainMap = new Map<number, { attempted: number; correct: number }>();
  for (const a of answers) {
    const entry = domainMap.get(a.domain) || { attempted: 0, correct: 0 };
    entry.attempted++;
    if (a.correct) entry.correct++;
    domainMap.set(a.domain, entry);
  }

  const domainBreakdown: DomainScore[] = [];
  for (let d = 1; d <= 5; d++) {
    const stats = domainMap.get(d) || { attempted: 0, correct: 0 };
    domainBreakdown.push({
      domain: d,
      name: DOMAIN_NAMES[d] ?? 'Unknown',
      attempted: stats.attempted,
      correct: stats.correct,
      percentage: stats.attempted > 0
        ? Math.round((stats.correct / stats.attempted) * 100)
        : 0,
    });
  }

  // Find weakest domain (only among domains with questions attempted)
  const attemptedDomains = domainBreakdown.filter(d => d.attempted > 0);
  let weakestDomain: ExamResult['weakestDomain'] = null;
  if (attemptedDomains.length > 0) {
    const weakest = attemptedDomains.reduce((min, d) =>
      d.percentage < min.percentage ? d : min
    );
    weakestDomain = {
      domain: weakest.domain,
      name: weakest.name,
      percentage: weakest.percentage,
    };
  }

  return {
    timestamp: new Date().toISOString(),
    totalQuestions,
    answered: answers.length,
    correct,
    rawPercentage,
    scaledScore,
    passed: scaledScore >= PASS_THRESHOLD,
    passThreshold: PASS_THRESHOLD,
    timeLimitMinutes,
    timeUsedSeconds,
    domainBreakdown,
    weakestDomain,
    answers,
  };
}

// ── Timer ──────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Readline Helper ────────────────────────────────────────────

function createExamPrompt(): {
  ask: (q: string) => Promise<string>;
  close: () => void;
} {
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

// ── Sanitise Input ─────────────────────────────────────────────

function sanitiseInput(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, 10);
}

// ── Exam Presentation ──────────────────────────────────────────

function presentExamQuestion(
  q: Question,
  index: number,
  total: number,
  remainingSeconds: number | null,
): void {
  console.log('');

  // Header line: question number + timer
  const progress = `Question ${index + 1}/${total}`;
  const timerStr = remainingSeconds !== null
    ? `  ⏱️  ${formatTime(remainingSeconds)}`
    : '';
  console.log(`  ${c.bold(progress)}  ${progressBar(index + 1, total, 20)}${c.yellow(timerStr)}`);

  // Domain tag
  const domainLabel = DOMAIN_NAMES[q.domain] ?? 'Unknown';
  console.log(`  ${c.dim(`Domain ${q.domain}: ${domainLabel}`)}`);

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

// ── Results Display ────────────────────────────────────────────

function displayExamResults(result: ExamResult): void {
  console.log('');
  console.log(c.cyan('  ╔══════════════════════════════════════════════════════════════╗'));
  console.log(c.cyan('  ║') + '  📝 ' + c.bold('CCA-F MOCK EXAM — RESULTS') + '                                ' + c.cyan('║'));
  console.log(c.cyan('  ╚══════════════════════════════════════════════════════════════╝'));
  console.log('');

  // Pass/Fail verdict
  const verdict = result.passed
    ? c.correct('✅ PASS')
    : c.incorrect('❌ FAIL');
  const scoreColour = result.passed ? c.correct : c.incorrect;

  console.log(`  ${c.bold('Score:')} ${scoreColour(`${result.scaledScore}/1000`)}  ${verdict}`);
  console.log(`  ${c.dim(`Pass threshold: ${result.passThreshold}/1000 (72%)`)}`);
  console.log('');

  // Raw stats
  console.log(`  ${c.dim('Correct:')} ${c.bold(`${result.correct}/${result.totalQuestions}`)} (${Math.round(result.rawPercentage * 100)}%)`);
  console.log(`  ${c.dim('Answered:')} ${result.answered}/${result.totalQuestions}`);

  // Time
  const timeUsedFormatted = formatTime(result.timeUsedSeconds);
  const timeLimitFormatted = formatTime(result.timeLimitMinutes * 60);
  console.log(`  ${c.dim('Time:')} ${timeUsedFormatted} / ${timeLimitFormatted}`);

  // Per-domain breakdown
  console.log('');
  sectionHeader('📊', 'DOMAIN BREAKDOWN');
  console.log('');

  for (const ds of result.domainBreakdown) {
    if (ds.attempted === 0) continue;
    const label = `D${ds.domain} ${ds.name}`;
    const padded = label + ' '.repeat(Math.max(0, 32 - label.length));
    const barWidth = 15;
    const filled = Math.round((ds.percentage / 100) * barWidth);
    const empty = barWidth - filled;
    const barFn = ds.percentage >= 72 ? c.green : ds.percentage >= 50 ? c.yellow : c.red;
    const bar = barFn('█'.repeat(filled)) + c.grey('░'.repeat(empty));
    console.log(`    ${padded} ${c.bold(`${ds.correct}/${ds.attempted}`)}  ${bar} ${barFn(`${ds.percentage}%`)}`);
  }

  // Weakest domain
  if (result.weakestDomain) {
    console.log('');
    console.log(`  ${c.yellow('⚠️  Weakest Domain:')} ${c.bold(`Domain ${result.weakestDomain.domain}: ${result.weakestDomain.name}`)} (${result.weakestDomain.percentage}%)`);
    console.log(`  ${c.dim('Focus your revision here before the real exam.')}`);
  }

  // Encouragement
  console.log('');
  if (result.passed) {
    if (result.scaledScore >= 900) {
      console.log(`  ${c.correct('🏆 Outstanding! You\'re more than ready for the CCA-F exam.')}`);
    } else if (result.scaledScore >= 800) {
      console.log(`  ${c.green('🌟 Great job! You\'re well prepared. Keep practising weak areas.')}`);
    } else {
      console.log(`  ${c.green('✅ You passed! Strengthen weak domains for a more confident result.')}`);
    }
  } else {
    if (result.scaledScore >= 600) {
      console.log(`  ${c.yellow('📚 Almost there! Focus on your weak domains and try again.')}`);
    } else {
      console.log(`  ${c.red('💪 Keep studying! Review each domain systematically and retake.')}`);
    }
  }
  console.log('');
}

// ── Save Results ───────────────────────────────────────────────

function saveExamResult(result: ExamResult): string | null {
  try {
    const examDir = join(homedir(), '.architect-ai', 'exams');
    if (!existsSync(examDir)) {
      mkdirSync(examDir, { recursive: true });
    }

    const timestamp = result.timestamp.replace(/[:.]/g, '-');
    const filePath = join(examDir, `${timestamp}.json`);
    writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
    return filePath;
  } catch {
    return null;
  }
}

// ── CLI Argument Parsing ───────────────────────────────────────

export function parseExamArgs(argv: string[]): ExamOptions {
  const args = argv.slice(2);
  const opts: ExamOptions = {};

  // If invoked via `index.ts exam ...`, skip the "exam" command word
  const startIdx = args[0]?.toLowerCase() === 'exam' ? 1 : 0;

  for (let i = startIdx; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--no-timer') {
      opts.noTimer = true;
    } else if (arg === '--questions' || arg === '-q') {
      if (i + 1 < args.length) {
        const n = parseInt(args[i + 1], 10);
        if (!isNaN(n) && n > 0) {
          opts.questionCount = n;
        }
        i++;
      }
    }
  }

  return opts;
}

// ── Main Exam Runner ───────────────────────────────────────────

export async function runExam(opts: ExamOptions = {}): Promise<void> {
  const answers: ExamAnswerRecord[] = [];
  const totalCount = opts.questionCount ?? 60;
  const useTimer = !opts.noTimer;
  const timeLimitMinutes = EXAM_TIME_MINUTES;
  const startTime = Date.now();
  let remainingSeconds = timeLimitMinutes * 60;
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let timedOut = false;
  let examQuestions: Question[] = [];

  // Graceful Ctrl+C handler — show partial results
  const sigHandler = () => {
    if (timerInterval) clearInterval(timerInterval);
    console.log('\n');
    console.log(c.yellow('  ⚠️  Exam interrupted by user.'));

    if (answers.length > 0) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const result = calculateExamResult(answers, examQuestions.length, timeLimitMinutes, elapsed);
      displayExamResults(result);

      const savedPath = saveExamResult(result);
      if (savedPath) {
        console.log(c.dim(`  Results saved: ${savedPath}`));
      }
    } else {
      console.log(c.dim('  No questions answered. Exam cancelled.'));
    }
    console.log('');
    process.exit(0);
  };
  process.on('SIGINT', sigHandler);

  try {
    banner();
    console.log(c.cyan('  ╔══════════════════════════════════════════════════════════════╗'));
    console.log(c.cyan('  ║') + '  📝 ' + c.bold('CCA-F MOCK EXAM') + '                                          ' + c.cyan('║'));
    console.log(c.cyan('  ╚══════════════════════════════════════════════════════════════╝'));
    console.log('');

    // Load questions
    let allQuestions: Question[];
    try {
      allQuestions = await loadQuestions();
    } catch (error) {
      console.error(`\n  Failed to load questions: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      process.exit(1);
    }

    if (allQuestions.length === 0) {
      console.error('\n  No questions available. Check src/content/questions/\n');
      process.exit(1);
    }

    // Select weighted questions
    examQuestions = selectWeightedQuestions(allQuestions, totalCount);

    // Show exam info
    console.log(`  ${c.bold('Questions:')} ${examQuestions.length}`);
    if (useTimer) {
      console.log(`  ${c.bold('Time Limit:')} ${timeLimitMinutes} minutes`);
    } else {
      console.log(`  ${c.bold('Mode:')} ${c.green('Practice (no timer)')}`);
    }
    console.log(`  ${c.bold('Pass Score:')} 720/1000 (72%)`);
    console.log('');

    // Domain distribution
    const domainCounts = new Map<number, number>();
    for (const q of examQuestions) {
      domainCounts.set(q.domain, (domainCounts.get(q.domain) || 0) + 1);
    }
    console.log(`  ${c.dim('Domain distribution:')}`);
    for (let d = 1; d <= 5; d++) {
      const count = domainCounts.get(d) || 0;
      const name = DOMAIN_NAMES[d] ?? 'Unknown';
      console.log(`    ${c.dim(`D${d} ${name}:`)} ${count} questions`);
    }
    console.log('');
    console.log(`  ${c.dim('Answer A/B/C/D for each question. No explanations until the end.')}`);
    console.log(`  ${c.dim('Press Ctrl+C to end early and see partial results.')}`);
    console.log(`  ${divider()}`);

    // Start timer
    if (useTimer) {
      timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        remainingSeconds = Math.max(0, timeLimitMinutes * 60 - elapsed);
        if (remainingSeconds <= 0) {
          timedOut = true;
          if (timerInterval) clearInterval(timerInterval);
        }
      }, 1000);
    }

    // Run exam questions
    const { ask, close } = createExamPrompt();

    try {
      for (let i = 0; i < examQuestions.length; i++) {
        // Check timeout
        if (timedOut) {
          console.log('');
          console.log(c.red('  ⏰ TIME\'S UP! The exam has ended.'));
          break;
        }

        const q = examQuestions[i];
        const currentRemaining = useTimer
          ? Math.max(0, timeLimitMinutes * 60 - Math.floor((Date.now() - startTime) / 1000))
          : null;
        presentExamQuestion(q, i, examQuestions.length, currentRemaining);

        // Get valid answer
        let answer = '';
        while (!['A', 'B', 'C', 'D'].includes(answer)) {
          if (timedOut) break;
          const raw = await ask(`  ${c.bold('Your answer (A/B/C/D):')} `);
          if (timedOut) break;
          answer = raw.toUpperCase();
          if (!['A', 'B', 'C', 'D'].includes(answer)) {
            console.log(c.dim('  Please enter A, B, C, or D.'));
          }
        }

        if (timedOut && !['A', 'B', 'C', 'D'].includes(answer)) {
          console.log('');
          console.log(c.red('  ⏰ TIME\'S UP! The exam has ended.'));
          break;
        }

        const correct = answer === q.correctAnswer;
        answers.push({
          questionId: q.id,
          domain: q.domain,
          userAnswer: sanitiseInput(answer),
          correctAnswer: q.correctAnswer,
          correct,
        });

        // Brief indicator only — no explanations during exam
        if (correct) {
          console.log(`  ${c.correct('✓')}`);
        } else {
          console.log(`  ${c.incorrect('✗')}`);
        }
      }
    } finally {
      close();
    }

    // Stop timer
    if (timerInterval) clearInterval(timerInterval);

    // Calculate and display results
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const result = calculateExamResult(answers, examQuestions.length, timeLimitMinutes, elapsed);
    displayExamResults(result);

    // Save results
    const savedPath = saveExamResult(result);
    if (savedPath) {
      console.log(`  ${c.dim('Results saved:')} ${c.dim(savedPath)}`);
      console.log('');
    }

  } finally {
    if (timerInterval) clearInterval(timerInterval);
    process.removeListener('SIGINT', sigHandler);
  }
}

// ── Direct Invocation ──────────────────────────────────────────

// Allow running directly: npx tsx src/cli/exam.ts [--no-timer] [--questions N]
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('cli/exam.ts')
  || process.argv[1]?.replace(/\\/g, '/').endsWith('cli/exam');

if (isDirectRun) {
  const opts = parseExamArgs(process.argv);
  runExam(opts).catch(err => {
    console.error(c.red(`\n  Error: ${err.message}\n`));
    process.exit(1);
  });
}
