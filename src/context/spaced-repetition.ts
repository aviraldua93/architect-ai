/**
 * @module context/spaced-repetition
 * @description SM-2 Spaced Repetition System for architect-ai.
 *
 * Implements the SuperMemo 2 algorithm to schedule question reviews.
 * Cards track per-question ease, interval, and next review date.
 *
 * Persists state to ~/.architect-ai/srs.json.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SRSCard {
  questionId: string;
  /** Ease factor — starts at 2.5, minimum 1.3 */
  easeFactor: number;
  /** Days until next review */
  interval: number;
  /** ISO 8601 date of next review */
  nextReview: string;
  /** Consecutive correct answers */
  repetitions: number;
}

interface SRSState {
  cards: Record<string, SRSCard>;
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATA_DIR = join(homedir(), '.architect-ai');
const SRS_FILE = join(DATA_DIR, 'srs.json');
const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

// ---------------------------------------------------------------------------
// SpacedRepetitionEngine
// ---------------------------------------------------------------------------

export class SpacedRepetitionEngine {
  private cards: Map<string, SRSCard> = new Map();

  constructor() {
    this.loadState();
  }

  /**
   * Load SRS state from disk. Non-destructive — missing file is fine.
   */
  loadState(): void {
    try {
      if (existsSync(SRS_FILE)) {
        const raw = readFileSync(SRS_FILE, 'utf-8');
        const state: SRSState = JSON.parse(raw);
        this.cards = new Map(Object.entries(state.cards));
      }
    } catch {
      // Corrupt or missing file — start fresh
      this.cards = new Map();
    }
  }

  /**
   * Persist current SRS state to disk.
   */
  saveState(): void {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    const state: SRSState = {
      cards: Object.fromEntries(this.cards),
      lastUpdated: new Date().toISOString(),
    };

    writeFileSync(SRS_FILE, JSON.stringify(state, null, 2), 'utf-8');
  }

  /**
   * Record a review using the SM-2 algorithm.
   *
   * @param questionId - The question that was reviewed.
   * @param quality - Quality of response 0-5 (0 = blackout, 5 = perfect).
   *                  For binary correct/incorrect: correct=4, incorrect=1.
   */
  recordReview(questionId: string, quality: number): void {
    const q = Math.max(0, Math.min(5, Math.round(quality)));

    let card = this.cards.get(questionId);
    if (!card) {
      card = {
        questionId,
        easeFactor: DEFAULT_EASE,
        interval: 0,
        nextReview: new Date().toISOString().split('T')[0],
        repetitions: 0,
      };
    }

    if (q >= 3) {
      // Correct answer
      if (card.repetitions === 0) {
        card.interval = 1;
      } else if (card.repetitions === 1) {
        card.interval = 6;
      } else {
        card.interval = Math.round(card.interval * card.easeFactor);
      }
      card.repetitions += 1;
    } else {
      // Incorrect — reset interval but keep ease factor
      card.repetitions = 0;
      card.interval = 1;
    }

    // Update ease factor: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
    const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
    card.easeFactor = Math.max(MIN_EASE, card.easeFactor + delta);

    // Compute next review date
    const next = new Date();
    next.setDate(next.getDate() + card.interval);
    card.nextReview = next.toISOString().split('T')[0];

    this.cards.set(questionId, card);
  }

  /**
   * Get the question ID most overdue for review from a set of available IDs.
   * Returns undefined if nothing is due.
   *
   * @param availableIds - Question IDs to consider (from filtered pool).
   */
  getNextQuestion(availableIds: string[]): string | undefined {
    const today = new Date().toISOString().split('T')[0];
    const idSet = new Set(availableIds);

    // First: questions never seen (not in SRS) — highest priority
    const unseen = availableIds.filter(id => !this.cards.has(id));
    if (unseen.length > 0) {
      return unseen[Math.floor(Math.random() * unseen.length)];
    }

    // Second: due/overdue cards sorted by how overdue they are
    const dueCards = [...this.cards.values()]
      .filter(card => idSet.has(card.questionId) && card.nextReview <= today)
      .sort((a, b) => a.nextReview.localeCompare(b.nextReview)); // most overdue first

    return dueCards.length > 0 ? dueCards[0].questionId : undefined;
  }

  /**
   * Count how many cards are due for review today.
   *
   * @param availableIds - Optional filter to only count from these IDs.
   */
  getDueCount(availableIds?: string[]): number {
    const today = new Date().toISOString().split('T')[0];

    if (availableIds) {
      const idSet = new Set(availableIds);
      const seenDue = [...this.cards.values()]
        .filter(card => idSet.has(card.questionId) && card.nextReview <= today)
        .length;
      const unseen = availableIds.filter(id => !this.cards.has(id)).length;
      return seenDue + unseen;
    }

    return [...this.cards.values()]
      .filter(card => card.nextReview <= today)
      .length;
  }

  /**
   * Get the SRS card for a specific question (if it exists).
   */
  getCard(questionId: string): SRSCard | undefined {
    return this.cards.get(questionId);
  }

  /**
   * Get all cards (for dashboard/stats).
   */
  getAllCards(): SRSCard[] {
    return [...this.cards.values()];
  }
}
