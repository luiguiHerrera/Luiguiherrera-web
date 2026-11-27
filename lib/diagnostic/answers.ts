import { diagnosticQuestions, getQuestionsForMode } from "./questions";
import type { DiagnosticAnswers, DiagnosticMode, DiagnosticQuestion } from "./types";

export function isAnswered(question: DiagnosticQuestion, answer: unknown): boolean {
  const ids = new Set(question.options.map((option) => option.id));
  if (!question.multi) return typeof answer === "string" && ids.has(answer);
  return Array.isArray(answer) && answer.length > 0 && new Set(answer).size === answer.length &&
    answer.every((id) => typeof id === "string" && ids.has(id)) &&
    !(answer.includes("none") && answer.length > 1);
}

export function validateDiagnosticAnswers(answers: unknown, mode: DiagnosticMode) {
  if ((mode !== "quick" && mode !== "complete") || !answers || typeof answers !== "object" || Array.isArray(answers)) {
    return { valid: false, issues: ["questionnaire"], answers: {} as DiagnosticAnswers };
  }
  const input = answers as DiagnosticAnswers;
  const known = new Set(diagnosticQuestions.map((question) => question.id));
  const issues = Object.keys(input).filter((id) => !known.has(id));
  const clean: DiagnosticAnswers = {};
  for (const question of getQuestionsForMode(mode, input)) {
    const value = Object.hasOwn(input, question.id) ? input[question.id] : undefined;
    if (!isAnswered(question, value)) issues.push(question.id);
    else clean[question.id] = Array.isArray(value) ? [...value] : value!;
  }
  return { valid: issues.length === 0, issues, answers: clean };
}

/** Keep only active, valid responses after changing a product or an earlier answer. */
export function pruneDiagnosticAnswers(answers: DiagnosticAnswers, mode: DiagnosticMode): DiagnosticAnswers {
  return Object.fromEntries(getQuestionsForMode(mode, answers)
    .filter((question) => isAnswered(question, answers[question.id]))
    .map((question) => [question.id, answers[question.id]]));
}

export function diagnosticProgress(answers: DiagnosticAnswers, mode: DiagnosticMode) {
  const questions = getQuestionsForMode(mode, answers);
  const answered = questions.filter((question) => isAnswered(question, answers[question.id])).length;
  return { answered, total: questions.length, percent: answered / questions.length * 100 };
}

export function updateDiagnosticAnswer(answers: DiagnosticAnswers, question: DiagnosticQuestion, value: string, mode: DiagnosticMode) {
  if (!question.options.some((option) => option.id === value)) return answers;
  let next: string | string[] = value;
  if (question.multi) {
    const current = Array.isArray(answers[question.id]) ? answers[question.id] as string[] : [];
    next = value === "none" ? (current.includes("none") ? [] : ["none"]) :
      current.includes(value) ? current.filter((id) => id !== value && id !== "none") : [...current.filter((id) => id !== "none"), value];
  }
  return pruneDiagnosticAnswers({ ...answers, [question.id]: next }, mode);
}

export class DiagnosticValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super("The diagnostic requires valid answers to every applicable question.");
    this.name = "DiagnosticValidationError";
    this.issues = issues;
  }
}
