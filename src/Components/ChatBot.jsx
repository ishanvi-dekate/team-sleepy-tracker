import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, getDocs, deleteDoc, updateDoc, setDoc,
  doc, query, orderBy, limit, getDoc,
} from 'firebase/firestore';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './ChatBot.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// ── AI Modes ─────────────────────────────────────────────────────────────────
const AI_MODES = {
  tutor: {
    label: 'Tutor',
    description: 'Guides you to find answers yourself — never gives them directly.',
    icon: '🎓',
    prompt: `You are operating in TUTOR MODE — a Socratic AI tutor for high school students.
CORE RULE: NEVER give the final answer directly. Your job is to make the student think.
- When they ask "what's the answer?" — refuse politely and ask a guiding question instead.
- Break problems into small steps. Ask one question at a time.
- When they share work, identify exactly where their thinking went sideways and ask a question that exposes it.
- Praise good reasoning, not just correct answers.
- If they're truly stuck after multiple hints, give the next single step — never the full solution.
- For writing: ask what they're trying to say, point out unclear sentences, suggest they revise, don't rewrite for them.
- Use the student's profile (their courses, goals, stressors) to make examples relevant.`
  },
  quick: {
    label: 'Quick Help',
    description: 'Gives direct answers with explanations. Use when you need to move fast.',
    icon: '⚡',
    prompt: `You are operating in QUICK HELP MODE.
- Give the student the answer or solution directly, then explain the reasoning step by step.
- Be concise. No filler. Lead with the answer.
- For writing: you can suggest specific edits or rephrasing.
- Still teach — explain WHY, not just WHAT.`
  },
  writing: {
    label: 'Writing Coach',
    description: 'Gives feedback on essays without writing them for you.',
    icon: '✍️',
    prompt: `You are operating in WRITING COACH MODE.
- NEVER rewrite the student's work. Give feedback only.
- Identify thesis strength, argument structure, evidence quality, transitions, voice.
- Quote a sentence, name what's not working, ask the student how they might fix it.
- Praise specific moves that work. Be concrete, not generic ("this is good").
- For grammar/style: point out the type of issue and one example, let them find the rest.`
  },
  motivator: {
    label: 'Motivator',
    description: 'Encouraging and brief. For when you need a push.',
    icon: '💪',
    prompt: `You are operating in MOTIVATOR MODE.
- Be warm, brief, encouraging.
- Acknowledge how the student is feeling before giving advice.
- Use the student's actual goals and progress (from profile) to make encouragement specific.
- Suggest one small concrete next step, not a 10-point plan.
- No toxic positivity. Real, grounded support.`
  },
};

// ── PDF text extraction ──────────────────────────────────────────────────────
async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  const maxPages = Math.min(pdf.numPages, 30); // Cap at 30 pages to avoid token blowout
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `\n\n--- Page ${i} ---\n${pageText}`;
  }
  if (pdf.numPages > maxPages) {
    fullText += `\n\n[Note: PDF has ${pdf.numPages} pages, only first ${maxPages} included.]`;
  }
  return fullText.trim();
}

