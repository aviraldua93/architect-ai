/**
 * @module session-state
 * @description Agent-layer session state management — resume, fork, and
 * handle stale context across agentic sessions.
 *
 * @exam Domain 1.7 — Session State Management
 *
 * THIS IS THE AGENTS LAYER that wraps Diego's context/session-manager.ts.
 * Diego's SessionManager handles study-session persistence (answers, scores,
 * file timestamps). This module provides the AGENTIC session state layer:
 * conversation history, metadata, forking for hypothesis exploration, and
 * resumption strategies.
 *
 * THREE RESUMPTION STRATEGIES (THE EXAM TESTS ALL THREE):
 *
 * ❶ FULL RESUME:
 *   Replay the entire conversation history. Fast to implement but risks
 *   stale context — if hours have passed, the environment may have changed
 *   and the cached history references outdated state.
 *
 *   Best for: Short gaps, stable environments.
 *   Risk: Stale context leads to incorrect assumptions.
 *
 * ❷ FRESH START (summary injection):
 *   Start a new session but inject a structured summary of the old one.
 *   Safe from stale context but loses conversational nuance — the model
 *   doesn't have the back-and-forth that led to decisions.
 *
 *   Best for: Long gaps, changed environments, context window pressure.
 *   Risk: Loses the "why" behind prior decisions.
 *
 * ❸ FORK SESSION:
 *   Create a new session that branches from a point in the original.
 *   The fork inherits parent context up to the branch point and then
 *   diverges. This lets agents explore hypotheses without corrupting
 *   the main session.
 *
 *   Best for: A/B testing approaches, hypothesis exploration, rollback points.
 *   Risk: Proliferation of sessions if not managed carefully.
 *
 * @author Ravi Krishnan, CLI & Platform Engineer — ArchitectAI
 */

import type { MessageParam } from "./types";
import {
  SessionManager as ContextSessionManager,
  type SessionState as ContextSessionState,
} from "../context/session-manager";

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/**
 * The three resumption strategies.
 *
 * @exam Domain 1.7 — The exam expects you to know all three and their tradeoffs:
 *   - 'full_resume': Replay full history. Fast but risks stale context.
 *   - 'fresh_start': Summary injection. Safe but loses nuance.
 *   - 'fork_session': Branch from a point. Explores alternatives safely.
 */
export type ResumptionStrategy = "full_resume" | "fresh_start" | "fork_session";

/**
 * Indicators that suggest context may be stale.
 *
 * @exam Domain 1.7 — Stale context detection is critical for reliable
 * resumption. If any of these indicators fire, full_resume is risky
 * and fresh_start or fork_session should be preferred.
 */
export type StaleContextIndicator =
  | "time_elapsed"
  | "external_changes"
  | "context_drift"
  | "dependency_updated";

/**
 * The agentic session state — distinct from Diego's study-session state.
 *
 * This captures the agent's conversation history, metadata, and lineage
 * (parent session for forks). It's designed for the agentic loop's needs:
 * resumption, forking, and context management.
 */
export interface AgentSessionState {
  /** Unique session identifier. */
  sessionId: string;
  /**
   * Full conversation history for this session.
   * Used for full_resume strategy — replayed verbatim.
   *
   * @exam Domain 1.7 — Conversation history is the agent's memory.
   * Without it, every interaction starts from scratch. But keeping
   * it all can lead to stale context and context window exhaustion.
   */
  conversationHistory: MessageParam[];
  /** Arbitrary metadata attached to this session. */
  metadata: Record<string, unknown>;
  /** ISO 8601 timestamp of session creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last activity. */
  lastActiveAt: string;
  /**
   * Parent session ID (present only for forked sessions).
   *
   * @exam Domain 1.7 — Fork sessions maintain a reference to their parent.
   * This enables lineage tracking: you can trace a fork back to its origin
   * and understand the decision that led to the divergence.
   */
  parentSessionId?: string;
  /** Human-readable reason for forking (if this is a forked session). */
  forkReason?: string;
  /** Structured summary for fresh_start resumption. */
  summary?: string;
  /** Linked context session ID (from Diego's context layer, if applicable). */
  contextSessionId?: string;
}

/**
 * Result of stale context detection.
 */
