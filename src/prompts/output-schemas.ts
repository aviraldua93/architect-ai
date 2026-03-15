/**
 * @module prompts/output-schemas
 * @description Zod schemas for validating structured outputs from LLM responses.
 *
 * @exam Domain 4.3 — Structured Output / Output Validation
 *
 * CRITICAL EXAM CONCEPT (4.3): When you ask Claude to return structured data
 * (JSON, specific formats), the response is NOT guaranteed to be valid.
 * The model may:
 *   - Return malformed JSON
 *   - Miss required fields
 *   - Include extra fields not in the schema
 *   - Use wrong types (string instead of number)
 *
 * The CORRECT pattern is: validate → retry on failure → fail gracefully.
 * This module provides Zod schemas for all structured outputs and a
 * validateWithRetry utility that re-prompts the model on validation failure.
 *
 * ANTI-PATTERN: Parsing LLM output with JSON.parse() without validation.
 * Even if the JSON is syntactically valid, it may not match your schema.
 * Always validate with a schema library (Zod, AJV, etc.).
 *
 * @author Yuki Tanaka, Prompt Engineer — ArchitectAI
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Quiz Response Schema
// ---------------------------------------------------------------------------

/**
 * Schema for a structured quiz response from the model.
 *
 * When the Quiz Agent answers a question or provides feedback,
 * it should produce output matching this schema.
 *
 * @exam Domain 4.3 — Every field has explicit constraints so validation
 * catches malformed output before it reaches the user.
 */
export const QuizResponseSchema = z.object({
  /** The question ID being responded to. */
  questionId: z
    .string()
    .regex(/^d\d+-q\d+$/)
    .describe("Question ID in d{domain}-q{number} format"),

  /** The user's selected answer. */
  userAnswer: z.enum(["A", "B", "C", "D"]).describe("The option the user selected"),

  /** Whether the user's answer was correct. */
  isCorrect: z.boolean().describe("True if userAnswer matches the correct answer"),

  /** The correct answer for reference. */
  correctAnswer: z.enum(["A", "B", "C", "D"]).describe("The correct option"),

  /** Detailed explanation of why the correct answer is right. */
  explanation: z
    .string()
    .min(50)
    .describe("Detailed explanation of the correct answer (min 50 chars)"),

  /** Why the most common wrong answer is tempting. */
  examTrap: z
    .string()
    .min(20)
    .describe("Explanation of the most common exam trap for this question"),

  /** The exam domain this question belongs to. */
  domain: z.number().int().min(1).max(5).describe("Exam domain (1–5)"),

  /** The task statement identifier. */
  taskStatement: z.string().regex(/^\d+\.\d+$/).describe("Task statement (e.g. '2.1')"),

  /** Optional codebase reference for grounding. */
  codeReference: z
    .object({
      filePath: z.string().describe("Path to the relevant source file"),
      description: z.string().describe("What this code demonstrates"),
    })
    .optional()
    .describe("Optional reference to a codebase file that demonstrates the concept"),
});

export type QuizResponse = z.infer<typeof QuizResponseSchema>;

// ---------------------------------------------------------------------------
// Explanation Schema
// ---------------------------------------------------------------------------

/**
 * Schema for a structured concept explanation.
 *
 * The Explainer Agent produces explanations matching this schema,
 * ensuring consistent depth and citation quality.
 *
 * @exam Domain 4.3 — The citation array ensures every explanation
 * is grounded in actual source code, not hallucinated.
 */
export const ExplanationSchema = z.object({
  /** The concept being explained. */
  conceptName: z.string().min(3).describe("Name of the concept being explained"),

  /** Exam domain and task statement. */
  examReference: z.object({
    domain: z.number().int().min(1).max(5).describe("Exam domain (1–5)"),
    taskStatement: z.string().regex(/^\d+\.\d+$/).describe("Task statement (e.g. '1.1')"),
    domainName: z.string().describe("Human-readable domain name"),
  }),

  /** Brief summary (1–2 sentences). */
  brief: z
    .string()
    .min(20)
    .max(200)
    .describe("1–2 sentence summary of the concept"),

  /** Detailed explanation with code context. */
  detailed: z
    .string()
    .min(100)
    .describe("Detailed explanation with code references (min 100 chars)"),

  /** Advanced notes: edge cases, trade-offs, exam traps. */
  advanced: z
    .string()
    .optional()
    .describe("Optional advanced notes: edge cases, trade-offs, and exam traps"),

  /** Source code citations. At least one required. */
  citations: z
    .array(
      z.object({
        filePath: z.string().describe("Source file path (e.g. 'src/agents/loop.ts')"),
        lineRange: z
          .object({
            start: z.number().int().min(1),
            end: z.number().int().min(1),
          })
          .optional()
          .describe("Line range for the citation"),
        snippet: z.string().optional().describe("Relevant code snippet"),
        description: z.string().describe("What this citation demonstrates"),
      }),
    )
    .min(1)
    .describe("At least one source code citation is required"),

  /** Related concepts the student should also review. */
  relatedConcepts: z
    .array(z.string())
    .optional()
    .describe("Related concepts for cross-referencing"),
});

