# Demo Day Checklist — ArchitectAI Web UI

> Per playbook: "If the Owner can't experience it in a browser, it's not a demo."

## Pre-Demo Verification (Sprint Lead signs off)

- [ ] `npm run build` passes in web/ with zero errors
- [ ] `npm run dev` starts without errors on port 3000
- [ ] All 5 pages load (/, /quiz, /study, /exam, /dashboard)
- [ ] Quiz flow works end-to-end (select domain → answer questions → see score)
- [ ] Timer works in exam mode
- [ ] Questions load from all 5 domains
- [ ] Scores calculate correctly
- [ ] Dark theme renders properly
- [ ] No console errors in browser

## Startup Sequence

```bash
# 1. Navigate to web app
cd C:\Users\aviraldua\OneDrive - Microsoft\Desktop\Git-Personal\architect-ai\web

# 2. Install dependencies (if needed)
npm install

# 3. Start dev server
npm run dev

# 4. Open browser
# Navigate to: http://localhost:3000
```

## What the Owner Sees

### Home Page (http://localhost:3000)
- Hero: "Master the Claude Certified Architect Exam"
- Three cards: Practice Quiz, Study Mode, Mock Exam
- Stats: 105 questions across 5 domains
- CTA: "Start Practising" button

### Quiz Page (http://localhost:3000/quiz)
- Domain selector (All + 5 individual domains)
- Question count selector (5, 10, 20, All)
- Difficulty filter
- Start Quiz → questions appear → answer → feedback → score summary

### Study Page (http://localhost:3000/study)
- Domain filter
- Question with scenario
- Answer → reveal explanation + exam trap

### Exam Page (http://localhost:3000/exam)
- 30-question timed exam
- Timer counting down
- Question navigator sidebar
- Submit → full score breakdown

### Dashboard (http://localhost:3000/dashboard)
- Overall stats
- Domain mastery bars
- Weak areas
- Recent sessions

## Demo Script (what the CEO says/does)

1. "This is ArchitectAI — our web-based study tool for the Claude Certified Architect exam."
2. Open http://localhost:3000 — show the landing page
3. Click "Start Practising" → show quiz configuration
4. Select "Domain 1: Agentic Architecture" → Start Quiz with 5 questions
5. Answer 2-3 questions, showing the feedback mechanism
6. Skip to results → show domain breakdown and score
7. Navigate to Study mode → show an explanation
8. Navigate to Exam mode → show the timer and question navigator
9. Navigate to Dashboard → show progress tracking
10. "105 questions, 5 domains, 30 task statements. All running locally in the browser."

## Sign-Off

| Role | Name | Signed Off | Date |
|------|------|-----------|------|
| Sprint Lead | Raj Mehta | [ ] | |
| VP Quality | Catherine Park | [ ] | |
| QA Lead | James Okonkwo | [ ] | |
| CEO | Priya Sharma | [ ] | |
