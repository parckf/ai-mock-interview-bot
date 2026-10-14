'use client';

import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, AudioLines, BadgeCheck, BrainCircuit, BriefcaseBusiness, Check, ChevronRight, CircleHelp, Code2, Database, Mic, MicOff, Sparkles, Volume2 } from 'lucide-react';
import { ROLES, type InterviewReport, type Role, type Turn } from '@/lib/types';

type ScoredTurn = Turn & { strengths: string[]; improvements: string[] };
type SpeechRecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognitionLike = { lang: string; interimResults: boolean; onresult: ((event: SpeechRecognitionEvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start(): void; stop(): void };
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
const roleDescriptions: Record<Role, string> = { 'Software Developer': 'Engineering & systems', 'Data Analyst': 'Insights & decisions', 'AI/ML Engineer': 'Models & intelligence', 'Web Developer': 'Modern web craft' };
const roleIcons = [Code2, Database, BrainCircuit, AudioLines];

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data as T;
}

export default function Home() {
  const [step, setStep] = useState<'setup' | 'interview' | 'report'>('setup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consented, setConsented] = useState(false);
  const [role, setRole] = useState<Role>('Software Developer');
  const [turns, setTurns] = useState<ScoredTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [greeting, setGreeting] = useState('');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<ScoredTurn | null>(null);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioRequestRef = useRef(0);

  function stopQuestionAudio() {
    audioRequestRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }

  async function speakQuestion(text: string) {
    stopQuestionAudio();
    const requestId = audioRequestRef.current;
    try {
      const voice = await post<{ audioUrl: string | null }>('/api/voice', { text: greeting ? `${greeting} ${text}` : text });
      if (requestId !== audioRequestRef.current || !voice.audioUrl) return;
      const audio = new Audio(voice.audioUrl);
      audioRef.current = audio;
      audio.onended = () => { if (audioRef.current === audio) audioRef.current = null; };
      await audio.play();
    } catch { /* Text question remains available when Murf is not configured. */ }
  }

  async function getQuestion(history: ScoredTurn[]) {
    stopQuestionAudio();
    setQuestion('');
    setGreeting('');
    const requestId = audioRequestRef.current;
    const data = await post<{ question: string; greeting: string }>('/api/question', { role, history, name });
    if (requestId !== audioRequestRef.current) return;
    try {
      const voice = await post<{ audioUrl: string | null }>('/api/voice', { text: `${data.greeting ? `${data.greeting} ` : ''}${data.question}` });
      if (requestId !== audioRequestRef.current) return;
      setQuestion(data.question);
      setGreeting(data.greeting || '');
      if (!voice.audioUrl) return;
      const audio = new Audio(voice.audioUrl);
      audioRef.current = audio;
      audio.onended = () => { if (audioRef.current === audio) audioRef.current = null; };
      await audio.play();
    } catch {
      if (requestId === audioRequestRef.current) { setQuestion(data.question); setGreeting(data.greeting || ''); }
    }
  }

  async function startInterview() {
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Add your name and a valid email address to get started.'); return; }
    if (!consented) { setError('Please confirm you understand how your interview answers will be used.'); return; }
    setBusy(true); setError('');
    try { setStep('interview'); await getQuestion([]); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not start the interview.'); setStep('setup'); }
    finally { setBusy(false); }
  }

  async function submitAnswer() {
    if (!answer.trim() || busy) return;
    stopQuestionAudio();
    setBusy(true); setError('');
    try {
      const evaluation = await post<{ score: number; feedback: string; strengths: string[]; improvements: string[] }>('/api/evaluate', { role, question, answer: answer.trim() });
      const scored: ScoredTurn = { question, answer: answer.trim(), ...evaluation };
      setTurns(current => [...current, scored]); setFeedback(scored); setAnswer('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not evaluate this answer.'); }
    finally { setBusy(false); }
  }

  async function continueInterview() {
    if (turns.length >= 5) {
      setBusy(true); setError('');
      try { const result = await post<InterviewReport>('/api/report', { name, email, role, turns }); setReport(result); setStep('report'); }
      catch (e) { setError(e instanceof Error ? e.message : 'Could not build your report.'); }
      finally { setBusy(false); }
      return;
    }
    setBusy(true); setError(''); setFeedback(null); stopQuestionAudio();
    try { await getQuestion(turns); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load the next question.'); }
    finally { setBusy(false); }
  }

  function toggleMic() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) { setError('Speech input is not supported in this browser. Type your answer instead.'); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const recognition = new Recognition(); recognition.lang = 'en-US'; recognition.interimResults = true;
    recognitionRef.current = recognition;
    recognition.onresult = event => setAnswer(Array.from(event.results).map(result => result[0].transcript).join(''));
    recognition.onerror = () => { setListening(false); recognitionRef.current = null; setError('Microphone input stopped. You can type your answer instead.'); };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognition.start(); setListening(true); setError('');
  }

  return <main className="min-h-screen grain">
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
      <a href="#top" className="flex items-center gap-2.5 font-bold tracking-tight"><span className="grid size-9 place-items-center rounded-xl bg-forest text-lime"><AudioLines size={19}/></span><span className="display text-xl">morrow<span className="text-forest">.</span></span></a>
      <div className="hidden items-center gap-2 text-xs font-medium text-stone-500 sm:flex"><span className="size-1.5 rounded-full bg-lime-500"/>A calmer way to get interview-ready</div>
      <span className="mono rounded-full border border-stone-200 bg-white/70 px-3 py-1.5 text-[10px] uppercase tracking-[.16em] text-stone-500">AI practice · Project 11</span>
    </nav>

    {step === 'setup' && <section id="top" className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-20 lg:px-10 lg:pb-28 lg:pt-14">
      <div className="fade-up">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1.5 text-xs text-stone-600"><Sparkles size={14} className="text-forest"/>A little practice changes everything</div>
        <h1 className="display max-w-2xl text-5xl font-semibold leading-[1.04] sm:text-6xl lg:text-[4.55rem]">Make room for your <span className="relative whitespace-nowrap">best answer.<svg className="absolute -bottom-2 left-0 -z-10 w-full" viewBox="0 0 340 14" fill="none"><path d="M3 10C73 3 231 1 337 8" stroke="#c9f27b" strokeWidth="8" strokeLinecap="round"/></svg></span></h1>
        <p className="mt-7 max-w-lg text-base leading-7 text-stone-600">A private, role-specific mock interview with thoughtful questions, useful feedback, and a report you can actually put to work.</p>
        <div className="mt-9 flex items-center gap-6 text-xs text-stone-500"><span className="flex items-center gap-2"><Check size={15} className="text-forest"/>5 tailored questions</span><span className="flex items-center gap-2"><Check size={15} className="text-forest"/>About 10 minutes</span></div>
        <div className="mt-14 hidden max-w-md grid-cols-3 gap-4 border-t border-stone-200 pt-5 md:grid"><div><p className="display text-2xl font-semibold">01</p><p className="mt-1 text-xs text-stone-500">Choose your role</p></div><div><p className="display text-2xl font-semibold">02</p><p className="mt-1 text-xs text-stone-500">Practice out loud</p></div><div><p className="display text-2xl font-semibold">03</p><p className="mt-1 text-xs text-stone-500">Leave with a plan</p></div></div>
      </div>

      <div className="fade-up rounded-[2rem] border border-stone-200/80 bg-white p-6 shadow-[0_24px_80px_-48px_rgba(23,37,30,.3)] sm:p-9" style={{animationDelay:'80ms'}}>
        {step === 'setup' ? <>
          <div className="mb-7 flex items-start justify-between"><div><p className="mono text-[10px] uppercase tracking-[.17em] text-stone-400">Your session starts here</p><h2 className="display mt-2 text-2xl font-semibold">Let’s get to know you.</h2></div><span className="grid size-10 place-items-center rounded-2xl bg-sage text-forest"><BriefcaseBusiness size={18}/></span></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium text-stone-600">Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Jamie Chen" className="mt-2 w-full rounded-xl border border-stone-200 bg-[#fbfcf9] px-4 py-3.5 text-sm outline-none transition focus:border-forest"/></label><label className="text-xs font-medium text-stone-600">Email for your report<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="jamie@email.com" className="mt-2 w-full rounded-xl border border-stone-200 bg-[#fbfcf9] px-4 py-3.5 text-sm outline-none transition focus:border-forest"/></label></div>
          <div className="mb-3 mt-7 flex items-end justify-between"><div><p className="text-xs font-medium text-stone-600">What role are you preparing for?</p><p className="mt-1 text-[11px] text-stone-400">Pick the closest fit. We’ll tailor the questions.</p></div><span className="mono text-[10px] text-stone-400">01 / 01</span></div>
          <div className="grid grid-cols-2 gap-2.5">{ROLES.map((item,index)=>{const Icon=roleIcons[index];return <button type="button" onClick={()=>setRole(item)} key={item} className={`role-card rounded-2xl border p-3.5 text-left ${role===item?'selected bg-sage/50':'border-stone-200 bg-white hover:border-stone-300'}`}><span className={`mb-4 grid size-9 place-items-center rounded-xl ${role===item?'bg-forest text-lime':'bg-stone-100 text-stone-600'}`}><Icon size={17}/></span><span className="block text-[12px] font-semibold">{item}</span><span className="mt-1 block text-[10px] text-stone-500">{roleDescriptions[item]}</span></button>})}</div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-[#fbfcf9] p-3.5 text-[11px] leading-5 text-stone-600"><input type="checkbox" checked={consented} onChange={e=>setConsented(e.target.checked)} className="mt-1 accent-[#163b2e]"/><span>I understand my answers will be analyzed and included in a performance report emailed to me. If interview history is enabled, the report and transcript may also be saved in Supabase.</span></label>
          {error&&<p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>}
          <button onClick={startInterview} disabled={busy} className="mt-6 flex w-full items-center justify-between rounded-xl bg-forest px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#204c3c] disabled:opacity-60"><span>{busy?'Preparing your first question…':'Start your mock interview'}</span><span className="grid size-7 place-items-center rounded-full bg-lime text-forest"><ArrowRight size={16}/></span></button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-stone-400"><CircleHelp size={12}/>Your answers stay private to this practice session.</p>
        </> : null}
      </div>
    </section>}

    {step === 'interview' && <section className="mx-auto max-w-4xl px-5 pb-20 pt-8 sm:px-8 sm:pt-14">
      <button onClick={()=>{stopQuestionAudio();setStep('setup');setError('');}} className="mb-7 flex items-center gap-2 text-xs text-stone-500 hover:text-forest"><ArrowLeft size={14}/>Back to setup</button>
      <div className="mb-5 flex items-center justify-between"><div><p className="mono text-[10px] uppercase tracking-[.16em] text-stone-400">{role} · practice session</p><h1 className="display mt-1 text-3xl font-semibold">Take a breath. You’ve got this.</h1></div><span className="rounded-full bg-sage px-3 py-1.5 text-xs font-medium text-forest">{turns.length+1} of 5</span></div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-stone-200"><div className="h-full rounded-full bg-forest transition-all" style={{width:`${turns.length/5*100}%`}}/></div>
      <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-forest text-lime"><AudioLines size={20}/></span><div><p className="text-sm font-semibold">Your interviewer</p><p className="text-[11px] text-stone-400">{busy&&!feedback?'Preparing question and voice…':'A thoughtful conversation, one question at a time'}</p></div><button aria-label="Read question aloud" onClick={()=>{if(question)speakQuestion(question);}} disabled={!question} className="ml-auto rounded-full border border-stone-200 p-2.5 text-stone-500 hover:bg-stone-50 disabled:opacity-40"><Volume2 size={16}/></button></div>
        <div className="my-8 border-l-2 border-lime pl-5">{greeting&&<p className="mb-3 text-sm font-medium text-forest">{greeting}</p>}<p className="mono text-[10px] uppercase tracking-[.15em] text-stone-400">Question {turns.length+1}</p><p className="display mt-3 text-2xl font-medium leading-snug sm:text-3xl">{question||'Preparing your question…'}</p></div>
        {feedback&&<div className="mb-6 rounded-2xl border border-stone-200 bg-[#fbfcf9] p-5"><div className="flex items-center justify-between"><p className="text-sm font-semibold">A quick note on that answer</p><span className="rounded-full bg-sage px-3 py-1 text-xs font-semibold text-forest">{feedback.score}/10</span></div><p className="mt-2 text-sm leading-6 text-stone-600">{feedback.feedback}</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><p className="text-xs leading-5 text-stone-600"><b className="text-forest">What worked:</b> {feedback.strengths.join(' ')}</p><p className="text-xs leading-5 text-stone-600"><b className="text-forest">Try next:</b> {feedback.improvements.join(' ')}</p></div></div>}
        {!feedback&&<><label htmlFor="answer" className="mb-2 block text-xs font-medium text-stone-600">Your answer</label><textarea id="answer" value={answer} onChange={e=>setAnswer(e.target.value)} rows={6} placeholder="Take your time. You can speak or type your answer…" className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fbfcf9] p-4 text-sm leading-6 outline-none focus:border-forest"/><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><button onClick={toggleMic} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-medium ${listening?'border-red-200 bg-red-50 text-red-700':'border-stone-200 text-stone-600 hover:bg-stone-50'}`}>{listening?<MicOff size={15}/>:<Mic size={15} />}{listening?'Stop speaking':'Answer with voice'}</button><span className="text-[10px] text-stone-400">Mic input uses your browser’s speech recognition</span></div></>}
        {error&&<p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end">{feedback?<button onClick={continueInterview} disabled={busy} className="flex items-center gap-2 rounded-xl bg-forest px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-60">{busy?'Building your report…':turns.length===5?'See your report':'Next question'}<ChevronRight size={16}/></button>:<button onClick={submitAnswer} disabled={busy||!answer.trim()||!question} className="flex items-center gap-2 rounded-xl bg-forest px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-50">{busy?'Listening to your answer…':'Share this answer'}<ArrowRight size={16}/></button>}</div>
      </div>
      <p className="mt-5 text-center text-[11px] text-stone-400">Your session is a space to learn. There are no wrong turns here.</p>
    </section>}

    {step === 'report' && report && <section className="mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-8 sm:pt-16"><div className="rounded-[2rem] border border-stone-200 bg-white p-7 shadow-sm sm:p-11"><div className="flex items-center gap-2 text-xs font-medium text-forest"><BadgeCheck size={16}/>SESSION COMPLETE</div><h1 className="display mt-3 text-4xl font-semibold">That was good work, {name.split(' ')[0]}.</h1><p className="mt-3 max-w-2xl leading-7 text-stone-600">{report.summary}</p><div className="my-8 grid gap-5 rounded-3xl bg-forest p-6 text-white sm:grid-cols-[auto_1fr] sm:items-center sm:p-8"><div className="display text-6xl font-semibold text-lime">{report.score}<span className="text-2xl text-white/60">/10</span></div><div><p className="text-sm font-semibold">Your overall interview score</p><p className="mt-1 text-xs leading-5 text-white/65">A reflection of relevance, clarity, role knowledge, and reasoning across five answers.</p></div></div><div className="grid gap-8 sm:grid-cols-2"><div><h2 className="display text-xl font-semibold">What you did well</h2><ul className="mt-4 space-y-3">{report.strengths.map((item,i)=><li key={i} className="flex gap-2.5 text-sm leading-6 text-stone-600"><Check size={16} className="mt-1 shrink-0 text-forest"/>{item}</li>)}</ul></div><div><h2 className="display text-xl font-semibold">Your next practice</h2><ul className="mt-4 space-y-3">{report.improvements.map((item,i)=><li key={i} className="flex gap-2.5 text-sm leading-6 text-stone-600"><ArrowRight size={16} className="mt-1 shrink-0 text-forest"/>{item}</li>)}</ul></div></div><div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-6"><p className="text-xs text-stone-500">{report.emailed?`A copy was sent to ${email}.`:report.emailError||'Email was not accepted for delivery. Check your Resend settings.'}</p><button onClick={()=>window.print()} className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-semibold hover:bg-stone-50">Save report as PDF</button></div></div><button onClick={()=>window.location.reload()} className="mx-auto mt-5 flex items-center gap-2 text-xs text-stone-500 hover:text-forest">Practice another role<ArrowRight size={14}/></button></section>}

    <footer className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 border-t border-stone-200 px-6 py-5 text-[10px] text-stone-500 sm:flex-row sm:items-center lg:px-10"><span>morrow. · A practice space for what comes next.</span><span>Contact: <a className="underline underline-offset-2" href="mailto:arjunsingha.tech@gmail.com">arjunsingha.tech@gmail.com</a> · <a className="underline underline-offset-2" href="tel:+918264627200">8264627200</a></span><span>© 2026 AI Mock Interview Bot. All rights reserved.</span></footer>
  </main>;
}

