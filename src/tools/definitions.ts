/**
 * @module tools/definitions
 * @description Tool schema definitions for ArchitectAI study tools.
 *
 * @exam Domain 2.1 — Design Tool Interfaces
 *
 * CRITICAL EXAM CONCEPT (2.1): Tool descriptions are THE mechanism LLMs use
 * for tool selection. A vague description means the model will misuse or skip
 * the tool entirely. Each description must explain:
 *   - WHAT the tool does (primary capability)
 *   - WHEN to use it (trigger conditions)
 *   - WHEN NOT to use it (disambiguation from other tools)
 *   - WHAT it returns (output format so the model can plan downstream)
 *   - SIDE EFFECTS (any state changes the model should know about)
 *
 * Parameter schemas use Zod for runtime validation. The schemas are converted
 * to JSON Schema for the Anthropic Messages API `tools` parameter.
 *
 * @author Sofia Andersson, Tool Systems Engineer — ArchitectAI
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared parameter schemas
// ---------------------------------------------------------------------------

/**
 * Canonical difficulty levels accepted by tools.
 * @exam Domain 2.1 — Constrained enums prevent the model from hallucinating values.
 */
const DifficultyParam = z
  .enum(["foundation", "intermediate", "advanced"])
  .describe(
    "Difficulty level. 'foundation' = recall/identify, " +
      "'intermediate' = apply/analyse, 'advanced' = evaluate/design.",
  );

/**
 * Domain number (1–5), matching exam domains.
 */
const DomainParam = z
  .number()
  .int()
  .min(1)
  .max(5)
  .describe(
    "Exam domain number (1–5). 1=Agentic Architecture, 2=Tool Design & MCP, " +
      "3=CLI & Commands, 4=Prompt Engineering, 5=Context Management.",
  );

// ---------------------------------------------------------------------------
// Tool: questionBankTool
// ---------------------------------------------------------------------------

/**
 * Input schema for the question bank query tool.
 *
 * @exam Domain 2.1 — Each parameter has tight constraints and descriptive
 * documentation so the model knows exactly what values are valid.
 */
export const QuestionBankInputSchema = z.object({
  domain: DomainParam.optional(),
  taskStatement: z
    .string()
    .regex(/^\d+\.\d+$/)
    .optional()
    .describe(
      "Task statement identifier (e.g. '1.1', '2.2'). " +
        "Filters to questions covering a specific sub-topic within a domain.",
    ),
  difficulty: DifficultyParam.optional(),
  count: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe(
      "Number of questions to return. Defaults to 5. " +
        "Max 20 to keep context window usage reasonable.",
    ),
  excludeIds: z
    .array(z.string())
    .optional()
    .describe(
      "Question IDs to exclude (e.g. already answered in this session). " +
        "Prevents duplicate questions in a study session.",
    ),
});

export type QuestionBankInput = z.infer<typeof QuestionBankInputSchema>;

/**
 * Question bank query tool definition.
 *
 * USE THIS TOOL when:
 *   - The user wants to practise exam questions
 *   - The quiz agent needs to fetch questions for a specific domain or difficulty
 *   - The assessor agent needs questions to evaluate readiness
 *
 * DO NOT USE when:
 *   - The user wants an explanation of a concept (use codebaseSearch instead)
 *   - The user wants to see their progress (use progressTracker instead)
 *
 * RETURNS: An array of Question objects with id, scenario, question, options,
 * correctAnswer, and explanation. The model should present questions WITHOUT
 * revealing correctAnswer until the user has attempted an answer.
 *
 * SIDE EFFECTS: None — this is a pure read operation.
 *
 * @exam Domain 2.1 — This description follows best practices: what, when,
 * when-not, return format, side effects.
 */
export const questionBankTool = {
  name: "question_bank_query",
  description:
    "Query the exam question bank to retrieve practice questions. " +
    "Use this when the user wants to practise, take a quiz, or when you need " +
    "questions to assess their knowledge. Filters by domain (1–5), task " +
    "statement (e.g. '2.1'), and difficulty (foundation/intermediate/advanced). " +
    "Returns an array of Question objects with scenario, question text, four " +
    "options (A–D), correctAnswer, and explanation. Do NOT reveal correctAnswer " +
    "until the user has submitted their answer. Do NOT use this tool to explain " +
    "concepts — use codebase_search for explanations instead.",
  input_schema: QuestionBankInputSchema,
} as const;

// ---------------------------------------------------------------------------
// Tool: progressTrackerTool
// ---------------------------------------------------------------------------

