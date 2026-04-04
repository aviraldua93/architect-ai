/**
 * @module architect-ai
 * @description Public API barrel file for the architect-ai package.
 *
 * Re-exports the library surface — tool definitions, error handling,
 * prompt templates, output schemas, and the MCP server.
 * CLI internals are NOT exported.
 */

// ── Tools ──────────────────────────────────────────────────────
export {
  // Error handling
  ToolError,
  createToolError,
  isRetryable,
  withStructuredErrors,
  isToolErrorData,
} from "./tools/error-handling.js";

export type {
  ToolErrorType,
  ToolErrorData,
} from "./tools/error-handling.js";

export {
  // Tool definitions & schemas
  QuestionBankInputSchema,
  questionBankTool,
  ProgressTrackerInputSchema,
  progressTrackerTool,
  CodebaseSearchInputSchema,
  codebaseSearchTool,
  toAnthropicToolDefinition,
  ALL_TOOL_DEFINITIONS,
} from "./tools/definitions.js";

export type {
  QuestionBankInput,
  ProgressTrackerInput,
  CodebaseSearchInput,
} from "./tools/definitions.js";

// ── Prompts ────────────────────────────────────────────────────
export {
  QUIZ_SYSTEM_PROMPT,
  EXPLAINER_SYSTEM_PROMPT,
  ASSESSOR_SYSTEM_PROMPT,
  SYSTEM_PROMPTS,
  getSystemPrompt,
} from "./prompts/system-prompts.js";

export type { AgentRole } from "./prompts/system-prompts.js";

export {
  getFewShotExamples,
  formatExamplesAsMessages,
  getExampleTokenCost,
  getAvailableTaskTypes,
} from "./prompts/few-shot.js";

export type {
  FewShotExample,
  FewShotTaskType,
} from "./prompts/few-shot.js";

export {
  // Output schemas & validation
  QuizResponseSchema,
  ExplanationSchema,
  AssessmentSchema,
  validateOutput,
  validateWithRetry,
  extractJsonFromText,
} from "./prompts/output-schemas.js";

export type {
  QuizResponse,
  Explanation,
  Assessment,
} from "./prompts/output-schemas.js";

// ── MCP Server ─────────────────────────────────────────────────
export {
  MCPServer,
  createMCPServer,
  startServer,
} from "./mcp/server.js";

export type { MCPServerConfig } from "./mcp/server.js";