export interface StaleContextReport {
  /** Whether any staleness indicators were detected. */
  isStale: boolean;
  /** Which indicators were triggered. */
  indicators: StaleContextIndicator[];
  /** Human-readable explanation of each triggered indicator. */
  details: string[];
  /** Recommended resumption strategy based on staleness level. */
  recommendedStrategy: ResumptionStrategy;
}

/**
 * Context built for a specific resumption strategy.
 */
export interface ResumptionContext {
  /** Which strategy was used to build this context. */
  strategy: ResumptionStrategy;
  /**
   * Messages to inject at the start of the resumed conversation.
   * For full_resume: the complete history.
   * For fresh_start: a single user message with the summary.
   * For fork_session: parent history up to fork point + branch context.
   */
  messages: MessageParam[];
  /**
   * System prompt supplement to inject (e.g., stale context warnings,
   * fork context, summary metadata).
   */
  systemPromptSupplement: string;
  /** Metadata about the resumption. */
  metadata: {
    originalSessionId: string;
    historyLength: number;
    strategy: ResumptionStrategy;
    staleContextDetected: boolean;
  };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Configuration for the AgentSessionManager.
 */
export interface AgentSessionManagerConfig {
  /**
   * Time in milliseconds after which a session is considered stale.
   * @default 3600000 (1 hour)
   */
  staleTimeThresholdMs?: number;
  /**
   * Maximum conversation history length before recommending fresh_start.
   * @default 100
   */
  maxHistoryLength?: number;
  /**
   * Optional path for the underlying context session manager.
   * If provided, wraps Diego's SessionManager for study-session features.
   */
  contextSessionsDir?: string;
}

// ---------------------------------------------------------------------------
// AgentSessionManager
// ---------------------------------------------------------------------------

/**
 * Agent-layer session manager that provides resumption, forking, and
 * stale context detection for agentic workflows.
 *
 * This wraps Diego's context/session-manager.ts for study-session features
 * and adds the agentic layer: conversation history management, resumption
 * strategies, and fork lineage.
 *
 * @exam Domain 1.7 — Session State Management
 *
 * @example
 * ```ts
 * const manager = new AgentSessionManager();
 *
 * // Create a session
 * const session = manager.createSession({ role: "researcher" });
 *
 * // Add conversation history as the agent works
 * manager.appendMessage(session.sessionId, { role: "user", content: "Find X" });
 * manager.appendMessage(session.sessionId, { role: "assistant", content: "Found X: ..." });
 *
 * // Save the session
 * manager.save(session);
 *
 * // Later: detect staleness and resume
 * const report = manager.detectStaleContext(session);
 * const ctx = manager.buildResumptionContext(session, report.recommendedStrategy);
 * ```
 */
export class AgentSessionManager {
  private sessions: Map<string, AgentSessionState> = new Map();
  private config: Required<AgentSessionManagerConfig>;

  /**
   * Optional reference to Diego's context-layer SessionManager.
   * Used to link agentic sessions with study sessions when applicable.
   */
  private contextManager?: ContextSessionManager;

  constructor(config: AgentSessionManagerConfig = {}) {
    this.config = {
      staleTimeThresholdMs: config.staleTimeThresholdMs ?? 3_600_000,
      maxHistoryLength: config.maxHistoryLength ?? 100,
      contextSessionsDir: config.contextSessionsDir ?? "",
    };

    // If a context sessions directory is provided, initialise Diego's manager.
    if (this.config.contextSessionsDir) {
      this.contextManager = new ContextSessionManager(
        this.config.contextSessionsDir,
      );
    }
  }

  // -----------------------------------------------------------------------
  // Session lifecycle
  // -----------------------------------------------------------------------

  /**
   * Create a new agentic session.
   *
   * @param metadata - Arbitrary metadata for this session (role, purpose, etc.).
   * @returns The newly created session state.
   */
  createSession(metadata: Record<string, unknown> = {}): AgentSessionState {
    const sessionId = `agent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const session: AgentSessionState = {
      sessionId,
      conversationHistory: [],
      metadata,
      createdAt: now,
      lastActiveAt: now,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Append a message to a session's conversation history.
   */
  appendMessage(sessionId: string, message: MessageParam): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Agent session not found: ${sessionId}`);
    }

