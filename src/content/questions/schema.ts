import { z } from 'zod';

export const DifficultySchema = z.enum(['foundation', 'intermediate', 'advanced']);

export const QuestionSchema = z.object({
  id: z.string().regex(/^d\d+-q\d+$/, 'ID must follow pattern: d{domain}-q{number}'),
  domain: z.number().int().min(1).max(6),
  taskStatement: z.string().regex(/^\d+\.\d+$/, 'Task statement must follow pattern: X.Y'),
  difficulty: DifficultySchema,
  scenario: z.string().min(50, 'Scenario must be at least 50 characters'),
  question: z.string().min(10, 'Question must be at least 10 characters'),
  options: z.object({
    A: z.string().min(5),
    B: z.string().min(5),
    C: z.string().min(5),
    D: z.string().min(5),
  }),
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().min(30, 'Explanation must be at least 30 characters'),
  examTrap: z.string().min(10, 'Exam trap must be at least 10 characters'),
  conceptsTested: z.array(z.string()).min(1, 'Must test at least one concept'),
});

export const QuestionBankSchema = z.array(QuestionSchema).min(1);

export type Difficulty = z.infer<typeof DifficultySchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionBank = z.infer<typeof QuestionBankSchema>;
