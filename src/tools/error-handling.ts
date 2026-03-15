/**
 * @module tools/error-handling
 * @description Structured tool error handling for ArchitectAI.
 *
 * @exam Domain 2.2 — MCP Protocol / Structured Error Handling
 *
 * CRITICAL EXAM CONCEPT (2.2): Tools must return STRUCTURED errors, not throw
 * raw exceptions. When a tool throws an unstructured error, the model receives
 * an opaque "tool execution failed" message and cannot reason about recovery.
 *
 * Structured errors include:
 *   - error_type: A machine-readable category (e.g. "validation_error")
 *   - message: Human-readable description for the model to relay to the user
 *   - retry_eligible: Whether the model should attempt the same call again
 *   - suggested_action: Concrete next step the model can take
 *
 * This pattern lets the model REASON about failures:
 *   "The tool returned a validation_error saying the domain must be 1–5.
 *    I passed domain=6. I'll retry with domain=5."
 *
 * vs. throwing an exception:
 *   "Tool failed." — The model has no information to recover.
 *
 * @author Sofia Andersson, Tool Systems Engineer — ArchitectAI
 */

// ---------------------------------------------------------------------------
// Error types — machine-readable categories
// ---------------------------------------------------------------------------

/**
 * Canonical error types that tools can return.
 *
 * Each type implies different recovery strategies:
 *   - validation_error → Fix input and retry
 *   - not_found → Broaden search or try different parameters
 *   - rate_limited → Wait and retry (retry_eligible = true)
 *   - internal_error → Do not retry; escalate to the user
 *   - permission_denied → Do not retry; inform the user
 *   - context_overflow → Reduce scope (fewer results, narrower query)
 *
 * @exam Domain 2.2 — The error_type field enables model-driven recovery.
 */
export type ToolErrorType =
  | "validation_error"
  | "not_found"
  | "rate_limited"
  | "internal_error"
  | "permission_denied"
  | "context_overflow";

// ---------------------------------------------------------------------------
// Structured error interface
// ---------------------------------------------------------------------------

/**
 * The wire format for structured tool errors.
 *
 * This is what gets serialised into the tool_result content block
 * when a tool fails. The model receives this JSON and can parse each
 * field to decide what to do next.
 *
 * @exam Domain 2.2 — Structured errors let the model reason about recovery
 * instead of blindly retrying or giving up.
 */
export interface ToolErrorData {
  /** Machine-readable error category. */
  error_type: ToolErrorType;
  /** Human-readable description of what went wrong. */
  message: string;
  /** Whether the model should attempt the same call again (possibly with modified params). */
  retry_eligible: boolean;
  /**
   * A concrete suggestion for what the model can do next.
   * E.g. "Try domain=1 instead" or "Reduce maxResults to 3".
   */
  suggested_action: string;
  /** Optional additional context for debugging. */
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// ToolError class
// ---------------------------------------------------------------------------

/**
 * Structured tool error class.
 *
 * Extends Error for stack trace support but carries structured data
 * that can be serialised into a tool_result block.
 *
 * USAGE PATTERN:
 *   In tool implementations, throw a ToolError instead of a plain Error.
 *   The agentic loop's error handler will detect it and serialise the
 *   structured data into the tool_result, giving the model full context
 *   for recovery.
 *
 * @exam Domain 2.2 — Structured errors (not exceptions) for model reasoning.
 *
 * @example
 * ```ts
 * throw new ToolError({
 *   error_type: "validation_error",
 *   message: "Domain must be between 1 and 5, received: 7",
 *   retry_eligible: true,
 *   suggested_action: "Use a domain number between 1 and 5.",
 * });
 * ```
 */
export class ToolError extends Error {
  /** The structured error data for serialisation. */
  public readonly data: ToolErrorData;

  constructor(data: ToolErrorData) {
    super(data.message);
    this.name = "ToolError";
    this.data = data;
  }

  /**
   * Serialise to the JSON format included in tool_result content.
   * @returns A plain object suitable for JSON.stringify().
   */
  toToolResult(): ToolErrorData {
    return { ...this.data };
  }

