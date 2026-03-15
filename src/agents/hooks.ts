/**
 * @module hooks
 * @description Agent SDK Hooks — deterministic guardrails for tool execution.
 *
 * @exam Domain 1.5 — Agent SDK Hooks
 *
 * THE FUNDAMENTAL DISTINCTION:
 *
 *   Prompts = PROBABILISTIC. You can ask the model to "always format
 *   timestamps as ISO 8601" and it will do so ~95% of the time.
 *
 *   Hooks = DETERMINISTIC. A PostToolUse hook that converts Unix
 *   timestamps to ISO 8601 will do so 100% of the time, because
 *   it's code, not a suggestion.
 *
 * Use prompts for flexible behaviour. Use hooks for invariants.
 *
 * This module provides:
 * - PostToolUse hooks for data normalisation (timestamps, status codes)
 * - PreToolUse hooks for interception (blocking operations above thresholds)
 * - A hook pipeline factory that composes multiple hooks in order
 *
 * @author Liam Nakamura, Lead Architect — ArchitectAI
 */

import type {
  HookContext,
  HookPipeline,
  HookValidationResult,
  PostToolUseHook,
  PreToolUseHook,
} from "./types";

// ---------------------------------------------------------------------------
// PostToolUse hooks: data normalisation
// ---------------------------------------------------------------------------

/**
 * Create a PostToolUse hook that normalises Unix timestamps to ISO 8601.
 *
 * EXAM CONCEPT: This is a DETERMINISTIC guarantee. If you asked the model
 * "please convert timestamps to ISO 8601" in the prompt, it might forget
 * or hallucinate the conversion. This hook guarantees it happens.
 *
 * Walks the entire tool result object and converts any number that looks
 * like a Unix timestamp (seconds or milliseconds since epoch) to an
 * ISO 8601 string.
 *
 * @exam Domain 1.5 — PostToolUse hook for data normalisation
 *
 * @param fieldNames - Specific field names to target (e.g. ["created_at", "updated_at"]).
 *                     If empty, targets ALL numeric fields that look like timestamps.
 * @returns A PostToolUseHook that normalises timestamps in tool results.
 */
export function createTimestampNormalisationHook(
  fieldNames: string[] = [],
): PostToolUseHook {
  const targetFields = new Set(fieldNames);

  return {
    name: "timestamp-normalisation",

    shouldRun: (_context: HookContext) => {
      // Run on all tool results — timestamps can appear anywhere.
      return true;
    },

    execute: (context: HookContext) => {
      return normaliseTimestamps(context.toolResult, targetFields);
    },
  };
}

/**
 * Create a PostToolUse hook that converts HTTP status codes to human-readable strings.
 *
 * Another deterministic normalisation — ensures the model always sees
 * "200 OK" instead of raw `200`, preventing misinterpretation.
 *
 * @exam Domain 1.5 — PostToolUse hook for data normalisation
 */
export function createStatusCodeNormalisationHook(): PostToolUseHook {
  return {
    name: "status-code-normalisation",

    shouldRun: (context: HookContext) => {
      // Only run on tools that might return HTTP responses.
      const result = context.toolResult;
      return (
        typeof result === "object" &&
        result !== null &&
        ("status" in result || "statusCode" in result || "status_code" in result)
      );
    },

    execute: (context: HookContext) => {
      const result = context.toolResult;
      if (typeof result !== "object" || result === null) return result;

      const clone = { ...(result as Record<string, unknown>) };

      for (const key of ["status", "statusCode", "status_code"]) {
        if (key in clone && typeof clone[key] === "number") {
          clone[key] = formatStatusCode(clone[key] as number);
        }
      }

      return clone;
    },
  };
}

// ---------------------------------------------------------------------------
// PreToolUse hooks: interception and guardrails
// ---------------------------------------------------------------------------

/**
 * Create a PreToolUse hook that blocks operations above a cost/amount threshold.
 *
 * EXAM CONCEPT: This is a guardrail hook. The model might decide to transfer
 * £1,000,000 — the hook intercepts the call BEFORE execution and blocks it
 * if the amount exceeds the threshold. This is a deterministic safety net
 * that cannot be bypassed by prompt injection.
 *
 * @exam Domain 1.5 — Tool call interception for guardrails
 *
 * @param toolName - The tool to guard (e.g. "transfer_funds").
 * @param amountField - The field name containing the amount (e.g. "amount").
 * @param threshold - Maximum allowed value.
 * @param escalationTool - Optional tool to redirect to for human approval.
 * @returns A PreToolUseHook that blocks calls above the threshold.
 */
export function createThresholdGuardHook(
  toolName: string,
  amountField: string,
  threshold: number,
  escalationTool?: { name: string; buildInput: (original: Record<string, unknown>) => Record<string, unknown> },
): PreToolUseHook {
  return {
    name: `threshold-guard-${toolName}`,

    shouldRun: (name: string, _input: Record<string, unknown>) => {
      return name === toolName;
    },

    validate: (
      _name: string,
      input: Record<string, unknown>,
    ): HookValidationResult => {
      const amount = input[amountField];

      if (typeof amount !== "number") {
        // Fix RT-005: Reject non-numeric amounts — attacker could pass string "99999" to bypass.
        return {
          allowed: false,
          reason:
            `Amount field "${amountField}" is not a number (got ${typeof amount}) for tool "${toolName}". ` +
            `Non-numeric amounts are rejected for safety.`,
        };
      }

      if (amount <= threshold) {
        return { allowed: true };
      }

      // Amount exceeds threshold — block the call.
      const result: HookValidationResult = {
        allowed: false,
        reason:
          `Amount ${amount} exceeds threshold of ${threshold} for tool "${toolName}". ` +
          `This operation requires escalation.`,
      };

      // Optionally redirect to an escalation/approval tool.
      if (escalationTool) {
        result.redirectTo = {
          toolName: escalationTool.name,
          toolInput: escalationTool.buildInput(input),
        };
      }

      return result;
    },
  };
}