// ── Image to base64 (with compression) ───────────────────────────────────────
async function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Compress large images so we don't blow past token limits
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── AI call (supports vision via content array) ──────────────────────────────
async function callAI(messages) {
  if (import.meta.env.DEV) {
    const res = await fetch('/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.text();
  }

  const token = import.meta.env.VITE_GITHUB_TOKEN;
  if (!token) throw new Error('Add VITE_GITHUB_TOKEN to .env.local to enable AI in production.');

  const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ model: 'gpt-4o', messages, max_tokens: 2000 }),
  });
  if (!res.ok) throw new Error(`GitHub Models ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ── Firestore tool execution ─────────────────────────────────────────────────
async function executeTool(name, args, user, setPage) {
  const todosRef = collection(db, 'users', user.uid, 'todos');

  if (name === 'list_todos') {
    const snap = await getDocs(todosRef);
    let todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (args.date)     todos = todos.filter(t => t.date === args.date);
    if (args.dateFrom) todos = todos.filter(t => t.date >= args.dateFrom);
    if (args.dateTo)   todos = todos.filter(t => t.date <= args.dateTo);
    todos.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.dueTime && b.dueTime) return a.dueTime < b.dueTime ? -1 : 1;
      if (a.dueTime) return -1;
      if (b.dueTime) return 1;
      return (a.createdAt ?? 0) - (b.createdAt ?? 0);
    });
    return todos.map(({ id, text, date, dueTime, done }) => ({ id, text, date, dueTime: dueTime ?? null, done }));
  }
  if (name === 'add_todo') {
    const ref = await addDoc(todosRef, {
      text: args.text, date: args.date, dueTime: args.dueTime ?? null,
      done: false, createdAt: Date.now(),
    });
    return { success: true, id: ref.id };
  }
  if (name === 'update_todo') {
    const patch = {};
    if (args.text    !== undefined) patch.text    = args.text;
    if (args.date    !== undefined) patch.date    = args.date;
    if (args.dueTime !== undefined) patch.dueTime = args.dueTime;
    if (args.done    !== undefined) patch.done    = args.done;
    await updateDoc(doc(db, 'users', user.uid, 'todos', args.id), patch);
    return { success: true };
  }
  if (name === 'delete_todo') {
    await deleteDoc(doc(db, 'users', user.uid, 'todos', args.id));
    return { success: true };
  }
  if (name === 'get_profile') {
    const snap = await getDoc(doc(db, 'users', user.uid));
    return snap.exists() ? snap.data() : {};
  }
  if (name === 'update_profile') {
    const allowed = ['username','bedtime','sleepHours','stress','distractions',
                     'extracurriculars','homeworkClass','courses','goal1','goal2','goal3'];
    const patch = {};
    for (const k of allowed) {
      if (args[k] !== undefined) patch[k] = args[k];
    }
    if (Object.keys(patch).length === 0) return { error: 'No valid profile fields provided.' };
    patch.updatedAt = new Date().toISOString();
    await setDoc(doc(db, 'users', user.uid), patch, { merge: true });
    return { success: true, updated: Object.keys(patch).filter(k => k !== 'updatedAt') };
  }
  if (name === 'get_notifications') {
    const snap = await getDoc(doc(db, 'users', user.uid, 'settings', 'notifications'));
    return snap.exists() ? snap.data() : { emailReminders: false, weeklyDigest: false, taskDeadlines: false };
  }
  if (name === 'update_notifications') {
    const patch = {};
    if (args.emailReminders !== undefined) patch.emailReminders = !!args.emailReminders;
    if (args.weeklyDigest   !== undefined) patch.weeklyDigest   = !!args.weeklyDigest;
    if (args.taskDeadlines  !== undefined) patch.taskDeadlines  = !!args.taskDeadlines;
    if (Object.keys(patch).length === 0) return { error: 'No valid notification fields provided.' };
    await setDoc(doc(db, 'users', user.uid, 'settings', 'notifications'), patch, { merge: true });
    return { success: true };
  }
  if (name === 'get_focus_mode') {
    const snap = await getDoc(doc(db, 'users', user.uid, 'settings', 'focusMode'));
    const enabled = snap.exists() ? !!snap.data().enabled : false;
    return { enabled };
  }
  if (name === 'set_focus_mode') {
    const enabled = !!args.enabled;
    await setDoc(doc(db, 'users', user.uid, 'settings', 'focusMode'), { enabled });
    document.body.classList.toggle('focus-mode', enabled);
    return { success: true, enabled };
  }
  if (name === 'navigate_to') {
    const VALID = ['Home','Settings','Mental','Profile','Todo'];
    const page = args.page;
    if (!VALID.includes(page)) return { error: `Invalid page. Valid options: ${VALID.join(', ')}` };
    setPage(page);
    return { success: true, navigatedTo: page };
  }
  if (name === 'get_mental_checks') {
    const count = Math.min(args.count ?? 5, 20);
    const snap = await getDocs(
      query(collection(db, 'users', user.uid, 'mentalChecks'), orderBy('submittedAt', 'desc'), limit(count))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  return { error: 'Unknown tool' };
}

function actionLabel(name, args) {
  switch (name) {
    case 'list_todos':         return args?.date ? `Reading tasks for ${args.date}…` : 'Reading your tasks…';
    case 'add_todo':           return `Adding "${args?.text}" on ${args?.date}…`;
    case 'update_todo':        return 'Updating task…';
    case 'delete_todo':        return 'Removing task…';
    case 'get_profile':        return 'Reading your profile…';
    case 'update_profile':     return 'Updating your profile…';
    case 'get_notifications':  return 'Reading notification settings…';
    case 'update_notifications': return 'Updating notification settings…';
    case 'get_focus_mode':     return 'Checking focus mode…';
    case 'set_focus_mode':     return args?.enabled ? 'Turning on focus mode…' : 'Turning off focus mode…';
    case 'navigate_to':        return `Navigating to ${args?.page}…`;
    case 'get_mental_checks':  return 'Reading your mental check history…';
    default:                   return 'Working…';
  }
}

function parseToolCall(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (obj.tool) return obj;
  } catch {}
  return null;
}

function buildSystemPrompt(profile, customInstructions, mode) {
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const todayISO = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd   = new Date(now); weekEnd.setDate(now.getDate() + (6 - now.getDay()));
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const thisWeek = `${fmt(weekStart)} to ${fmt(weekEnd)}`;

  const profileSection = profile ? `
## About this student
- Username: ${profile.username || 'not set'}
- Usual bedtime: ${profile.bedtime || 'not set'}
- Average sleep: ${profile.sleepHours || 'not set'}
- Biggest stressor: ${profile.stress || 'not set'}
- External distractions: ${profile.distractions || 'none listed'}
- Extracurriculars: ${profile.extracurriculars || 'none listed'}
- Most homework-heavy class: ${profile.homeworkClass || 'not set'}
- Current courses: ${profile.courses || 'not set'}
- Goals: ${[profile.goal1, profile.goal2, profile.goal3].filter(Boolean).join('; ') || 'none set'}
` : '';

  const customSection = customInstructions?.trim() ? `
## Custom instructions from the student
${customInstructions.trim()}
` : '';

  const modeSection = AI_MODES[mode]?.prompt || AI_MODES.tutor.prompt;

  return `You are Eppy, an intelligent AI study coach and app assistant built into Efficient EPP, a student productivity app.
Today is ${today}. Today's date in ISO format: ${todayISO}. This week runs from ${thisWeek}.
${profileSection}${customSection}

# CURRENT MODE
${modeSection}

# Two halves of your job

## Half 1: App Manager
When the student asks about their schedule, todos, profile, settings, or to navigate the app, use the tools below.

## Half 2: Study Helper
When the student asks academic questions, shares a homework problem, uploads an image of a problem, or shares a document — switch into your current MODE (above) and help them learn. Reference their courses and goals to make examples relevant. If a PDF or image is in the conversation, treat its content as the student's material to discuss.

You decide which half applies based on the message. Both halves use the same conversational interface.

# Tools (only for app management — do NOT call tools for academic questions)

To call a tool, respond with ONLY a raw JSON object — no markdown, no explanation:

### Schedule / Todos
{"tool":"list_todos","args":{}}
{"tool":"list_todos","args":{"date":"YYYY-MM-DD"}}
{"tool":"list_todos","args":{"dateFrom":"YYYY-MM-DD","dateTo":"YYYY-MM-DD"}}
{"tool":"add_todo","args":{"text":"task name","date":"YYYY-MM-DD","dueTime":"HH:MM"}}
{"tool":"update_todo","args":{"id":"<id>","text":"...","date":"YYYY-MM-DD","dueTime":"HH:MM","done":true}}
{"tool":"delete_todo","args":{"id":"<id>"}}

### Profile
{"tool":"get_profile","args":{}}
{"tool":"update_profile","args":{"bedtime":"11pm","sleepHours":"7", ...}}

### Notifications & Focus Mode
{"tool":"get_notifications","args":{}}
{"tool":"update_notifications","args":{"emailReminders":true}}
{"tool":"get_focus_mode","args":{}}
{"tool":"set_focus_mode","args":{"enabled":true}}

### Navigation
{"tool":"navigate_to","args":{"page":"Home"}}
Valid pages: Home, Settings, Mental, Profile, Todo

### Mental Health History
{"tool":"get_mental_checks","args":{"count":5}}

# Rules
- For app tasks: always call list_todos before editing todos (need real IDs).
- For academic questions: respond directly in plain text following the current MODE — never call a tool.
- After tool calls done, reply in plain friendly text summarising what you did.
- When NOT calling a tool, respond in plain conversational text only — no JSON.
- Keep responses concise.`;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ChatBot({ user, setPage }) {
  const [open, setOpen]                   = useState(false);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [configOpen, setConfigOpen]       = useState(false);
  const [instrDraft, setInstrDraft]       = useState('');
  const [instrSaving, setInstrSaving]     = useState(false);
  const [instrSaved, setInstrSaved]       = useState(false);
  const [mode, setMode]                   = useState('tutor');
  const [attachments, setAttachments]     = useState([]); // [{type:'image'|'pdf', name, data, preview?}]
  const [processingFile, setProcessingFile] = useState(false);

  const historyRef                        = useRef([]);
  const profileRef                        = useRef(null);
  const instrRef                          = useRef('');
  const bottomRef                         = useRef(null);
  const fileInputRef                      = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!user) return;

    const profilePromise = getDoc(doc(db, 'users', user.uid))
      .then(snap => { if (snap.exists()) profileRef.current = snap.data(); })
      .catch(() => {});

    const settingsPromise = getDoc(doc(db, 'users', user.uid, 'settings', 'aiInstructions'))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          instrRef.current = data.text || '';
          setInstrDraft(data.text || '');
          if (data.mode && AI_MODES[data.mode]) setMode(data.mode);
        }
      })
      .catch(() => {});

    const historyPromise = getDocs(
      query(collection(db, 'users', user.uid, 'chatHistory'), orderBy('timestamp', 'asc'))
    ).then(snap => {
      const stored = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
      setMessages(stored.map((m, i) => ({ id: i, ...m })));
      historyRef.current = stored
        .filter(m => !m.isAction && (m.role === 'user' || m.role === 'assistant'))
        .map(m => ({ role: m.role, content: m.text }));
    }).catch(() => {});

    Promise.all([profilePromise, settingsPromise, historyPromise]).finally(() => setHistoryLoaded(true));
  }, [user]);

  const pushMessage = (role, text, isAction = false, extras = {}) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, text, isAction, ...extras }]);
  };

  const saveToFirestore = (role, text, isAction = false, extras = {}) =>
    addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
      role, text, isAction, timestamp: Date.now(), ...extras,
    }).catch(console.error);

  // Handle file picking
  const handleFilePick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow same file re-pick
    if (!files.length) return;

    setProcessingFile(true);
    try {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const data = await imageToBase64(file);
          setAttachments(prev => [...prev, { type: 'image', name: file.name, data, preview: data }]);
        } else if (file.type === 'application/pdf') {
          const text = await extractPdfText(file);
          setAttachments(prev => [...prev, { type: 'pdf', name: file.name, data: text }]);
        } else {
          alert(`"${file.name}" is not a supported file type. Use images or PDFs.`);
        }
      }
    } catch (err) {
      console.error('File processing error:', err);
      alert(`Could not read file: ${err.message}`);
    } finally {
      setProcessingFile(false);
    }
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const send = async () => {
    if ((!input.trim() && attachments.length === 0) || loading || !historyLoaded) return;
    const userText = input.trim();
    const currentAttachments = attachments;
    setInput('');
    setAttachments([]);
    setLoading(true);

    // Display user message with attachment chips
    const displayText = userText || (currentAttachments.length ? '(file attached)' : '');
    pushMessage('user', displayText, false, {
      attachments: currentAttachments.map(a => ({ type: a.type, name: a.name, preview: a.preview }))
    });
    saveToFirestore('user', displayText, false, {
      attachments: currentAttachments.map(a => ({ type: a.type, name: a.name }))
    });

    try {
      // Build user message content (multi-modal if there are images)
      const hasImage = currentAttachments.some(a => a.type === 'image');
      let userContent;

      if (hasImage) {
        // Multi-modal content array
        userContent = [];
        let textPart = userText || 'Please help me with this.';
        const pdfAttachments = currentAttachments.filter(a => a.type === 'pdf');
        if (pdfAttachments.length) {
          textPart += '\n\nAttached document content:\n' +
            pdfAttachments.map(p => `--- ${p.name} ---\n${p.data}`).join('\n\n');
        }
        userContent.push({ type: 'text', text: textPart });
        for (const att of currentAttachments.filter(a => a.type === 'image')) {
          userContent.push({ type: 'image_url', image_url: { url: att.data } });
        }
      } else if (currentAttachments.some(a => a.type === 'pdf')) {
        // PDF only — append text
        const pdfText = currentAttachments
          .filter(a => a.type === 'pdf')
          .map(p => `--- ${p.name} ---\n${p.data}`).join('\n\n');
        userContent = `${userText || 'Please help me with this document.'}\n\nAttached document content:\n${pdfText}`;
      } else {
        userContent = userText;
      }

      const messages = [
        { role: 'system', content: buildSystemPrompt(profileRef.current, instrRef.current, mode) },
        ...historyRef.current,
        { role: 'user', content: userContent },
      ];

      let finalText = '';
      let iterations = 0;

      while (iterations < 10) {
        iterations++;
        const text = await callAI(messages);
        const call = parseToolCall(text);

        if (call) {
          pushMessage('action', actionLabel(call.tool, call.args ?? {}), true);
          const result = await executeTool(call.tool, call.args ?? {}, user, setPage);
          messages.push({ role: 'assistant', content: text });
          messages.push({ role: 'user', content: `Tool result for ${call.tool}: ${JSON.stringify(result)}` });
        } else {
          finalText = text;
          break;
        }
      }

      if (!finalText) finalText = 'Done! Let me know if you need anything else.';

      pushMessage('assistant', finalText);
      saveToFirestore('assistant', finalText);

      // Save just the text version to in-memory history (vision images don't need to persist for context)
      historyRef.current = [
        ...historyRef.current,
        { role: 'user',      content: typeof userContent === 'string' ? userContent : userText },
        { role: 'assistant', content: finalText },
      ];
    } catch (err) {
      console.error('AI error:', err?.message ?? err);
      pushMessage('assistant', `Error: ${err?.message ?? 'Unknown error'}`);
    }

    setLoading(false);
  };

  const saveSettings = async () => {
    if (!user) return;
    setInstrSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'aiInstructions'),
        { text: instrDraft, mode });
      instrRef.current = instrDraft;
      setInstrSaved(true);
      setTimeout(() => setInstrSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setInstrSaving(false);
    }
  };

  // Switch mode without going through Save (instant)
  const selectMode = async (newMode) => {
    setMode(newMode);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'settings', 'aiInstructions'),
          { text: instrRef.current, mode: newMode }, { merge: true });
      } catch (e) { console.error(e); }
    }
  };

  const clearChat = async () => {
    if (!user || loading) return;
    const snap = await getDocs(collection(db, 'users', user.uid, 'chatHistory'));
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'users', user.uid, 'chatHistory', d.id))));
    setMessages([]);
    historyRef.current = [];
  };

  if (!user) return null;

  return (
    <>
      <button className="cb-fab" onClick={() => setOpen(o => !o)} aria-label="Toggle AI chat">
        {open ? (
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {open && (
        <div className="cb-panel">
          <div className="cb-header">
            <span className="cb-title">
              <span className="cb-status-dot" />
              Eppy
              <span className="cb-mode-badge">{AI_MODES[mode].icon} {AI_MODES[mode].label}</span>
            </span>
            <div className="cb-header-actions">
              <button
                className={`cb-clear ${configOpen ? 'cb-icon-active' : ''}`}
                onClick={() => setConfigOpen(o => !o)}
                title="Settings"
              >
                <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                  <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button
                className="cb-clear"
                onClick={clearChat}
                disabled={loading || messages.length === 0}
                title="Clear chat history"
              >
                <svg viewBox="0 0 24 24" fill="none" width="15" height="15">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="cb-close" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          {configOpen ? (
            <div className="cb-config">
              <div className="cb-config-section-title">MODE</div>
              <div className="cb-mode-grid">
                {Object.entries(AI_MODES).map(([key, m]) => (
                  <button
                    key={key}
                    className={`cb-mode-card ${mode === key ? 'cb-mode-card-selected' : ''}`}
                    onClick={() => selectMode(key)}
                  >
                    <div className="cb-mode-card-icon">{m.icon}</div>
                    <div className="cb-mode-card-label">{m.label}</div>
                    <div className="cb-mode-card-desc">{m.description}</div>
                  </button>
                ))}
              </div>

              <div className="cb-config-section-title">CUSTOM INSTRUCTIONS (OPTIONAL)</div>
              <p className="cb-config-desc">
                Anything Eppy should always remember about you?
              </p>
              <textarea
                className="cb-config-textarea"
                value={instrDraft}
                onChange={e => setInstrDraft(e.target.value)}
                placeholder={"e.g. I'm preparing for AP CSA exam.\nI prefer bilingual explanations.\nDon't sugarcoat feedback."}
                rows={5}
              />
              <div className="cb-config-actions">
                <button className="cb-config-cancel" onClick={() => { setInstrDraft(instrRef.current); setConfigOpen(false); }}>
                  Done
                </button>
                <button className="cb-config-save" onClick={saveSettings} disabled={instrSaving}>
                  {instrSaving ? 'Saving…' : 'Save instructions'}
                </button>
              </div>
              {instrSaved && <p className="cb-config-saved">Saved.</p>}
            </div>
          ) : (
            <>
              <div className="cb-messages">
                {messages.length === 0 && !loading && (
                  <div className="cb-empty">
                    <p>👋 Hi! I'm Eppy. Currently in <strong>{AI_MODES[mode].icon} {AI_MODES[mode].label}</strong> mode.</p>
                    <p>Try:<br/>
                      <em>"Help me understand binary search"</em><br/>
                      <em>"Review my essay"</em> (attach the file)<br/>
                      <em>"Fix my schedule for tomorrow"</em><br/>
                      <em>"Update my bedtime to 10:30pm"</em>
                    </p>
                  </div>
                )}

                {messages.map(msg => (
                  <div key={msg.id} className={`cb-msg ${msg.isAction ? 'cb-action' : msg.role === 'user' ? 'cb-user' : 'cb-bot'}`}>
                    {msg.isAction
                      ? <span className="cb-action-chip">⚙ {msg.text}</span>
                      : (
                        <div className="cb-bubble-wrap">
                          {msg.attachments?.length > 0 && (
                            <div className="cb-msg-attachments">
                              {msg.attachments.map((a, i) =>
                                a.type === 'image' && a.preview ? (
                                  <img key={i} src={a.preview} alt={a.name} className="cb-msg-image" />
                                ) : (
                                  <div key={i} className="cb-msg-file-chip">📄 {a.name}</div>
                                )
                              )}
                            </div>
                          )}
                          {msg.text && <span className="cb-bubble">{msg.text}</span>}
                        </div>
                      )
                    }
                  </div>
                ))}

                {loading && (
                  <div className="cb-msg cb-bot">
                    <span className="cb-bubble cb-typing"><span /><span /><span /></span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Attachment preview row (above input) */}
              {(attachments.length > 0 || processingFile) && (
                <div className="cb-attachments-preview">
                  {attachments.map((a, i) => (
                    <div key={i} className="cb-attachment-chip">
                      {a.type === 'image' ? (
                        <img src={a.preview} alt={a.name} className="cb-attachment-thumb" />
                      ) : (
                        <span className="cb-attachment-icon">📄</span>
                      )}
                      <span className="cb-attachment-name">{a.name}</span>
                      <button className="cb-attachment-remove" onClick={() => removeAttachment(i)}>✕</button>
                    </div>
                  ))}
                  {processingFile && <div className="cb-attachment-chip cb-attachment-loading">Processing…</div>}
                </div>
              )}

              <div className="cb-input-row">
                <button
                  className="cb-attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || processingFile}
                  title="Attach image or PDF"
                >
                  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFilePick}
                />
                <input
                  className="cb-input"
                  type="text"
                  placeholder={attachments.length ? "Add a question about the file…" : "Ask Eppy anything…"}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  disabled={loading}
                />
                <button className="cb-send" onClick={send} disabled={loading || (!input.trim() && attachments.length === 0)}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}