    session.conversationHistory.push(message);
    session.lastActiveAt = new Date().toISOString();
  }

  // -----------------------------------------------------------------------
  // Persistence
  // -----------------------------------------------------------------------

  /**
   * Save a session to the in-memory store.
   *
   * For Tier 1 (current scope), sessions are stored in a Map.
   * Future tiers could persist to disk, database, or cloud storage.
   *
   * @exam Domain 1.7 — In-memory storage is simple but volatile.
   * Production systems need durable persistence (disk/DB). The
   * interface is designed to be storage-agnostic — swap the Map
   * for a database and the API stays the same.
   */
  save(state: AgentSessionState): void {
    state.lastActiveAt = new Date().toISOString();
    this.sessions.set(state.sessionId, structuredClone(state));
  }

  /**
   * Retrieve a session by ID.
   */
  getSession(sessionId: string): AgentSessionState | undefined {
    return this.sessions.get(sessionId);
  }

  // -----------------------------------------------------------------------
  // Resumption
  // -----------------------------------------------------------------------

  /**
   * Resume a session with full history replay.
   *
   * @exam Domain 1.7 — Full resume: replay the entire conversation history.
   * Fast and complete but risks stale context if the environment changed.
   *
   * @param sessionId - The session to resume.
   * @returns The session state, or undefined if not found.
   */
  resume(sessionId: string): AgentSessionState | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    session.lastActiveAt = new Date().toISOString();
    return session;
  }

  // -----------------------------------------------------------------------
  // Forking
  // -----------------------------------------------------------------------

  /**
   * Fork a session to create a divergent branch for hypothesis exploration.
   *
   * @exam Domain 1.7 — Fork sessions let agents explore "what if" scenarios:
   *   - "What if we use approach A?" → fork, try it.
   *   - "What if we use approach B?" → fork from same point, try it.
   *   - Compare results without corrupting the original session.
   *
   * The fork copies the parent's full history and metadata at the point
   * of forking. From there, the fork diverges independently.
   *
   * @param sessionId - The parent session to fork from.
   * @param reason - Why this fork was created (for lineage tracking).
   * @returns The new forked session.
   */
  fork(sessionId: string, reason: string): AgentSessionState {
    const parent = this.sessions.get(sessionId);
    if (!parent) {
      throw new Error(`Cannot fork: session "${sessionId}" not found.`);
    }

    const forkedId = `agent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const forked: AgentSessionState = {
      sessionId: forkedId,
      conversationHistory: structuredClone(parent.conversationHistory),
      metadata: {
        ...structuredClone(parent.metadata),
        forkedAt: now,
        forkPoint: parent.conversationHistory.length,
      },
      createdAt: now,
      lastActiveAt: now,
      parentSessionId: sessionId,
      forkReason: reason,
    };

    this.sessions.set(forkedId, forked);
    return forked;
  }

  // -----------------------------------------------------------------------
  // Fresh start
  // -----------------------------------------------------------------------

  /**
   * Create a fresh start session with a structured summary of the original.
   *
   * @exam Domain 1.7 — Fresh start is the safest resumption strategy when
   * context might be stale. Instead of replaying full history (which may
   * reference outdated state), we inject a curated summary that captures
   * the ESSENTIAL decisions and outcomes without the noise.
   *
   * The summary is structured, not just a text dump:
   *   - Key decisions made
   *   - Current status
   *   - Outstanding tasks
   *   - Caveats and warnings
   *
   * @param sessionId - The original session to summarise.
   * @returns The new session with summary injected, or undefined if not found.
   */
  freshStart(sessionId: string): AgentSessionState | undefined {
    const original = this.sessions.get(sessionId);
    if (!original) return undefined;

    const summary = this.buildSessionSummary(original);
    const newSession = this.createSession({
      ...original.metadata,
      resumedFrom: sessionId,
      resumptionStrategy: "fresh_start",
    });

    newSession.summary = summary;

    // Add the summary as the first message so the model has context.
    newSession.conversationHistory.push({
      role: "user",
      content:
        `[RESUMED SESSION — Summary of prior session ${sessionId}]\n\n${summary}\n\n` +
        `Please continue from where we left off. The above summary captures ` +
        `the key context from our previous conversation.`,
    });

    return newSession;
  }

  // -----------------------------------------------------------------------
  // Stale context detection
  // -----------------------------------------------------------------------

  /**
   * Detect whether a session's context may be stale.
   *
   * @exam Domain 1.7 — Stale context is the #1 risk with full_resume.
   * If the environment changed since the session was last active, the
   * conversation history references outdated state. The agent might
   * make decisions based on information that's no longer true.
   *
   * Four indicators of staleness:
   *   1. time_elapsed — too much time has passed
   *   2. external_changes — files/data sources have been modified
   *   3. context_drift — conversation history is very long (context window pressure)
   *   4. dependency_updated — metadata flags indicate upstream changes
   *
   * @param state - The session state to evaluate.
   * @returns A report with staleness indicators and a recommended strategy.
   */
  detectStaleContext(state: AgentSessionState): StaleContextReport {
    const indicators: StaleContextIndicator[] = [];
    const details: string[] = [];
    const now = Date.now();

    // Indicator 1: Time elapsed since last activity.
    const lastActive = new Date(state.lastActiveAt).getTime();
    const elapsed = now - lastActive;

    if (elapsed > this.config.staleTimeThresholdMs) {
      indicators.push("time_elapsed");
      const hours = Math.round(elapsed / 3_600_000 * 10) / 10;
      details.push(
        `${hours} hours since last activity (threshold: ` +
          `${this.config.staleTimeThresholdMs / 3_600_000}h).`,
      );
    }

    // Indicator 2: External changes (check metadata flags).
    if (state.metadata["externalChangesDetected"] === true) {
      indicators.push("external_changes");
      details.push(
        "External changes have been flagged in session metadata. " +
          "Data sources or dependencies may have been modified.",
      );
    }

    // Indicator 3: Context drift (conversation history too long).
    if (state.conversationHistory.length > this.config.maxHistoryLength) {
      indicators.push("context_drift");
      details.push(
        `Conversation history has ${state.conversationHistory.length} messages ` +
          `(threshold: ${this.config.maxHistoryLength}). Early context may be ` +
          `pushed out of the effective attention window.`,
      );
    }

    // Indicator 4: Dependency updated (check metadata flags).
    if (state.metadata["dependencyUpdated"] === true) {
      indicators.push("dependency_updated");
      details.push(
        "A dependency has been updated since the session was last active. " +
          "Cached assumptions about dependency behaviour may be incorrect.",
      );
    }

    // Determine recommended strategy based on indicators.
    let recommendedStrategy: ResumptionStrategy;

    if (indicators.length === 0) {
      recommendedStrategy = "full_resume";
    } else if (indicators.length === 1 && indicators[0] === "time_elapsed") {
      // Mild staleness — fresh start is sufficient.
      recommendedStrategy = "fresh_start";
    } else {
      // Multiple indicators or severe staleness — fresh start.
      recommendedStrategy = "fresh_start";
    }

    return {
      isStale: indicators.length > 0,
      indicators,
      details,
      recommendedStrategy,
    };
  }

  // -----------------------------------------------------------------------
  // Build resumption context
  // -----------------------------------------------------------------------

  /**
   * Build the resumption context for a specific strategy.
   *
   * @exam Domain 1.7 — This is the key function that prepares context
   * for each resumption strategy:
   *   - full_resume: Complete conversation history.
   *   - fresh_start: Curated summary as a single message.
   *   - fork_session: Parent history + fork point context.
   *
   * The returned context can be directly injected into an agentic loop.
   *
   * @param state - The session state to resume.
   * @param strategy - Which resumption strategy to use.
   * @returns Resumption context ready for injection into the agentic loop.
   */
  buildResumptionContext(
    state: AgentSessionState,
    strategy: ResumptionStrategy,
  ): ResumptionContext {
    const staleReport = this.detectStaleContext(state);

    switch (strategy) {
      case "full_resume":
        return this.buildFullResumeContext(state, staleReport);
      case "fresh_start":
        return this.buildFreshStartContext(state, staleReport);
      case "fork_session":
        return this.buildForkContext(state, staleReport);
    }
  }

  // -----------------------------------------------------------------------
  // Private: Strategy-specific context builders
  // -----------------------------------------------------------------------

  /**
   * Build context for full_resume: replay entire conversation history.
   */
  private buildFullResumeContext(
    state: AgentSessionState,
    staleReport: StaleContextReport,
  ): ResumptionContext {
    let supplement = "";

    if (staleReport.isStale) {
      supplement =
        "\n\n⚠️ STALE CONTEXT WARNING: This session may contain outdated information.\n" +
        staleReport.details.map((d) => `  - ${d}`).join("\n") +
        "\nProceed with caution and verify assumptions.";
    }

    return {
      strategy: "full_resume",
      messages: [...state.conversationHistory],
      systemPromptSupplement: supplement,
      metadata: {
        originalSessionId: state.sessionId,
        historyLength: state.conversationHistory.length,
        strategy: "full_resume",
        staleContextDetected: staleReport.isStale,
      },
    };
  }

  /**
   * Build context for fresh_start: curated summary injection.
   */
  private buildFreshStartContext(
    state: AgentSessionState,
    staleReport: StaleContextReport,
  ): ResumptionContext {
    const summary = this.buildSessionSummary(state);

    const summaryMessage: MessageParam = {
      role: "user",
      content:
        `[RESUMED SESSION — Fresh start from ${state.sessionId}]\n\n` +
        `${summary}\n\n` +
        `This is a fresh start with a summary of the prior session. ` +
        `Previous conversation details are not available — only this summary.`,
    };

    return {
      strategy: "fresh_start",
      messages: [summaryMessage],
      systemPromptSupplement:
        "This session was resumed with a fresh start. The user message " +
        "contains a summary of the prior session. Do not assume access " +
        "to any information not explicitly stated in the summary.",
      metadata: {
        originalSessionId: state.sessionId,
        historyLength: 1,
        strategy: "fresh_start",
        staleContextDetected: staleReport.isStale,
      },
    };
  }

  /**
   * Build context for fork_session: parent history + fork branch point.
   */
  private buildForkContext(
    state: AgentSessionState,
    staleReport: StaleContextReport,
  ): ResumptionContext {
    // For forks, include the full parent history plus a fork marker.
    const forkMarker: MessageParam = {
      role: "user",
      content:
        `[SESSION FORKED from ${state.parentSessionId ?? state.sessionId}]\n` +
        `Reason: ${state.forkReason ?? "Exploring alternative approach"}\n\n` +
        `You are now on a forked branch. The conversation history above is ` +
        `from the parent session. From this point forward, this session ` +
        `diverges independently. Changes here do NOT affect the parent session.`,
    };

    return {
      strategy: "fork_session",
      messages: [...state.conversationHistory, forkMarker],
      systemPromptSupplement:
        "This is a forked session. The conversation history includes the " +
        "parent session's context up to the fork point. This branch is " +
        "independent — explore freely without concern for the parent session.",
      metadata: {
        originalSessionId: state.parentSessionId ?? state.sessionId,
        historyLength: state.conversationHistory.length + 1,
        strategy: "fork_session",
        staleContextDetected: staleReport.isStale,
      },
    };
  }

  // -----------------------------------------------------------------------
  // Private: Summary builder
  // -----------------------------------------------------------------------

  /**
   * Build a structured summary of a session for fresh_start resumption.
   *
   * @exam Domain 1.7 — The summary must be SELF-CONTAINED. The resumed
   * session doesn't have the original transcript. Everything the model
   * needs to continue effectively must be in this summary:
   *   - What was discussed / decided
   *   - What the current status is
   *   - What's outstanding
   *   - Any caveats or warnings
   */
  private buildSessionSummary(state: AgentSessionState): string {
    const lines: string[] = [];

    lines.push(`Session: ${state.sessionId}`);
    lines.push(`Created: ${state.createdAt}`);
    lines.push(`Last active: ${state.lastActiveAt}`);
    lines.push(`Messages exchanged: ${state.conversationHistory.length}`);

    if (state.parentSessionId) {
      lines.push(`Forked from: ${state.parentSessionId}`);
      if (state.forkReason) lines.push(`Fork reason: ${state.forkReason}`);
    }

    // Extract key metadata.
    if (Object.keys(state.metadata).length > 0) {
      lines.push("", "Metadata:");
      for (const [key, value] of Object.entries(state.metadata)) {
        lines.push(`  ${key}: ${JSON.stringify(value)}`);
      }
    }

    // Include the last few user messages as context.
    const recentUserMessages = state.conversationHistory
      .filter((m) => m.role === "user")
      .slice(-3);

    if (recentUserMessages.length > 0) {
      lines.push("", "Recent topics discussed:");
      for (const msg of recentUserMessages) {
        const content =
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content);
        // Truncate long messages.
        const truncated =
          content.length > 200 ? content.slice(0, 200) + "..." : content;
        lines.push(`  - ${truncated}`);
      }
    }

    return lines.join("\n");
  }
}
