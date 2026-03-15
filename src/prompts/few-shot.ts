/**
 * @module prompts/few-shot
 * @description Few-shot example banks for ArchitectAI agent tasks.
 *
 * @exam Domain 4.2 — Chain-of-Thought Prompting / Few-Shot Examples
 *
 * CRITICAL EXAM CONCEPT (4.2): Few-shot examples teach the model the
 * expected input → output pattern by demonstration. They are more reliable
 * than instructions alone because the model can pattern-match against
 * concrete examples rather than interpreting abstract rules.
 *
 * DESIGN DECISIONS:
 *   - Examples are organised by task type (quiz, explanation, assessment)
 *   - Each example includes both the user input and the ideal assistant output
 *   - Dynamic selection respects context budget to avoid overflow
 *   - Examples are ordered from simplest to most complex (progressive complexity)
 *
 * ANTI-PATTERN: Stuffing too many examples wastes context tokens and can
 * actually degrade performance. Use the minimum number that establishes
 * the pattern, then let the model generalise.
 *
 * @author Yuki Tanaka, Prompt Engineer — ArchitectAI
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single few-shot example: a user message paired with the ideal assistant response.
 *
 * @exam Domain 4.2 — Each example demonstrates the expected behaviour
 * for a specific task type. The model uses these to calibrate its output
 * format, tone, and level of detail.
 */
export interface FewShotExample {
  /** Unique identifier for this example. */
  id: string;
  /** The task type this example demonstrates. */
  taskType: FewShotTaskType;
  /** The simulated user message. */
  userMessage: string;
  /** The ideal assistant response. */
  assistantResponse: string;
  /** Approximate token count for budget calculation. */
  estimatedTokens: number;
  /** Complexity rank (1 = simplest). Used for ordering and selection. */
  complexity: number;
  /** Tags for finer-grained filtering (e.g. "domain-1", "error-handling"). */
  tags?: string[];
}

/**
 * Task types that have associated few-shot examples.
 */
export type FewShotTaskType =
  | "quiz_presentation"
  | "quiz_feedback"
  | "explanation"
  | "assessment";

// ---------------------------------------------------------------------------
// Example Banks
// ---------------------------------------------------------------------------

/**
 * Few-shot examples for quiz question presentation.
 *
 * These examples teach the model the exact format for presenting
 * exam questions: scenario, question text, and four options.
 *
 * @exam Domain 4.2 — Structured output examples ensure the model
 * produces consistent quiz formatting.
 */
const QUIZ_PRESENTATION_EXAMPLES: FewShotExample[] = [
  {
    id: "quiz-present-1",
    taskType: "quiz_presentation",
    userMessage: "Give me a question about agentic loops.",
    assistantResponse: `**Domain 1: Agentic Architecture | Task 1.1 | Intermediate**

_Your team is building a customer support agent that uses Claude to handle ticket routing. The agent uses three tools: \`classify_ticket\`, \`fetch_customer_history\`, and \`route_ticket\`. During testing, you notice the agent sometimes returns a text response saying "I've routed the ticket" alongside a \`tool_use\` block for \`route_ticket\` in the same API response._

**Question:** What is the correct way for your agentic loop to determine whether Claude wants to continue using tools or has finished its task?

- **A)** Check if \`response.content[0].type === "text"\` — if it's text, the agent is done
- **B)** Check \`response.stop_reason === "end_turn"\` to detect completion, and \`stop_reason === "tool_use"\` to continue the loop
- **C)** Parse the text content for phrases like "I'm done" or "Task complete" to detect when the agent is finished
- **D)** Count the number of tool calls and stop after a fixed limit of 10 iterations

What's your answer?`,
    estimatedTokens: 250,
    complexity: 1,
    tags: ["domain-1", "agentic-loop", "stop-reason"],
  },
  {
    id: "quiz-present-2",
    taskType: "quiz_presentation",
    userMessage: "Ask me something about tool descriptions at advanced difficulty.",
    assistantResponse: `**Domain 2: Tool Design & MCP | Task 2.1 | Advanced**

_You are designing a tool suite for a research agent that can search academic papers, summarise findings, and generate citations. The agent has access to \`search_papers\`, \`summarise_paper\`, and \`generate_citation\`. Users report that the agent frequently calls \`summarise_paper\` when they ask "find papers about X" instead of calling \`search_papers\` first._

**Question:** What is the MOST LIKELY root cause of this tool selection error, and what is the best fix?

- **A)** The model is hallucinating tool capabilities. Add a pre-tool-use hook to block \`summarise_paper\` when no paper has been searched yet
- **B)** The \`search_papers\` tool description is too vague or doesn't clearly state WHEN to use it. Improve the description to specify "Use this tool FIRST when the user asks to find, discover, or locate papers"
- **C)** Set \`tool_choice: { type: "tool", name: "search_papers" }\` to force the model to always search first
- **D)** Add more few-shot examples showing the correct tool call sequence to the system prompt

What's your answer?`,
    estimatedTokens: 280,
    complexity: 2,
    tags: ["domain-2", "tool-descriptions", "tool-selection"],
  },
];

