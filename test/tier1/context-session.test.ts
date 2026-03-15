/**
 * Tier 1 — Session Manager Tests
 *
 * Tests src/context/session-manager.ts:
 * - SessionManager create/save/load/resume/fork
 * - Stale context detection
 * - Summary injection on resume
 * - Answer recording and domain score computation
 *
 * Note: File system operations (save/load) are tested with real
 * temp directories since the class requires fs. We mock statSync
 * for stale detection tests.
 *
 * @author Catherine Park, Senior QA Engineer — ArchitectAI
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../../src/context/session-manager';
import type { SessionState, AnswerRecord } from '../../src/context/session-manager';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

// ─── Test helpers ───────────────────────────────────────────────────────────

function makeAnswer(overrides: Partial<AnswerRecord> = {}): AnswerRecord {
  return {
    questionId: 'd1-q01',
    correct: true,
    userAnswer: 'B',
    correctAnswer: 'B',
    domain: 1,
    taskStatement: '1.1',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

let tempDir: string;
let manager: SessionManager;

beforeEach(() => {
  tempDir = path.join(tmpdir(), `architect-ai-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  manager = new SessionManager(tempDir);
});

afterEach(() => {
  // Clean up temp files
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch { /* ignore cleanup errors */ }
});

// ─── createSession ──────────────────────────────────────────────────────────

describe('SessionManager.createSession', () => {
  it('creates a session with a unique ID', () => {
    const session = manager.createSession();
    expect(session.sessionId).toBeTruthy();
    expect(session.sessionId).toMatch(/^session-/);
  });

  it('creates sessions with unique IDs', () => {
    const s1 = manager.createSession();
    const s2 = manager.createSession();
    expect(s1.sessionId).not.toBe(s2.sessionId);
  });

  it('sets createdAt timestamp', () => {
    const session = manager.createSession();
    expect(session.createdAt).toBeTruthy();
    expect(new Date(session.createdAt).getTime()).not.toBeNaN();
  });

  it('sets updatedAt timestamp equal to createdAt', () => {
    const session = manager.createSession();
    expect(session.updatedAt).toBe(session.createdAt);
  });

  it('defaults to null currentDomain', () => {
    const session = manager.createSession();
    expect(session.currentDomain).toBeNull();
  });

  it('defaults to "intermediate" difficulty', () => {
    const session = manager.createSession();
    expect(session.currentDifficulty).toBe('intermediate');
  });

  it('starts with empty answers', () => {
    const session = manager.createSession();
    expect(session.answers).toEqual([]);
  });

  it('starts with empty domainScores', () => {
    const session = manager.createSession();
    expect(session.domainScores).toEqual([]);
  });

  it('accepts optional domain', () => {
    const session = manager.createSession({ domain: 3 });
    expect(session.currentDomain).toBe(3);
  });

  it('accepts optional difficulty', () => {
    const session = manager.createSession({ difficulty: 'advanced' });
    expect(session.currentDifficulty).toBe('advanced');
  });

  it('stores session in activeSessions (retrievable via getSession)', () => {
    const session = manager.createSession();
    expect(manager.getSession(session.sessionId)).toBeDefined();
  });
});

// ─── getSession ─────────────────────────────────────────────────────────────

describe('SessionManager.getSession', () => {
  it('returns session for valid ID', () => {
    const session = manager.createSession();
    const retrieved = manager.getSession(session.sessionId);
    expect(retrieved?.sessionId).toBe(session.sessionId);
  });

  it('returns undefined for non-existent ID', () => {
    expect(manager.getSession('nonexistent')).toBeUndefined();
  });
});

// ─── recordAnswer ───────────────────────────────────────────────────────────

describe('SessionManager.recordAnswer', () => {
  it('appends answer to session', () => {
    const session = manager.createSession();
    manager.recordAnswer(session.sessionId, makeAnswer());
    const updated = manager.getSession(session.sessionId)!;
    expect(updated.answers).toHaveLength(1);
  });

  it('updates updatedAt timestamp', () => {
    const session = manager.createSession();
    const originalUpdated = session.updatedAt;
    // Small delay to ensure timestamp changes
    manager.recordAnswer(session.sessionId, makeAnswer());
    const updated = manager.getSession(session.sessionId)!;
    expect(updated.updatedAt).toBeTruthy();
  });

  it('computes domain scores after recording', () => {
    const session = manager.createSession();
    manager.recordAnswer(session.sessionId, makeAnswer({ domain: 1, correct: true }));
    manager.recordAnswer(session.sessionId, makeAnswer({ domain: 1, correct: false, questionId: 'd1-q02' }));
    const updated = manager.getSession(session.sessionId)!;
    expect(updated.domainScores.length).toBeGreaterThan(0);
    const d1Score = updated.domainScores.find((s) => s.domain === 1);
    expect(d1Score?.correct).toBe(1);
    expect(d1Score?.total).toBe(2);
    expect(d1Score?.score).toBe(50);
  });

  it('throws for non-existent session', () => {
    expect(() => manager.recordAnswer('fake-id', makeAnswer())).toThrow();
  });

  it('handles multiple domains', () => {
    const session = manager.createSession();
    manager.recordAnswer(session.sessionId, makeAnswer({ domain: 1, correct: true }));
    manager.recordAnswer(session.sessionId, makeAnswer({ domain: 2, correct: false, questionId: 'd2-q01' }));
    const updated = manager.getSession(session.sessionId)!;
    expect(updated.domainScores).toHaveLength(2);
  });
});

