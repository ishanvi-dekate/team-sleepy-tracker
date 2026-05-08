import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, getDocs, deleteDoc, updateDoc, setDoc,
  doc, query, orderBy, limit, getDoc,
} from 'firebase/firestore';
import './ChatBot.css';

// Dev:        Vite middleware proxies /ai/chat → GitHub Models using server-side GITHUB_TOKEN
// Production: calls GitHub Models directly from the browser using VITE_GITHUB_TOKEN
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

// ── Firestore tool execution ──────────────────────────────────────────────────
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

// Try to parse a JSON tool call from the model's reply
function parseToolCall(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (obj.tool) return obj;
  } catch {}
  return null;
}

function buildSystemPrompt(profile, customInstructions) {
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

  return `You are an intelligent AI study coach built into Efficient EPP, a student productivity app.
Today is ${today}. Today's date in ISO format: ${todayISO}. This week runs from ${thisWeek}.
${profileSection}${customSection}
Use this profile context to give personalized, specific advice — not generic tips. Reference their actual courses, goals, and stressors when relevant.

## Tools
You have full control over the student's app. To call a tool, respond with ONLY a raw JSON object — no markdown, no explanation before or after it:

### Schedule / Todos
{"tool":"list_todos","args":{}}                                              ← all todos
{"tool":"list_todos","args":{"date":"YYYY-MM-DD"}}                           ← specific day
{"tool":"list_todos","args":{"dateFrom":"YYYY-MM-DD","dateTo":"YYYY-MM-DD"}} ← date range (use for "this week", "next week", etc.)
{"tool":"add_todo","args":{"text":"task name","date":"YYYY-MM-DD","dueTime":"HH:MM"}}
{"tool":"update_todo","args":{"id":"<id>","text":"...","date":"YYYY-MM-DD","dueTime":"HH:MM","done":true}}
{"tool":"delete_todo","args":{"id":"<id>"}}
Results are sorted by date, then by dueTime. Always use dateFrom/dateTo when the user asks about a week or range.

### Profile
{"tool":"get_profile","args":{}}
{"tool":"update_profile","args":{"username":"...","bedtime":"11pm","sleepHours":"7","stress":"...","distractions":"...","extracurriculars":"...","homeworkClass":"...","courses":"...","goal1":"...","goal2":"...","goal3":"..."}}
(Only include the fields you want to change in update_profile.)

### Notifications
{"tool":"get_notifications","args":{}}
{"tool":"update_notifications","args":{"emailReminders":true,"weeklyDigest":false,"taskDeadlines":true}}

### Focus Mode
{"tool":"get_focus_mode","args":{}}
{"tool":"set_focus_mode","args":{"enabled":true}}

### Navigation — take the student to a page
{"tool":"navigate_to","args":{"page":"Home"}}
Valid pages: Home, Settings, Mental, Profile, Todo

### Mental Health History
{"tool":"get_mental_checks","args":{"count":5}}

## Rules
- Always call list_todos before editing todos — you need real IDs.
- When asked to fix or optimise a schedule, use the tools and actually make the changes.
- When asked to change profile info, settings, or notifications — do it with the tools.
- After all tool calls are done, reply in plain friendly text summarising what you did.
- When NOT calling a tool, respond in plain conversational text only — no JSON.
- Give specific, actionable advice based on the student's profile.
- Keep responses concise and encouraging.`;
}

