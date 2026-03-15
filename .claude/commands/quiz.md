# Quiz

Run a practice quiz for the Claude Certified Architect exam.

## Usage

```
/quiz                — Random questions across all domains
/quiz 1              — Domain 1: Agentic Architecture
/quiz 1.1            — Task Statement 1.1: Design Agentic Loops
/quiz 2              — Domain 2: Tool Design & MCP Integration
/quiz 3              — Domain 3: CLI & Commands
/quiz 4              — Domain 4: Prompt Engineering
/quiz 5              — Domain 5: Context Management
```

## What It Does

1. Loads questions from `src/content/questions/` JSON files
2. Filters by the domain or task statement you specify (if any)
3. Presents each question with a scenario, four options, and an explanation
4. Tracks your score and shows a breakdown by domain at the end

## Running Directly

You can also run the quiz from the terminal:

```bash
bun run quiz                    # All domains
bun run src/cli/index.ts quiz -d 1    # Domain 1 only
bun run src/cli/index.ts quiz -t 1.1  # Task Statement 1.1 only
```

## Domains & Task Statements

| Domain | Name | Key Task Statements |
|--------|------|-------------------|
| 1 | Agentic Architecture | 1.1 Agentic Loops, 1.2 Multi-Agent Orchestration |
| 2 | Tool Design & MCP | 2.1 Tool Interfaces, 2.2 MCP Protocol |
| 3 | CLI & Commands | 3.1 Command Design, 3.2 Interactive Prompts |
| 4 | Prompt Engineering | 4.1 Prompt Templates, 4.2 Chain-of-Thought |
| 5 | Context Management | 5.1 Context Windows, 5.2 Token Optimisation |