/**
 * Input schema for the progress tracking tool.
 */
export const ProgressTrackerInputSchema = z.object({
  action: z
    .enum(["get_summary", "record_answer", "get_weak_areas", "get_history"])
    .describe(
      "Action to perform. 'get_summary' = overall readiness snapshot, " +
        "'record_answer' = log an answer (requires questionId + correct), " +
        "'get_weak_areas' = domains below 72% pass threshold, " +
        "'get_history' = recent answer history for a domain.",
    ),
  questionId: z
    .string()
    .optional()
    .describe("Required for 'record_answer'. The ID of the answered question."),
  correct: z
    .boolean()
    .optional()
    .describe("Required for 'record_answer'. Whether the user's answer was correct."),
  domain: DomainParam.optional().describe(
    "Optional filter for 'get_history'. Limits results to a single domain.",
  ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      "User's self-reported confidence (0–1) for 'record_answer'. " +
        "Used to detect overconfidence or underconfidence patterns.",
    ),
});

export type ProgressTrackerInput = z.infer<typeof ProgressTrackerInputSchema>;

/**
 * Progress tracking tool definition.
 *
 * USE THIS TOOL when:
 *   - The user asks "how am I doing?" or wants a readiness report
 *   - You need to record that the user answered a question
 *   - You need to identify weak areas to focus study on
 *   - The assessor agent needs historical performance data
 *
 * DO NOT USE when:
 *   - You need questions to present to the user (use question_bank_query)
 *   - The user wants to understand a concept (use codebase_search)
 *
 * RETURNS: Varies by action. get_summary returns per-domain scores and overall
 * readiness percentage. record_answer returns confirmation. get_weak_areas
 * returns domains below 72%. get_history returns recent answers.
 *
 * SIDE EFFECTS: 'record_answer' mutates session state by appending to the
 * answer history. All other actions are read-only.
 *
 * @exam Domain 2.1 — Side effects are explicitly documented so the model
 * understands which actions are safe to call speculatively vs. which commit state.
 */
export const progressTrackerTool = {
  name: "progress_tracker",
  description:
    "Track and query the user's study progress across exam domains. " +
    "Use 'get_summary' for an overall readiness report with per-domain scores. " +
    "Use 'record_answer' after the user answers a question (requires questionId " +
    "and correct boolean). Use 'get_weak_areas' to find domains below the 72% " +
    "pass threshold — useful for deciding what to study next. Use 'get_history' " +
    "to review recent answers for a specific domain. NOTE: 'record_answer' " +
    "modifies session state; all other actions are read-only. Do NOT use this " +
    "tool to fetch questions — use question_bank_query instead.",
  input_schema: ProgressTrackerInputSchema,
} as const;

// ---------------------------------------------------------------------------
// Tool: codebaseSearchTool
// ---------------------------------------------------------------------------

/**
 * Input schema for the codebase search tool.
 */
export const CodebaseSearchInputSchema = z.object({
  query: z
    .string()
    .min(3)
    .max(200)
    .describe(
      "Natural language search query describing the concept to find. " +
        "E.g. 'how does the agentic loop check stop_reason' or 'hook pipeline execution order'.",
    ),
  filePattern: z
    .string()
    .optional()
    .describe(
      "Optional glob pattern to restrict search scope (e.g. 'src/agents/*.ts'). " +
        "Omit to search the entire codebase.",
    ),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(3)
    .describe(
      "Maximum number of code snippets to return. Defaults to 3. " +
        "Keep low to avoid flooding the context window.",
    ),
  includeComments: z
    .boolean()
    .default(true)
    .describe(
      "Whether to include inline comments and JSDoc in results. " +
        "Set to false for a more compact view of just the code.",
    ),
});

export type CodebaseSearchInput = z.infer<typeof CodebaseSearchInputSchema>;

/**
 * Codebase search tool definition.
 *
 * USE THIS TOOL when:
 *   - The user asks "how does X work?" or "show me the code for Y"
 *   - The explainer agent needs source code references to cite
 *   - You need to ground an explanation in actual implementation details
 *   - The user asks about a specific exam concept and you want to show
 *     where it's implemented in this codebase
 *
 * DO NOT USE when:
 *   - The user wants to take a quiz (use question_bank_query)
 *   - The user wants progress data (use progress_tracker)
 *   - The question is purely conceptual with no codebase relevance
 *
 * RETURNS: An array of CodeSnippet objects, each with filePath, lineRange,
 * code content, and a relevance score. Use the filePath and lineRange to
 * construct citations in your explanations.
 *
 * SIDE EFFECTS: None — this is a pure read operation.
 *
 * @exam Domain 2.1 — The description clarifies disambiguation between
 * this tool and question_bank_query, which is a common source of confusion.
 */