  /**
   * Serialise to a JSON string for direct inclusion in tool_result content.
   */
  toJSON(): string {
    return JSON.stringify(this.toToolResult());
  }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Create a structured tool error with sensible defaults.
 *
 * @exam Domain 2.2 — Factory functions ensure consistent error structure
 * across all tool implementations.
 *
 * @param type - The error category.
 * @param message - Human-readable description.
 * @param options - Additional options (retry_eligible, suggested_action, details).
 * @returns A ToolError instance ready to throw.
 */
export function createToolError(
  type: ToolErrorType,
  message: string,
  options: {
    retry_eligible?: boolean;
    suggested_action?: string;
    details?: Record<string, unknown>;
  } = {},
): ToolError {
  const {
    retry_eligible = isRetryable(type),
    suggested_action = getDefaultSuggestedAction(type),
    details,
  } = options;

  return new ToolError({
    error_type: type,
    message,
    retry_eligible,
    suggested_action,
    details,
  });
}

// ---------------------------------------------------------------------------
// Retry logic
// ---------------------------------------------------------------------------

/**
 * Determine whether an error type is retryable by default.
 *
 * @exam Domain 2.2 — Not all errors should be retried. Retrying a
 * permission_denied is wasteful; retrying a rate_limited is expected.
 *
 * @param errorType - The machine-readable error category.
 * @returns true if the error type is generally safe to retry.
 */
export function isRetryable(errorType: ToolErrorType): boolean {
  switch (errorType) {
    case "validation_error":
      // Retryable IF the model fixes its input
      return true;
    case "not_found":
      // Retryable with broader/different search parameters
      return true;
    case "rate_limited":
      // Retryable after a backoff period
      return true;
    case "context_overflow":
      // Retryable with a smaller scope
      return true;
    case "internal_error":
      // Generally NOT retryable — something is broken
      return false;
    case "permission_denied":
      // NOT retryable — the user lacks access
      return false;
    default: {
      // Exhaustiveness check — TypeScript will error if we miss a case
      const _exhaustive: never = errorType;
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Suggested actions
// ---------------------------------------------------------------------------

/**
 * Get a default suggested action for a given error type.
 *
 * These are fallback suggestions. Tool implementations should provide
 * more specific suggestions when possible.
 */
function getDefaultSuggestedAction(errorType: ToolErrorType): string {
  switch (errorType) {
    case "validation_error":
      return "Check the parameter constraints and retry with valid values.";
    case "not_found":
      return "Broaden the search criteria or try different filter values.";
    case "rate_limited":
      return "Wait a moment before retrying the same request.";
    case "internal_error":
      return "Inform the user that an internal error occurred and suggest trying later.";
    case "permission_denied":
      return "Inform the user that they do not have permission for this operation.";
    case "context_overflow":
      return "Reduce the scope of the request (fewer results, narrower filters).";
    default: {
      const _exhaustive: never = errorType;
      return "An unexpected error occurred.";
    }
  }
}

// ---------------------------------------------------------------------------
// Error wrapping utilities
// ---------------------------------------------------------------------------

/**
 * Wrap a tool execution function to catch errors and convert them to
 * structured ToolError format.
 *
 * If the function throws a ToolError, it's passed through as-is.
 * If it throws any other error, it's wrapped as an internal_error.
 *
 * @exam Domain 2.2 — This wrapper ensures every tool failure reaches
 * the model as structured data, never as an opaque exception.
 *
 * @param fn - The tool execution function to wrap.
 * @returns A wrapped function that always returns a result or structured error.
 */
export function withStructuredErrors<TInput, TResult>(
  fn: (input: TInput) => Promise<TResult>,
): (input: TInput) => Promise<TResult | ToolErrorData> {
  return async (input: TInput): Promise<TResult | ToolErrorData> => {
    try {
      return await fn(input);
    } catch (error) {
      if (error instanceof ToolError) {
        return error.toToolResult();
      }

      // Wrap unknown errors as internal_error
      const message =
        error instanceof Error
          ? error.message
          : "Unknown error during tool execution";

      return createToolError("internal_error", message).toToolResult();
    }
  };
}

/**
 * Type guard to check if a value is a ToolErrorData object.
 *
 * Useful in the agentic loop to detect structured errors in tool results
 * and set `is_error: true` on the tool_result block.
 *
 * @exam Domain 2.2 — The loop must distinguish between successful results
 * and structured errors to set the is_error flag correctly.
 */
export function isToolErrorData(
  value: unknown,
): value is ToolErrorData {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj["error_type"] === "string" &&
    typeof obj["message"] === "string" &&
    typeof obj["retry_eligible"] === "boolean" &&
    typeof obj["suggested_action"] === "string"
  );
}
