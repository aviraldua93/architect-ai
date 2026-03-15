# Content: Pre-Generated Curriculum

## Overview
Contains pre-loaded content for the AI study platform:
- Question banks for AWS certification
- Detailed explanations of concepts
- Practice scenarios and case studies

## Subdirectories

### questions/
AWS certification question banks in JSON format.

**Schema:**
```json
{
  "id": "q-001",
  "domain": "Domain 1",
  "difficulty": "easy|medium|hard",
  "question": "Question text here...",
  "options": ["A", "B", "C", "D"],
  "correct": "A",
  "rationale": "Explanation of correct answer...",
  "tags": ["agent", "orchestration"]
}
```

### explanations/
Detailed concept explanations and tutorials.

**Format:** Markdown files with code examples

### scenarios/
Practical learning scenarios and case studies.

**Format:** Markdown with interactive components

## TODO
- [ ] Load initial AWS question bank
- [ ] Create 50+ explanations
- [ ] Design 10+ practice scenarios
- [ ] Implement spaced repetition algorithm
- [ ] Add difficulty progression