/**
 * Create a PreToolUse hook that blocks specific tools entirely.
 *
 * Useful for disabling dangerous tools in certain environments
 * (e.g. block "delete_database" in production).
 *
 * @exam Domain 1.5 — Tool call interception
 *
 * @param blockedTools - Set of tool names to block.
 * @param reason - Human-readable reason for blocking.
 */
export function createToolBlocklistHook(
  blockedTools: Set<string>,
  reason: string = "This tool is not available in the current environment.",
): PreToolUseHook {
  return {
    name: "tool-blocklist",

    shouldRun: (name: string, _input: Record<string, unknown>) => {
      return blockedTools.has(name);
    },

    validate: (_name: string, _input: Record<string, unknown>): HookValidationResult => {
      return { allowed: false, reason };
    },
  };
}

// ---------------------------------------------------------------------------
// Hook pipeline factory
// ---------------------------------------------------------------------------

/**
 * Create a hook pipeline from arrays of pre- and post-tool-use hooks.
 *
 * The pipeline is executed in order: all pre-hooks run before tool execution,
 * all post-hooks run after. If any pre-hook blocks the call, execution stops
 * and an error result is returned to the model.
 *
 * EXAM CONCEPT: Hook pipelines provide LAYERED deterministic guarantees.
 * Each hook is independent and composable. You can add a timestamp hook,
 * a threshold hook, and a blocklist hook — they stack without interference.
 *
 * @exam Domain 1.5 — Agent SDK Hooks
 *
 * @param preHooks - Hooks that run before tool execution.
 * @param postHooks - Hooks that run after tool execution.
 * @returns A HookPipeline ready to pass to the agentic loop config.
 *
 * @example
 * ```ts
 * const pipeline = createHookPipeline(
 *   [
 *     createThresholdGuardHook("transfer_funds", "amount", 10000),
 *     createToolBlocklistHook(new Set(["delete_all"])),
 *   ],
 *   [
 *     createTimestampNormalisationHook(["created_at", "updated_at"]),
 *     createStatusCodeNormalisationHook(),
 *   ],
 * );
 * ```
 */
export function createHookPipeline(
  preHooks: PreToolUseHook[] = [],
  postHooks: PostToolUseHook[] = [],
): HookPipeline {
  return {
    preToolUse: preHooks,
    postToolUse: postHooks,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Recursively walk an object and normalise timestamp fields.
 *
 * A value is treated as a Unix timestamp if:
 * - It's a number
 * - It falls within a plausible timestamp range (year 2000–2100)
 * - Either the field name is in targetFields, OR targetFields is empty
 */
function normaliseTimestamps(
  value: unknown,
  targetFields: Set<string>,
  currentKey?: string,
): unknown {
  if (value === null || value === undefined) return value;

  // Check if this specific value should be converted.
  if (typeof value === "number" && (targetFields.size === 0 || (currentKey && targetFields.has(currentKey)))) {
    if (isPlausibleTimestamp(value)) {
      return unixToIso8601(value);
    }
  }

  // Recurse into arrays.
  if (Array.isArray(value)) {
    return value.map((item) => normaliseTimestamps(item, targetFields));
  }

  // Recurse into objects.
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(obj)) {
      result[key] = normaliseTimestamps(val, targetFields, key);
    }

    return result;
  }

  return value;
}

/**
 * Check if a number is a plausible Unix timestamp.
 * Supports both seconds (10 digits) and milliseconds (13 digits).
 */
function isPlausibleTimestamp(value: number): boolean {
  // Seconds: 946684800 (2000-01-01) to 4102444800 (2100-01-01)
  if (value >= 946_684_800 && value <= 4_102_444_800) return true;

  // Milliseconds: same range × 1000
  if (value >= 946_684_800_000 && value <= 4_102_444_800_000) return true;

  return false;
}

/**
 * Convert a Unix timestamp (seconds or milliseconds) to ISO 8601 string.
 */
function unixToIso8601(timestamp: number): string {
  // If the value is in seconds (10 digits), convert to milliseconds.
  const ms = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  return new Date(ms).toISOString();
}

/**
 * Format an HTTP status code as a human-readable string.
 */
function formatStatusCode(code: number): string {
  const STATUS_MESSAGES: Record<number, string> = {
    200: "200 OK",
    201: "201 Created",
    204: "204 No Content",
    301: "301 Moved Permanently",
    302: "302 Found",
    304: "304 Not Modified",
    400: "400 Bad Request",
    401: "401 Unauthorised",
    403: "403 Forbidden",
    404: "404 Not Found",
    409: "409 Conflict",
    422: "422 Unprocessable Entity",
    429: "429 Too Many Requests",
    500: "500 Internal Server Error",
    502: "502 Bad Gateway",
    503: "503 Service Unavailable",
    504: "504 Gateway Timeout",
  };

  return STATUS_MESSAGES[code] ?? `${code} Unknown`;
}