// ── Component ─────────────────────────────────────────────────────────────────
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
  const historyRef                        = useRef([]);
  const profileRef                        = useRef(null);
  const instrRef                          = useRef('');
  const bottomRef                         = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Load user profile + chat history from Firestore
  useEffect(() => {
    if (!user) return;

    const profilePromise = getDoc(doc(db, 'users', user.uid))
      .then(snap => { if (snap.exists()) profileRef.current = snap.data(); })
      .catch(() => {});

    const instrPromise = getDoc(doc(db, 'users', user.uid, 'settings', 'aiInstructions'))
      .then(snap => {
        const text = snap.exists() ? (snap.data().text || '') : '';
        instrRef.current = text;
        setInstrDraft(text);
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

    Promise.all([profilePromise, instrPromise, historyPromise]).finally(() => setHistoryLoaded(true));
  }, [user]);

  const pushMessage = (role, text, isAction = false) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, text, isAction }]);
  };

  const saveToFirestore = (role, text, isAction = false) =>
    addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
      role, text, isAction, timestamp: Date.now(),
    }).catch(console.error);

  const send = async () => {
    if (!input.trim() || loading || !historyLoaded) return;
    const userText = input.trim();
    setInput('');
    setLoading(true);

    pushMessage('user', userText);
    saveToFirestore('user', userText);

    try {
      // Build full message array: system (with live profile) + history + new user message
      const messages = [
        { role: 'system', content: buildSystemPrompt(profileRef.current, instrRef.current) },
        ...historyRef.current,
        { role: 'user', content: userText },
      ];

      let finalText = '';
      let iterations = 0;

      // Agentic loop — keep going while the model returns tool calls
      while (iterations < 10) {
        iterations++;
        const text = await callAI(messages);
        const call = parseToolCall(text);

        if (call) {
          // Model wants to call a tool
          pushMessage('action', actionLabel(call.tool, call.args ?? {}), true);
          const result = await executeTool(call.tool, call.args ?? {}, user, setPage);

          // Feed the tool call + result back into the conversation
          messages.push({ role: 'assistant', content: text });
          messages.push({ role: 'user', content: `Tool result for ${call.tool}: ${JSON.stringify(result)}` });
        } else {
          // Final plain-text response
          finalText = text;
          break;
        }
      }

      if (!finalText) finalText = 'Done! Let me know if you need anything else.';

      pushMessage('assistant', finalText);
      saveToFirestore('assistant', finalText);

      // Update in-memory history for next turn
      historyRef.current = [
        ...historyRef.current,
        { role: 'user',      content: userText  },
        { role: 'assistant', content: finalText },
      ];

    } catch (err) {
      console.error('AI error:', err?.message ?? err);
      pushMessage('assistant', `Error: ${err?.message ?? 'Unknown error'}`);
    }

    setLoading(false);
  };

  const saveInstructions = async () => {
    if (!user) return;
    setInstrSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'aiInstructions'), { text: instrDraft });
      instrRef.current = instrDraft;
      setInstrSaved(true);
      setTimeout(() => setInstrSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setInstrSaving(false);
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
            </span>
            <div className="cb-header-actions">
              <button
                className={`cb-clear ${configOpen ? 'cb-icon-active' : ''}`}
                onClick={() => setConfigOpen(o => !o)}
                title="Custom instructions"
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
              <p className="cb-config-desc">
                Write plain English instructions to customize how the AI behaves. It will follow these on every message — personality, things to always remember, topics to focus on, etc.
              </p>
              <textarea
                className="cb-config-textarea"
                value={instrDraft}
                onChange={e => setInstrDraft(e.target.value)}
                placeholder={"e.g. Always be motivating and brief.\nRemember I'm trying to get into university.\nAlways check my schedule before giving advice.\nFocus on my math class above all others."}
                rows={7}
              />
              <div className="cb-config-actions">
                <button className="cb-config-cancel" onClick={() => { setInstrDraft(instrRef.current); setConfigOpen(false); }}>
                  Cancel
                </button>
                <button className="cb-config-save" onClick={saveInstructions} disabled={instrSaving}>
                  {instrSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
              {instrSaved && <p className="cb-config-saved">Saved! AI will follow these from now on.</p>}
            </div>
          ) : (
            <>
              <div className="cb-messages">
                {messages.length === 0 && !loading && (
                  <div className="cb-empty">
                    <p>👋 Hi! I can manage your whole app for you.</p>
                    <p>Try:<br/>
                      <em>"Fix my schedule for tomorrow"</em><br/>
                      <em>"Update my bedtime to 10:30pm"</em><br/>
                      <em>"Turn on focus mode"</em><br/>
                      <em>"Take me to the tracker"</em>
                    </p>
                  </div>
                )}

                {messages.map(msg => (
                  <div key={msg.id} className={`cb-msg ${msg.isAction ? 'cb-action' : msg.role === 'user' ? 'cb-user' : 'cb-bot'}`}>
                    {msg.isAction
                      ? <span className="cb-action-chip">⚙ {msg.text}</span>
                      : <span className="cb-bubble">{msg.text}</span>
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

              <div className="cb-input-row">
                <input
                  className="cb-input"
                  type="text"
                  placeholder="Ask about your schedule…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  disabled={loading}
                />
                <button className="cb-send" onClick={send} disabled={loading || !input.trim()}>
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
