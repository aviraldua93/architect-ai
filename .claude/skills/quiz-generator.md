---
description: Generate a focused quiz on a specific CCA-F exam domain
context: fork
allowed-tools: [Read, Grep]
argument-hint: "Which domain number (1-5)?"
---

# Quiz Generator Skill

Generate a focused quiz session for the Claude Certified Architect — Foundations (CCA-F) exam.

## Instructions

1. Read the user's requested domain number (1–5).
2. Use `Read` to load the question bank from `src/content/questions/` for that domain.
3. Use `Grep` to find questions matching the requested difficulty (if specified).
4. Select 5 questions at random (avoid duplicates from previous sessions if IDs are provided).
5. Present each question in the standard format:

   **Domain {N}: {Name} | Task {X.Y} | {Difficulty}**

   _{Scenario}_

   **Question:** {text}

   - **A)** …
   - **B)** …
   - **C)** …
   - **D)** …

6. Wait for the user's answer before revealing the correct option and explanation.
7. After all questions, provide a score summary and suggest weak areas.

## SKILL.md Feature Notes (CCA-F Exam Reference)

- **`description`**: One-line summary shown in `/skill` listings. Must be clear enough for Claude to match user intent.
- **`context: fork`**: This skill runs in a forked context — it gets its own conversation history, isolated from the main session. This prevents quiz state from leaking into other interactions.
- **`allowed-tools`**: Restricts which tools this skill can invoke. Only `Read` and `Grep` are needed — no file writes, no web access.
- **`argument-hint`**: Displayed to the user when they invoke the skill, prompting them for the required input.
