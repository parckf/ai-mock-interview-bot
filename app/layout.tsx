import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Morrow — AI Mock Interview', description: 'Practice with a role-specific AI interviewer and get clear, actionable feedback.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