export type Explanation = z.infer<typeof ExplanationSchema>;

// ---------------------------------------------------------------------------
// Assessment Schema
// ---------------------------------------------------------------------------

/**
 * Schema for a structured readiness assessment.
 *
 * The Assessor Agent produces assessments matching this schema,
 * ensuring quantitative scoring and actionable recommendations.
 *
 * @exam Domain 4.3 — The assessment schema enforces that every
 * evaluation includes domain-level scores, weak area identification,
 * and a concrete study plan.
 */
export const AssessmentSchema = z.object({
  /** Overall weighted score (0–100). */
  overallScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Weighted overall score as a percentage"),

  /** Whether the student is likely to pass (score >= 72%). */
  passReady: z.boolean().describe("True if overallScore >= 72"),

  /** Readiness classification. */
  readiness: z
    .enum(["pass_ready", "borderline", "not_ready"])
    .describe("Readiness level: pass_ready (>=80%), borderline (65–79%), not_ready (<65%)"),

  /** Per-domain score breakdown. */
  domainScores: z
    .array(
      z.object({
        domain: z.number().int().min(1).max(5).describe("Domain number"),
        domainName: z.string().describe("Human-readable domain name"),
        score: z.number().min(0).max(100).describe("Raw score percentage"),
        weight: z.number().min(0).max(100).describe("Exam weight percentage"),
        weightedScore: z.number().min(0).max(100).describe("Score × weight / 100"),
        questionsAnswered: z.number().int().min(0).describe("Total questions attempted"),
        status: z
          .enum(["strong", "passing", "weak", "untested"])
          .describe("strong (>=80%), passing (72–79%), weak (<72%), untested (0 questions)"),
      }),
    )
    .length(5)
    .describe("Scores for all 5 exam domains"),

  /** Domains that need the most attention. */
  weakAreas: z
    .array(
      z.object({
        domain: z.number().int().min(1).max(5),
        domainName: z.string(),
        score: z.number(),
        specificTopics: z
          .array(z.string())
          .describe("Specific task statements or topics to focus on"),
        recommendedQuestions: z
          .number()
          .int()
          .min(0)
          .describe("How many more questions to practise in this area"),
      }),
    )
    .describe("Domains below the 72% pass threshold"),

  /** Confidence calibration analysis. */
  confidenceCalibration: z
    .object({
      averageConfidence: z
        .number()
        .min(0)
        .max(1)
        .describe("User's average self-reported confidence (0–1)"),
      actualScore: z
        .number()
        .min(0)
        .max(100)
        .describe("Actual performance percentage"),
      calibrationGap: z
        .number()
        .describe("Confidence (as %) minus actual score. Positive = overconfident"),
      assessment: z
        .enum(["well_calibrated", "overconfident", "underconfident"])
        .describe("Calibration assessment"),
    })
    .optional()
    .describe("Present if confidence data is available"),

  /** Actionable study recommendations. */
  studyPlan: z
    .array(
      z.object({
        priority: z
          .number()
          .int()
          .min(1)
          .describe("Priority order (1 = most urgent)"),
        action: z.string().describe("Specific study action to take"),
        domain: z.number().int().min(1).max(5).optional().describe("Related domain"),
        estimatedTime: z.string().optional().describe("Estimated time (e.g. '2 hours')"),
      }),
    )
    .min(1)
    .describe("Prioritised study recommendations"),
});

export type Assessment = z.infer<typeof AssessmentSchema>;

// ---------------------------------------------------------------------------
// Validation + Retry Pattern
// ---------------------------------------------------------------------------

/**
 * Result of a validation attempt.
 */
interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  /** The raw input that was validated. */
  rawInput: unknown;
}

/**
 * Validate a value against a Zod schema, returning a structured result.
 *
 * @exam Domain 4.3 — This is the validation step. Parse the LLM output,
 * then validate it against the schema. If validation fails, the error
 * message can be fed back to the model for a retry.
 *
 * @param schema - The Zod schema to validate against.
 * @param value - The value to validate (typically parsed JSON from the LLM).
 * @returns A ValidationResult indicating success or failure with error details.
 */
