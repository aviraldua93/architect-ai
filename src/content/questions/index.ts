import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { QuestionBankSchema, type Question, type Difficulty } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cachedQuestions: Question[] | null = null;

function loadAllQuestions(): Question[] {
  if (cachedQuestions) return cachedQuestions;

  const files = [
    'domain-1-agentic-architecture.json',
  ];

  const allQuestions: Question[] = [];

  for (const file of files) {
    const filePath = join(__dirname, file);
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    const parsed = QuestionBankSchema.parse(raw);
    allQuestions.push(...parsed);
  }

  cachedQuestions = allQuestions;
  return allQuestions;
}

export function getQuestions(
  domain?: number,
  taskStatement?: string,
  difficulty?: string,
): Question[] {
  let questions = loadAllQuestions();

  if (domain !== undefined) {
    questions = questions.filter((q) => q.domain === domain);
  }

  if (taskStatement !== undefined) {
    questions = questions.filter((q) => q.taskStatement === taskStatement);
  }

  if (difficulty !== undefined) {
    questions = questions.filter((q) => q.difficulty === (difficulty as Difficulty));
  }

  return questions;
}

export { type Question, type Difficulty } from './schema.js';
