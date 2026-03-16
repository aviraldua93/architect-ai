# Study Mode

Launch study mode for deep learning with explanations.

## Usage

```
/study              — Random questions with full explanations
/study 1            — Domain 1: Agentic Architecture & Orchestration
/study 1.3          — Task 1.3: Subagent Invocation
```

## What It Does

1. Presents one question at a time with scenario context
2. After answering, reveals the correct answer with full explanation
3. Shows exam traps and concepts tested
4. Tracks mastery per domain and task statement

## Running Directly

```bash
npx tsx src/cli/index.ts study
npx tsx src/cli/index.ts study -d 1
```
