export const score = (answers: number[], key: number[]) => key.reduce((n, correct, i) => n + (answers[i] === correct ? 1 : 0), 0);