export function validateOutput<T>(
  schema: z.ZodType<T>,
  value: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(value);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      rawInput: value,
    };
  }

  // Format Zod errors into a human-readable string that can be fed back
  // to the model for correction.
  const errorMessages = result.error.issues.map(
    (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
  );

  return {
    success: false,
    error:
      "Output validation failed:\n" +
      errorMessages.join("\n"),
    rawInput: value,
  };
}

/**
 * Validate LLM output with automatic retry on failure.
 *
 * PATTERN:
 * 1. Parse the raw output as JSON
 * 2. Validate against the schema
 * 3. If valid, return the data
 * 4. If invalid, call the retry function with the validation error
 * 5. Repeat up to maxRetries times
 * 6. If all retries exhausted, return the last error
 *
 * @exam Domain 4.3 — The validate-then-retry pattern is the standard
 * approach for structured output. The retry function typically re-prompts
 * the model with the validation error, asking it to fix the output.
 *
 * CRITICAL: The retry function receives the error message so it can
 * construct a correction prompt like: "Your previous output had these
 * errors: {errors}. Please fix them and try again."
 *
 * @param schema - The Zod schema to validate against.
 * @param initialOutput - The first output to validate (raw string or parsed object).
 * @param retryFn - A function that takes the error message and returns a new output attempt.
 * @param maxRetries - Maximum number of retry attempts. Defaults to 3.
 * @returns The validated data, or throws if all retries fail.
 *
 * @example
 * ```ts
 * const assessment = await validateWithRetry(
 *   AssessmentSchema,
 *   rawModelOutput,
 *   async (error) => {
 *     // Re-prompt the model with the error
 *     const response = await client.messages.create({
 *       model: "claude-sonnet-4-20250514",
 *       messages: [{
 *         role: "user",
 *         content: `Your previous output had validation errors:\n${error}\nPlease fix and return valid JSON.`
 *       }],
 *       system: ASSESSOR_SYSTEM_PROMPT,
 *       max_tokens: 4096,
 *     });
 *     return extractJsonFromResponse(response);
 *   },
 * );
 * ```
 */
export async function validateWithRetry<T>(
  schema: z.ZodType<T>,
  initialOutput: unknown,
  retryFn: (errorMessage: string) => Promise<unknown>,
  maxRetries: number = 3,
): Promise<T> {
  let currentOutput = initialOutput;
  let lastError = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // If the output is a string, try to parse it as JSON first
    let parsed = currentOutput;
    if (typeof currentOutput === "string") {
      try {
        parsed = JSON.parse(currentOutput);
      } catch {
        lastError = `Attempt ${attempt + 1}: Output is not valid JSON. Raw output: "${String(currentOutput).slice(0, 200)}..."`;
        if (attempt < maxRetries) {
          currentOutput = await retryFn(lastError);
          continue;
        }
        break;
      }
    }

    // Validate against the schema
    const result = validateOutput(schema, parsed);

    if (result.success && result.data !== undefined) {
      return result.data;
    }

    lastError = result.error ?? "Unknown validation error";

    // Retry if we haven't exhausted attempts
    if (attempt < maxRetries) {
      currentOutput = await retryFn(lastError);
    }
  }

  throw new Error(
    `Output validation failed after ${maxRetries + 1} attempts. ` +
      `Last error:\n${lastError}`,
  );
}

// ---------------------------------------------------------------------------
// JSON extraction utility
// ---------------------------------------------------------------------------

/**
 * Extract JSON from a model response that may contain markdown code fences
 * or surrounding text.
 *
 * Models often wrap JSON in ```json ... ``` blocks or include preamble text.
 * This utility strips that away to get the raw JSON.
 *
 * @exam Domain 4.3 — In practice, models rarely return bare JSON. They
 * tend to add explanatory text around it. This extractor handles the
 * common formats without brittle regex.
 *
 * @param text - The raw model output text.
 * @returns The extracted JSON string, or the original text if no JSON block is found.
 */
export function extractJsonFromText(text: string): string {
  // Try to find JSON in a code fence
  const codeFenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeFenceMatch?.[1]) {
    return codeFenceMatch[1].trim();
  }

  // Try to find a JSON object or array directly
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch?.[1]) {
    return jsonMatch[1].trim();
  }

  // Return as-is — let the caller handle parse errors
  return text.trim();
}