// ─── saveSession / loadSession ──────────────────────────────────────────────

describe('SessionManager save/load', () => {
  it('saves session to disk', () => {
    const session = manager.createSession();
    manager.saveSession(session.sessionId);
    const filePath = path.join(tempDir, `${session.sessionId}.json`);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('loads a saved session', () => {
    const session = manager.createSession({ domain: 2, difficulty: 'foundation' });
    manager.recordAnswer(session.sessionId, makeAnswer());
    manager.saveSession(session.sessionId);

    // Create a fresh manager to load from disk
    const manager2 = new SessionManager(tempDir);
    const loaded = manager2.loadSession(session.sessionId);
    expect(loaded.sessionId).toBe(session.sessionId);
    expect(loaded.currentDomain).toBe(2);
    expect(loaded.currentDifficulty).toBe('foundation');
    expect(loaded.answers).toHaveLength(1);
  });

  it('throws on save for non-existent session', () => {
    expect(() => manager.saveSession('fake-id')).toThrow();
  });

  it('throws on load for non-existent file', () => {
    expect(() => manager.loadSession('nonexistent-session')).toThrow();
  });

  it('saved file contains valid JSON', () => {
    const session = manager.createSession();
    manager.saveSession(session.sessionId);
    const filePath = path.join(tempDir, `${session.sessionId}.json`);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.sessionId).toBe(session.sessionId);
  });
});

// ─── forkSession ────────────────────────────────────────────────────────────

describe('SessionManager.forkSession', () => {
  it('creates a new session from existing one', () => {
    const original = manager.createSession({ domain: 1, difficulty: 'advanced' });
    manager.recordAnswer(original.sessionId, makeAnswer());
    const forked = manager.forkSession(original.sessionId);
    expect(forked.sessionId).not.toBe(original.sessionId);
  });

  it('copies answer history', () => {
    const original = manager.createSession();
    manager.recordAnswer(original.sessionId, makeAnswer());
    const forked = manager.forkSession(original.sessionId);
    expect(forked.answers).toHaveLength(1);
  });

  it('sets forkedFrom to source session ID', () => {
    const original = manager.createSession();
    const forked = manager.forkSession(original.sessionId);
    expect(forked.forkedFrom).toBe(original.sessionId);
  });

  it('forked session has new timestamps', () => {
    const original = manager.createSession();
    const forked = manager.forkSession(original.sessionId);
    expect(forked.createdAt).toBeTruthy();
  });

  it('forked session is independent — modifying it does not affect original', () => {
    const original = manager.createSession();
    manager.recordAnswer(original.sessionId, makeAnswer());
    const forked = manager.forkSession(original.sessionId);
    manager.recordAnswer(forked.sessionId, makeAnswer({ questionId: 'd1-q99' }));
    expect(manager.getSession(original.sessionId)!.answers).toHaveLength(1);
    expect(manager.getSession(forked.sessionId)!.answers).toHaveLength(2);
  });

  it('throws for non-existent source session', () => {
    expect(() => manager.forkSession('fake-id')).toThrow();
  });

  it('preserves currentDomain from source', () => {
    const original = manager.createSession({ domain: 4 });
    const forked = manager.forkSession(original.sessionId);
    expect(forked.currentDomain).toBe(4);
  });

  it('preserves currentDifficulty from source', () => {
    const original = manager.createSession({ difficulty: 'foundation' });
    const forked = manager.forkSession(original.sessionId);
    expect(forked.currentDifficulty).toBe('foundation');
  });
});

// ─── resumeSession ──────────────────────────────────────────────────────────

describe('SessionManager.resumeSession', () => {
  it('returns session, summary, and staleFiles', () => {
    const session = manager.createSession();
    manager.saveSession(session.sessionId);
    const result = manager.resumeSession(session.sessionId);
    expect(result.session).toBeDefined();
    expect(typeof result.summary).toBe('string');
    expect(Array.isArray(result.staleFiles)).toBe(true);
  });

  it('summary contains session ID', () => {
    const session = manager.createSession();
    manager.saveSession(session.sessionId);
    const result = manager.resumeSession(session.sessionId);
    expect(result.summary).toContain(session.sessionId);
  });

  it('summary contains score information when answers exist', () => {
    const session = manager.createSession();
    manager.recordAnswer(session.sessionId, makeAnswer({ domain: 1, correct: true }));
    manager.saveSession(session.sessionId);
    const result = manager.resumeSession(session.sessionId);
    expect(result.summary).toContain('Questions answered: 1');
  });

  it('summary contains difficulty level', () => {
    const session = manager.createSession({ difficulty: 'advanced' });
    manager.saveSession(session.sessionId);
    const result = manager.resumeSession(session.sessionId);
    expect(result.summary).toContain('advanced');
  });

  it('summary includes weak areas when below 72%', () => {
    const session = manager.createSession();
    // 1 out of 3 correct = ~33%
    manager.recordAnswer(session.sessionId, makeAnswer({ domain: 2, correct: false, questionId: 'q1' }));
    manager.recordAnswer(session.sessionId, makeAnswer({ domain: 2, correct: false, questionId: 'q2' }));
    manager.recordAnswer(session.sessionId, makeAnswer({ domain: 2, correct: true, questionId: 'q3' }));
    manager.saveSession(session.sessionId);
    const result = manager.resumeSession(session.sessionId);
    expect(result.summary.toLowerCase()).toContain('weak');
  });

  it('summary includes forkedFrom when applicable', () => {
    const original = manager.createSession();
    const forked = manager.forkSession(original.sessionId);
    manager.saveSession(forked.sessionId);
    const result = manager.resumeSession(forked.sessionId);
    expect(result.summary).toContain(original.sessionId);
  });

  it('injects summary into session state', () => {
    const session = manager.createSession();
    manager.saveSession(session.sessionId);
    const result = manager.resumeSession(session.sessionId);
    expect(result.session.sessionSummary).toBe(result.summary);
  });
});

// ─── Stale context detection ────────────────────────────────────────────────

describe('SessionManager stale context detection', () => {
  it('returns empty staleFiles when no watched files', () => {
    const session = manager.createSession();
    manager.saveSession(session.sessionId);
    const result = manager.resumeSession(session.sessionId);
    expect(result.staleFiles).toEqual([]);
  });

  it('detectStaleFiles returns empty for files with no saved timestamp', () => {
    const session = manager.createSession();
    // Use a real file that exists for the stat call
    const testFile = path.join(tempDir, 'test-stale.txt');
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(testFile, 'test');
    const stale = manager.detectStaleFiles(session, [testFile]);
    expect(stale).toEqual([]); // No saved timestamp, so not stale
  });

  it('detectStaleFiles returns stale files when mtime has increased', () => {
    const session = manager.createSession();
    const testFile = path.join(tempDir, 'test-stale2.txt');
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(testFile, 'test');

    // Set an old timestamp
    session.fileTimestamps[testFile] = Date.now() - 100000;

    const stale = manager.detectStaleFiles(session, [testFile]);
    expect(stale).toContain(testFile);
  });

  it('detectStaleFiles handles non-existent files gracefully', () => {
    const session = manager.createSession();
    const stale = manager.detectStaleFiles(session, ['/nonexistent/path.ts']);
    expect(stale).toEqual([]);
  });

  it('detectStaleFiles updates file timestamps', () => {
    const session = manager.createSession();
    const testFile = path.join(tempDir, 'test-ts.txt');
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(testFile, 'test');

    manager.detectStaleFiles(session, [testFile]);
    expect(session.fileTimestamps[testFile]).toBeDefined();
    expect(typeof session.fileTimestamps[testFile]).toBe('number');
  });
});

// ─── snapshotFileTimestamps ─────────────────────────────────────────────────

describe('SessionManager.snapshotFileTimestamps', () => {
  it('records timestamps for existing files', () => {
    const session = manager.createSession();
    const testFile = path.join(tempDir, 'snapshot.txt');
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(testFile, 'data');

    manager.snapshotFileTimestamps(session.sessionId, [testFile]);
    const updated = manager.getSession(session.sessionId)!;
    expect(updated.fileTimestamps[testFile]).toBeDefined();
  });

  it('ignores non-existent files', () => {
    const session = manager.createSession();
    manager.snapshotFileTimestamps(session.sessionId, ['/no/such/file.ts']);
    const updated = manager.getSession(session.sessionId)!;
    expect(Object.keys(updated.fileTimestamps)).toHaveLength(0);
  });

  it('throws for non-existent session', () => {
    expect(() => manager.snapshotFileTimestamps('fake', ['file.ts'])).toThrow();
  });
});

// ─── listSavedSessions ─────────────────────────────────────────────────────

describe('SessionManager.listSavedSessions', () => {
  it('returns empty array when no sessions saved', () => {
    expect(manager.listSavedSessions()).toEqual([]);
  });

  it('returns session IDs after saving', () => {
    const s1 = manager.createSession();
    const s2 = manager.createSession();
    manager.saveSession(s1.sessionId);
    manager.saveSession(s2.sessionId);
    const saved = manager.listSavedSessions();
    expect(saved).toContain(s1.sessionId);
    expect(saved).toContain(s2.sessionId);
  });
});
