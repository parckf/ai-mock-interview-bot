export const ROLES = ['Software Developer', 'Data Analyst', 'AI/ML Engineer', 'Web Developer'] as const;
export type Role = (typeof ROLES)[number];
export type Turn = { question: string; answer: string; score?: number; feedback?: string };
export type InterviewReport = { score: number; summary: string; strengths: string[]; improvements: string[]; emailed: boolean };