/**
 * Few-shot examples for quiz answer feedback.
 *
 * @exam Domain 4.2 — Feedback examples establish the expected depth
 * and structure of post-answer explanations.
 */
const QUIZ_FEEDBACK_EXAMPLES: FewShotExample[] = [
  {
    id: "quiz-feedback-1",
    taskType: "quiz_feedback",
    userMessage: "B",
    assistantResponse: `**✅ Correct!** — The answer is **B**.

\`stop_reason === "end_turn"\` is the ONLY reliable signal that Claude has finished. Checking \`stop_reason === "tool_use"\` tells you Claude wants to call tools and the loop should continue.

**Why the other options are wrong:**
- **A)** Checking \`content[0].type === "text"\` is a classic exam trap. Claude can return text AND tool_use blocks in the same response (e.g., "Let me look that up" + a tool call). Checking content type would cause you to miss the tool call.
- **C)** Parsing natural language like "I'm done" is fragile, locale-dependent, and unstructured. The API provides a machine-readable \`stop_reason\` field — always use it.
- **D)** Fixed iteration limits override the model's judgement about when it's done. The loop should be model-driven, with the iteration cap as a safety net only.

**Exam Trap:** Option A is the most commonly chosen wrong answer because it seems intuitive — "if Claude is talking, it must be done." But Claude's response can contain BOTH text and tool calls.

**Codebase Reference:** See \`src/agents/loop.ts\` — the \`runAgenticLoop\` function checks \`response.stop_reason\`, never \`content[0].type\`.`,
    estimatedTokens: 300,
    complexity: 1,
    tags: ["domain-1", "feedback", "stop-reason"],
  },
];

/**
 * Few-shot examples for concept explanations.
 *
 * @exam Domain 4.2 — Explanation examples demonstrate the layered
 * depth pattern (simple → detailed → advanced).
 */
const EXPLANATION_EXAMPLES: FewShotExample[] = [
  {
    id: "explain-1",
    taskType: "explanation",
    userMessage: "Explain what structured tool errors are and why they matter.",
    assistantResponse: `### Structured Tool Errors
**Exam Domain:** 2 — Tool Design & MCP | **Task:** 2.2

**In brief:** Structured tool errors are machine-readable error objects (not raw exceptions) returned by tools so the model can reason about what went wrong and how to recover.

**How it works:**
When a tool fails, instead of throwing an exception that becomes an opaque "tool execution failed" message, it returns a structured object with fields the model can parse:

\`\`\`typescript
// From: src/tools/error-handling.ts
interface ToolErrorData {
  error_type: ToolErrorType;    // e.g. "validation_error", "not_found"
  message: string;               // Human-readable description
  retry_eligible: boolean;       // Should the model try again?
  suggested_action: string;      // What to do next
}
\`\`\`

The \`error_type\` field enables **model-driven recovery**. The model sees "validation_error" and knows to fix its input. It sees "rate_limited" and knows to wait. Without structure, the model can only say "something went wrong."

**Why this matters for the exam:**
Domain 2 questions often test whether you know that tools should return errors, not throw them. The exam will present scenarios where an agent retries endlessly because it receives opaque errors — the fix is always to add structure so the model can reason.

**Related concepts:** Tool descriptions (2.1), is_error flag on tool_result blocks (2.2), retry patterns in agentic loops (1.1)`,
    estimatedTokens: 320,
    complexity: 1,
    tags: ["domain-2", "error-handling", "structured-errors"],
  },
];

/**
 * Few-shot examples for readiness assessments.
 *
 * @exam Domain 4.2 — Assessment examples demonstrate quantitative,
 * data-driven evaluation with calibrated confidence scores.
 */
const ASSESSMENT_EXAMPLES: FewShotExample[] = [
  {
    id: "assess-1",
    taskType: "assessment",
    userMessage: "How ready am I for the exam?",
    assistantResponse: `## 📊 Readiness Assessment

### Overall Score: 68% ⚠️ BORDERLINE

| Domain | Score | Weight | Weighted | Status |
|--------|-------|--------|----------|--------|
| 1. Agentic Architecture | 80% | 28% | 22.4% | ✅ |
| 2. Tool Design & MCP | 55% | 24% | 13.2% | ❌ |
| 3. CLI & Commands | 70% | 16% | 11.2% | ⚠️ |
| 4. Prompt Engineering | 75% | 18% | 13.5% | ✅ |
| 5. Context Management | 50% | 14% | 7.0% | ❌ |

### 🔴 Priority Study Areas
1. **Domain 2 — Tool Design (55%):** You're struggling with tool description best practices (Task 2.1) and structured error patterns (Task 2.2). Focus on WHY tool descriptions matter for model selection.
2. **Domain 5 — Context Management (50%):** Context window optimisation (Task 5.1) is your weakest area. Review how session state and context pruning work.
3. **Domain 3 — CLI & Commands (70%):** Just below the 72% threshold. A few more practice questions should get you over the line.

### 📈 Confidence Calibration
Your self-reported confidence averages 85%, but your actual score is 68%. This is a **significant overconfidence gap** of 17 points. You may be recognising concepts without truly understanding the nuances the exam tests. Slow down on questions where you feel "obviously right" — those are often trap questions.

### 📋 Recommended Study Plan
1. **This week:** Domain 2 deep dive — complete 10 questions on tool descriptions and error handling
2. **Next week:** Domain 5 focus — study context window management and session state
3. **Before exam:** Domain 3 review — 5 targeted questions to clear the 72% threshold
4. **Daily:** 3 mixed-domain questions at advanced difficulty to build exam stamina`,
    estimatedTokens: 450,
    complexity: 1,
    tags: ["assessment", "readiness", "confidence-calibration"],
  },
];