export const codebaseSearchTool = {
  name: "codebase_search",
  description:
    "Search the ArchitectAI codebase for implementations of exam concepts. " +
    "Use this when the user asks 'how does X work?' or when you need to cite " +
    "actual source code in an explanation. Accepts a natural language query " +
    "(e.g. 'agentic loop stop condition') and returns matching code snippets " +
    "with file paths and line numbers. Results include JSDoc comments and " +
    "@exam tags that map code to exam domains. Do NOT use this to fetch quiz " +
    "questions — use question_bank_query instead. Do NOT use for progress " +
    "data — use progress_tracker instead.",
  input_schema: CodebaseSearchInputSchema,
} as const;

// ---------------------------------------------------------------------------
// Utility: Convert Zod schemas to JSON Schema for the Anthropic API
// ---------------------------------------------------------------------------

/**
 * Convert a tool definition with a Zod input_schema to the format expected
 * by the Anthropic Messages API `tools` parameter.
 *
 * The API expects JSON Schema, not Zod objects, so we use zodToJsonSchema
 * at the boundary.
 *
 * @exam Domain 2.1 — Tool definitions must be serialised to JSON Schema
 * for the API. Zod is our authoring format; JSON Schema is the wire format.
 */
export function toAnthropicToolDefinition(tool: {
  name: string;
  description: string;
  input_schema: z.ZodType;
}): {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
} {
  // Manual conversion: walk the Zod schema and produce JSON Schema.
  // This avoids a dependency on zod-to-json-schema for this lightweight use case.
  const jsonSchema = zodSchemaToJsonSchema(tool.input_schema);
  return {
    name: tool.name,
    description: tool.description,
    input_schema: jsonSchema,
  };
}

/**
 * Lightweight Zod-to-JSON-Schema converter for object schemas.
 *
 * Handles the subset of Zod types we use in tool definitions:
 * ZodObject, ZodString, ZodNumber, ZodBoolean, ZodEnum, ZodArray, ZodOptional, ZodDefault.
 *
 * For production use, consider the `zod-to-json-schema` package.
 */
function zodSchemaToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Unwrap ZodDefault and ZodOptional to get the inner type
  if (schema instanceof z.ZodDefault) {
    const inner = zodSchemaToJsonSchema(
      (schema as z.ZodDefault<z.ZodType>)._def.innerType,
    );
    inner["default"] = schema._def.defaultValue();
    return inner;
  }

  if (schema instanceof z.ZodOptional) {
    return zodSchemaToJsonSchema(
      (schema as z.ZodOptional<z.ZodType>)._def.innerType,
    );
  }

  if (schema instanceof z.ZodObject) {
    const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as z.ZodType;
      properties[key] = zodSchemaToJsonSchema(fieldSchema);

      // A field is required if it is NOT optional and NOT defaulted
      if (
        !(fieldSchema instanceof z.ZodOptional) &&
        !(fieldSchema instanceof z.ZodDefault)
      ) {
        required.push(key);
      }
    }

    const result: Record<string, unknown> = {
      type: "object",
      properties,
    };
    if (required.length > 0) {
      result["required"] = required;
    }
    return result;
  }

  if (schema instanceof z.ZodString) {
    return { type: "string" };
  }

  if (schema instanceof z.ZodNumber) {
    return { type: "number" };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }

  if (schema instanceof z.ZodEnum) {
    const values = (schema as z.ZodEnum<[string, ...string[]]>)._def.values;
    return { type: "string", enum: values };
  }

  if (schema instanceof z.ZodArray) {
    const itemSchema = zodSchemaToJsonSchema(
      (schema as z.ZodArray<z.ZodType>)._def.type,
    );
    return { type: "array", items: itemSchema };
  }

  // Fallback for unrecognised types
  return { type: "string" };
}

/**
 * All tool definitions bundled for convenient registration.
 *
 * @exam Domain 2.1 — A registry of all tools makes it easy to expose
 * the full set to the Messages API or to an MCP server.
 */
export const ALL_TOOL_DEFINITIONS = [
  questionBankTool,
  progressTrackerTool,
  codebaseSearchTool,
] as const;
