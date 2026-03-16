# Quiz

Run a practice quiz for the Claude Certified Architect exam.

## Usage

```
/quiz                — Random questions across all domains
/quiz 1              — Domain 1: Agentic Architecture & Orchestration
/quiz 1.3            — Task Statement 1.3: Subagent Invocation
/quiz 2              — Domain 2: Tool Design & MCP Integration
/quiz 3              — Domain 3: Claude Code Configuration & Workflows
/quiz 4              — Domain 4: Prompt Engineering & Structured Output
/quiz 5              — Domain 5: Context Management & Reliability
```

## What It Does

1. Loads questions from `src/content/questions/` JSON files
2. Filters by the domain or task statement you specify (if any)
3. Presents each question with a scenario, four options, and an explanation
4. Tracks your score and shows a breakdown by domain at the end

## Running Directly

You can also run the quiz from the terminal:

```bash
npx tsx src/cli/index.ts quiz                    # All domains
npx tsx src/cli/index.ts quiz -d 1               # Domain 1 only
npx tsx src/cli/index.ts quiz -t 1.3             # Task Statement 1.3 only
```

## Domains & Task Statements

| Domain | Name | Key Task Statements |
|--------|------|---------------------|
| 1 | Agentic Architecture & Orchestration | 1.1 Agentic Loops, 1.2 Multi-Agent Orchestration, 1.3 Subagent Invocation, 1.4 Workflow Enforcement, 1.5 Agent SDK Hooks, 1.6 Task Decomposition, 1.7 Session State |
| 2 | Tool Design & MCP Integration | 2.1 Tool Descriptions as Selection Mechanism, 2.2 Structured Error Responses, 2.3 Tool Choice Modes, 2.4 MCP Resources, Tools & Prompts, 2.5 Built-in vs Custom Tools |
| 3 | Claude Code Configuration & Workflows | 3.1 CLAUDE.md Hierarchy, 3.2 Slash Commands & Skills, 3.3 Path Rules with Glob Patterns, 3.4 Plan Mode Workflow, 3.5 Iterative Refinement, 3.6 CI/CD Integration |
| 4 | Prompt Engineering & Structured Output | 4.1 Explicit Criteria & Rubrics, 4.2 Few-Shot Examples, 4.3 Tool Use Schemas & Validation, 4.4 Validation-Retry Pattern, 4.5 Batch API, 4.6 Multi-Instance Review & Aggregation |
| 5 | Context Management & Reliability | 5.1 Context Preservation & Summarisation, 5.2 Escalation Patterns & Confidence, 5.3 Error Propagation in Multi-Agent Systems, 5.4 Codebase Exploration Strategies, 5.5 Human-in-the-Loop & Approval Gates, 5.6 Provenance & Audit Trails |