// ---------------------------------------------------------------------------
// Example registry
// ---------------------------------------------------------------------------

/**
 * All few-shot examples indexed by task type.
 *
 * @exam Domain 4.2 — Centralised example storage makes it easy to
 * add, remove, or modify examples without touching the selection logic.
 */
const EXAMPLE_BANK: Record<FewShotTaskType, FewShotExample[]> = {
  quiz_presentation: QUIZ_PRESENTATION_EXAMPLES,
  quiz_feedback: QUIZ_FEEDBACK_EXAMPLES,
  explanation: EXPLANATION_EXAMPLES,
  assessment: ASSESSMENT_EXAMPLES,
};

// ---------------------------------------------------------------------------
// Dynamic example selection
// ---------------------------------------------------------------------------

/**
 * Select few-shot examples for a given task type, respecting a token budget.
 *
 * SELECTION STRATEGY:
 * 1. Filter examples by task type (and optional tags)
 * 2. Sort by complexity (simplest first — progressive complexity)
 * 3. Greedily add examples until the token budget is exhausted
 *
 * @exam Domain 4.2 — Dynamic example selection is critical for context
 * window management. Including too many examples wastes tokens; too few
 * may not establish the pattern. The token budget parameter lets the
 * caller balance between example richness and context space for the
 * actual task.
 *
 * @param taskType - The type of task to get examples for.
 * @param maxTokenBudget - Maximum token budget for examples. Defaults to 1000.
 * @param options - Optional filters (tags, max count).
 * @returns An array of FewShotExample objects fitting within the budget.
 *
 * @example
 * ```ts
 * // Get quiz presentation examples within a 500-token budget
 * const examples = getFewShotExamples("quiz_presentation", 500);
 *
 * // Get explanation examples tagged with "domain-2"
 * const d2Examples = getFewShotExamples("explanation", 800, {
 *   tags: ["domain-2"],
 * });
 * ```
 */
export function getFewShotExamples(
  taskType: FewShotTaskType,
  maxTokenBudget: number = 1000,
  options: {
    /** Only include examples with ALL of these tags. */
    tags?: string[];
    /** Maximum number of examples regardless of budget. */
    maxCount?: number;
  } = {},
): FewShotExample[] {
  const { tags, maxCount } = options;

  // 1. Get all examples for this task type
  let candidates = [...(EXAMPLE_BANK[taskType] ?? [])];

  // 2. Filter by tags if specified
  if (tags && tags.length > 0) {
    candidates = candidates.filter((example) =>
      tags.every((tag) => example.tags?.includes(tag)),
    );
  }

  // 3. Sort by complexity (simplest first for progressive disclosure)
  candidates.sort((a, b) => a.complexity - b.complexity);

  // 4. Greedily select examples within the token budget
  const selected: FewShotExample[] = [];
  let remainingBudget = maxTokenBudget;

  for (const example of candidates) {
    if (maxCount !== undefined && selected.length >= maxCount) break;
    if (example.estimatedTokens > remainingBudget) continue;

    selected.push(example);
    remainingBudget -= example.estimatedTokens;
  }

  return selected;
}

/**
 * Format selected few-shot examples into message pairs for the Messages API.
 *
 * Each example becomes a user message + assistant message pair that
 * is prepended to the conversation. This teaches the model the expected
 * input → output pattern.
 *
 * @exam Domain 4.2 — Few-shot examples are injected as conversation
 * history (user/assistant pairs), not as part of the system prompt.
 * This keeps the system prompt focused on role/constraints and uses
 * the conversation format for demonstrations.
 *
 * @param examples - The selected few-shot examples.
 * @returns An array of message objects ready for the Messages API.
 */
export function formatExamplesAsMessages(
  examples: FewShotExample[],
): Array<{ role: "user" | "assistant"; content: string }> {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const example of examples) {
    messages.push({
      role: "user",
      content: example.userMessage,
    });
    messages.push({
      role: "assistant",
      content: example.assistantResponse,
    });
  }

  return messages;
}

/**
 * Get the total estimated token cost of a set of examples.
 *
 * @param examples - Examples to measure.
 * @returns The sum of estimatedTokens across all examples.
 */
export function getExampleTokenCost(examples: FewShotExample[]): number {
  return examples.reduce((sum, ex) => sum + ex.estimatedTokens, 0);
}

/**
 * Get all available task types that have examples.
 */
export function getAvailableTaskTypes(): FewShotTaskType[] {
  return (Object.keys(EXAMPLE_BANK) as FewShotTaskType[]).filter(
    (key) => EXAMPLE_BANK[key].length > 0,
  );
}
