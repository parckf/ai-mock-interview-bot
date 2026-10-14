import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { colors: { forest: '#163b2e', sage: '#dce9de', paper: '#f7f8f3', lime: '#c9f27b' }, fontFamily: { sans: ['Arial', 'sans-serif'] } } }, plugins: [] };
export default config;
