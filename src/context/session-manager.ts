/**
 * @module context/session-manager
 * @description Session state management for ArchitectAI study sessions.
 *
 * @exam Domain 1.7 — Session State
 * @exam Domain 5.1 — Optimise Context Windows
 *
 * CRITICAL EXAM CONCEPTS:
 *
 * (1.7) Session state must persist across interactions so the agent can
 * resume, fork, or summarise prior work. Without session state, every
 * conversation starts from scratch — the agent has no memory.
 *
 * (5.1) Context window management: when resuming a session, we inject
 * a summary of prior state rather than replaying the entire history.
 * This keeps context usage efficient and avoids hitting token limits.
 *
 * STALE CONTEXT DETECTION: If source files have changed since the last
 * session, the agent's cached knowledge may be outdated. We detect this
 * by comparing file modification timestamps and warn the user.
 *
 * @author Diego Morales, Context Systems Engineer — ArchitectAI
 */

import { readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { mkdirSync } from "fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single answer record in the session history.
 */
export interface AnswerRecord {
  /** The question ID that was answered. */
  questionId: string;
  /** Whether the answer was correct. */
  correct: boolean;
  /** The user's selected answer. */
  userAnswer: string;
  /** The correct answer. */
  correctAnswer: string;
  /** Domain number for this question. */
  domain: number;
  /** Task statement for this question. */
  taskStatement: string;
  /** User's self-reported confidence (0–1). */
  confidence?: number;
  /** ISO 8601 timestamp of when the answer was recorded. */
  timestamp: string;
}

/**
 * Per-domain score snapshot.
 */
export interface DomainScore {
  domain: number;
  correct: number;
  total: number;
  /** Percentage score (0–100). */
  score: number;
}

/**
 * The complete session state that gets persisted to disk.
 *
 * @exam Domain 1.7 — This is the serialisable session state. It contains
 * everything the agent needs to resume a study session: current focus,
 * answer history, scores, and file timestamps for stale context detection.
 */
export interface SessionState {
  /** Unique session identifier. */
  sessionId: string;
  /** ISO 8601 timestamp of session creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
  /** The domain currently being studied (null if no focus). */
  currentDomain: number | null;
  /** The current difficulty level. */
  currentDifficulty: "foundation" | "intermediate" | "advanced";
  /** All answers recorded in this session. */
  answers: AnswerRecord[];
  /** Per-domain score snapshots. */
  domainScores: DomainScore[];
  /**
   * File modification timestamps from the last session.
   * Used for stale context detection.
   *
   * @exam Domain 5.1 — If files have changed since the last session,
   * cached explanations or references may be outdated.
   */
  fileTimestamps: Record<string, number>;
  /** Optional summary of the session so far (for context injection on resume). */
  sessionSummary?: string;
  /** Parent session ID if this was forked from another session. */
  forkedFrom?: string;
}

// ---------------------------------------------------------------------------
// SessionManager
// ---------------------------------------------------------------------------

/**
 * Manages study session state: save, load, resume, fork, and stale detection.
 *
 * @exam Domain 1.7 — Session State: Save/load from local JSON file.
 * @exam Domain 5.1 — Context Windows: Summary injection on resume,
 * stale context detection when files change.
 *
 * @example
 * ```ts
 * const manager = new SessionManager("./sessions");
 *
 * // Start a new session
 * const session = manager.createSession();
 *
 * // Record an answer
 * manager.recordAnswer(session.sessionId, {
 *   questionId: "d1-q01",
 *   correct: true,
 *   userAnswer: "B",
 *   correctAnswer: "B",
 *   domain: 1,
 *   taskStatement: "1.1",
 *   timestamp: new Date().toISOString(),
 * });
 *
 * // Save to disk
 * manager.saveSession(session.sessionId);
 *
 * // Resume later
 * const resumed = manager.resumeSession(session.sessionId);
 * ```
 */
export class SessionManager {
  private readonly sessionsDir: string;
  private readonly activeSessions: Map<string, SessionState> = new Map();

  /**
   * @param sessionsDir - Directory where session JSON files are stored.
   */
  constructor(sessionsDir: string) {
    this.sessionsDir = sessionsDir;
  }

  // -------------------------------------------------------------------------
  // Session lifecycle
  // -------------------------------------------------------------------------

  /**
   * Create a new study session.
   *
   * @param options - Optional initial configuration.
   * @returns The newly created session state.
   */
  createSession(
    options: {
      domain?: number;
      difficulty?: "foundation" | "intermediate" | "advanced";
    } = {},
  ): SessionState {
    const sessionId = generateSessionId();
    const now = new Date().toISOString();

    const session: SessionState = {
      sessionId,
      createdAt: now,
      updatedAt: now,
      currentDomain: options.domain ?? null,
      currentDifficulty: options.difficulty ?? "intermediate",
      answers: [],
      domainScores: [],
      fileTimestamps: {},
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Get an active session by ID.
   *
   * @param sessionId - The session to retrieve.
   * @returns The session state, or undefined if not found.
   */
  getSession(sessionId: string): SessionState | undefined {
    return this.activeSessions.get(sessionId);
  }

  // -------------------------------------------------------------------------
  // Persistence: Save / Load
  // -------------------------------------------------------------------------

  /**
   * Save a session to disk as a JSON file.
   *
   * @exam Domain 1.7 — Persistence ensures the agent can resume sessions
   * across process restarts. The JSON format is human-readable and easy
   * to debug.
   *
   * @param sessionId - The session to save.
   * @throws If the session does not exist.
   */
  saveSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.updatedAt = new Date().toISOString();

    // Recompute domain scores before saving
    session.domainScores = this.computeDomainScores(session);

    // Ensure directory exists
    ensureDirectoryExists(this.sessionsDir);

    const filePath = this.getSessionFilePath(sessionId);
    writeFileSync(filePath, JSON.stringify(session, null, 2), "utf-8");
  }

  /**
   * Load a session from disk.
   *
   * @exam Domain 1.7 — Load previously saved state to enable session resumption.
   *
   * @param sessionId - The session to load.
   * @returns The loaded session state.
   * @throws If the session file does not exist or is malformed.
   */
  loadSession(sessionId: string): SessionState {
    const filePath = this.getSessionFilePath(sessionId);

    if (!existsSync(filePath)) {
      throw new Error(`Session file not found: ${filePath}`);
    }

    const raw = readFileSync(filePath, "utf-8");
    const session = JSON.parse(raw) as SessionState;

    this.activeSessions.set(sessionId, session);
    return session;
  }

  // -------------------------------------------------------------------------
  // Resume with summary injection
  // -------------------------------------------------------------------------

  /**
   * Resume a session with summary injection for context efficiency.
   *
   * Instead of replaying the full conversation history (which wastes context
   * tokens), we inject a concise summary of the session state. This gives
   * the model enough context to continue without consuming excessive tokens.
   *
   * @exam Domain 5.1 — Summary injection is the key technique for resuming
   * sessions without blowing the context window. The summary captures:
   *   - What was studied
   *   - Current scores
   *   - Weak areas to focus on
   *   - Any stale context warnings
   *
   * @param sessionId - The session to resume.
   * @param watchedFiles - Optional list of source files to check for staleness.
   * @returns The session state plus a summary string for context injection.
   */
  resumeSession(
    sessionId: string,
    watchedFiles?: string[],
  ): { session: SessionState; summary: string; staleFiles: string[] } {
    const session = this.loadSession(sessionId);
    const staleFiles = watchedFiles
      ? this.detectStaleFiles(session, watchedFiles)
      : [];

    const summary = this.generateResumeSummary(session, staleFiles);
    session.sessionSummary = summary;

    return { session, summary, staleFiles };
  }

  // -------------------------------------------------------------------------
  // Fork session
  // -------------------------------------------------------------------------

  /**
   * Fork a session — create a new session that starts with the state
   * of an existing one.
   *
   * @exam Domain 1.7 — Forking lets a student branch off to explore
   * a different study path without losing their original session state.
   *
   * @param sourceSessionId - The session to fork from.
   * @returns The newly forked session state.
   */
  forkSession(sourceSessionId: string): SessionState {
    const source = this.activeSessions.get(sourceSessionId);
    if (!source) {
      throw new Error(`Source session not found: ${sourceSessionId}`);
    }

    const forkedId = generateSessionId();
    const now = new Date().toISOString();

    const forked: SessionState = {
      ...structuredClone(source),
      sessionId: forkedId,
      createdAt: now,
      updatedAt: now,
      forkedFrom: sourceSessionId,
    };

    this.activeSessions.set(forkedId, forked);
    return forked;
  }

  // -------------------------------------------------------------------------
  // Answer recording
  // -------------------------------------------------------------------------

  /**
   * Record an answer in the session.
   *
   * @param sessionId - The session to record in.
   * @param answer - The answer record to add.
   */
  recordAnswer(sessionId: string, answer: AnswerRecord): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.answers.push(answer);
    session.updatedAt = new Date().toISOString();

    // Recompute scores
    session.domainScores = this.computeDomainScores(session);
  }

  // -------------------------------------------------------------------------
  // Stale context detection
  // -------------------------------------------------------------------------

  /**
   * Detect files that have changed since the last session save.
   *
   * @exam Domain 5.1 — Stale context detection: if source files have been
   * modified since the session was last saved, the agent's cached knowledge
   * (explanations, references) may reference outdated code. We warn the
   * user so they can refresh their understanding.
   *
   * @param session - The session with recorded file timestamps.
   * @param filePaths - Paths to check for modifications.
   * @returns An array of file paths that have been modified since the last session.
   */
  detectStaleFiles(session: SessionState, filePaths: string[]): string[] {
    const staleFiles: string[] = [];

    for (const filePath of filePaths) {
      try {
        const stats = statSync(filePath);
        const currentMtime = stats.mtimeMs;
        const savedMtime = session.fileTimestamps[filePath];

        if (savedMtime !== undefined && currentMtime > savedMtime) {
          staleFiles.push(filePath);
        }

        // Update the timestamp for next time
        session.fileTimestamps[filePath] = currentMtime;
      } catch {
        // File doesn't exist or can't be stat'd — skip it
      }
    }

    return staleFiles;
  }

  /**
   * Snapshot current file timestamps for stale detection in future sessions.
   *
   * @param sessionId - The session to update.
   * @param filePaths - Paths to snapshot.
   */
  snapshotFileTimestamps(sessionId: string, filePaths: string[]): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    for (const filePath of filePaths) {
      try {
        const stats = statSync(filePath);
        session.fileTimestamps[filePath] = stats.mtimeMs;
      } catch {
        // File doesn't exist — skip
      }
    }
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Compute per-domain scores from answer history.
   */
  private computeDomainScores(session: SessionState): DomainScore[] {
    const domainMap = new Map<number, { correct: number; total: number }>();

    for (const answer of session.answers) {
      const existing = domainMap.get(answer.domain) ?? { correct: 0, total: 0 };
      existing.total += 1;
      if (answer.correct) existing.correct += 1;
      domainMap.set(answer.domain, existing);
    }

    const scores: DomainScore[] = [];
    for (const [domain, data] of domainMap) {
      scores.push({
        domain,
        correct: data.correct,
        total: data.total,
        score: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      });
    }

    // Sort by domain number
    scores.sort((a, b) => a.domain - b.domain);
    return scores;
  }

  /**
   * Generate a concise resume summary for context injection.
   *
   * @exam Domain 5.1 — The summary is designed to be injected at the start
   * of a resumed conversation, giving the model all necessary context in
   * a compact form. This is far more efficient than replaying full history.
   */
  private generateResumeSummary(
    session: SessionState,
    staleFiles: string[],
  ): string {
    const scores = session.domainScores;
    const totalAnswered = session.answers.length;
    const totalCorrect = session.answers.filter((a) => a.correct).length;
    const overallScore =
      totalAnswered > 0
        ? Math.round((totalCorrect / totalAnswered) * 100)
        : 0;

    const lines: string[] = [
      `[Session Resumed: ${session.sessionId}]`,
      `Created: ${session.createdAt}`,
      `Questions answered: ${totalAnswered}`,
      `Overall accuracy: ${overallScore}%`,
    ];

    if (session.currentDomain !== null) {
      lines.push(`Current focus: Domain ${session.currentDomain}`);
    }

    lines.push(`Difficulty: ${session.currentDifficulty}`);

    if (scores.length > 0) {
      lines.push("", "Per-domain scores:");
      for (const s of scores) {
        const status = s.score >= 72 ? "✅" : "❌";
        lines.push(
          `  Domain ${s.domain}: ${s.score}% (${s.correct}/${s.total}) ${status}`,
        );
      }

      const weakDomains = scores.filter((s) => s.score < 72);
      if (weakDomains.length > 0) {
        lines.push(
          "",
          "Weak areas (below 72%): " +
            weakDomains.map((s) => `Domain ${s.domain} (${s.score}%)`).join(", "),
        );
      }
    }

    if (staleFiles.length > 0) {
      lines.push(
        "",
        "⚠️ STALE CONTEXT WARNING: The following files have changed since your last session:",
        ...staleFiles.map((f) => `  - ${f}`),
        "Explanations referencing these files may be outdated. Consider refreshing.",
      );
    }

    if (session.forkedFrom) {
      lines.push("", `Forked from session: ${session.forkedFrom}`);
    }

    return lines.join("\n");
  }

  /**
   * Get the file path for a session's JSON file.
   */
  private getSessionFilePath(sessionId: string): string {
    return join(this.sessionsDir, `${sessionId}.json`);
  }

  /**
   * List all saved session IDs by scanning the sessions directory.
   */
  listSavedSessions(): string[] {
    if (!existsSync(this.sessionsDir)) return [];

    // Use readdirSync to list JSON files
    const { readdirSync } = require("fs") as typeof import("fs");
    const files = readdirSync(this.sessionsDir) as string[];
    return files
      .filter((f: string) => f.endsWith(".json"))
      .map((f: string) => f.replace(".json", ""));
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Generate a unique session ID.
 *
 * Format: session-{timestamp}-{random}
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `session-${timestamp}-${random}`;
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
function ensureDirectoryExists(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}
