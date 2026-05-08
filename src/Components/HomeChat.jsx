import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, getDocs, updateDoc, setDoc,
  doc, query, orderBy, getDoc, deleteDoc,
} from 'firebase/firestore';
import './HomeChat.css';

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
    return { enabled: snap.exists() ? !!snap.data().enabled : false };
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
      query(collection(db, 'users', user.uid, 'mentalChecks'), orderBy('submittedAt', 'desc'))
    );
    return snap.docs.slice(0, count).map(d => ({ id: d.id, ...d.data() }));
  }
  return { error: 'Unknown tool' };
}

function actionLabel(name, args) {
  switch (name) {
    case 'list_todos':            return args?.date ? `Reading tasks for ${args.date}…` : 'Reading your tasks…';
    case 'add_todo':              return `Adding "${args?.text}" on ${args?.date}…`;
    case 'update_todo':           return 'Updating task…';
    case 'delete_todo':           return 'Removing task…';
    case 'get_profile':           return 'Reading your profile…';
    case 'update_profile':        return 'Updating your profile…';
    case 'get_notifications':     return 'Reading notification settings…';
    case 'update_notifications':  return 'Updating notification settings…';
    case 'get_focus_mode':        return 'Checking focus mode…';
    case 'set_focus_mode':        return args?.enabled ? 'Turning on focus mode…' : 'Turning off focus mode…';
    case 'navigate_to':           return `Navigating to ${args?.page}…`;
    case 'get_mental_checks':     return 'Reading your mental check history…';
    default:                      return 'Working…';
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

{"tool":"list_todos","args":{}}
{"tool":"list_todos","args":{"date":"YYYY-MM-DD"}}
{"tool":"list_todos","args":{"dateFrom":"YYYY-MM-DD","dateTo":"YYYY-MM-DD"}}
{"tool":"add_todo","args":{"text":"task name","date":"YYYY-MM-DD","dueTime":"HH:MM"}}
{"tool":"update_todo","args":{"id":"<id>","text":"...","date":"YYYY-MM-DD","dueTime":"HH:MM","done":true}}
{"tool":"delete_todo","args":{"id":"<id>"}}
{"tool":"get_profile","args":{}}
{"tool":"update_profile","args":{"username":"...","bedtime":"11pm"}}
{"tool":"get_notifications","args":{}}
{"tool":"update_notifications","args":{"emailReminders":true,"weeklyDigest":false}}
{"tool":"get_focus_mode","args":{}}
{"tool":"set_focus_mode","args":{"enabled":true}}
{"tool":"navigate_to","args":{"page":"Home"}}
{"tool":"get_mental_checks","args":{"count":5}}

## Rules
- Always call list_todos before editing todos — you need real IDs.
- After all tool calls are done, reply in plain friendly text summarising what you did.
- When NOT calling a tool, respond in plain conversational text only — no JSON.
- Give specific, actionable advice based on the student's profile.
- Keep responses concise and encouraging.`;
}

export default function HomeChat({ user, setPage }) {
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const historyRef                        = useRef([]);
  const profileRef                        = useRef(null);
  const instrRef                          = useRef('');
  const bottomRef                         = useRef(null);
  const inputRef                          = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!user) return;

    const profilePromise = getDoc(doc(db, 'users', user.uid))
      .then(snap => { if (snap.exists()) profileRef.current = snap.data(); })
      .catch(() => {});

    const instrPromise = getDoc(doc(db, 'users', user.uid, 'settings', 'aiInstructions'))
      .then(snap => { instrRef.current = snap.exists() ? (snap.data().text || '') : ''; })
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
      const msgs = [
        { role: 'system', content: buildSystemPrompt(profileRef.current, instrRef.current) },
        ...historyRef.current,
        { role: 'user', content: userText },
      ];

      let finalText = '';
      let iterations = 0;

      while (iterations < 10) {
        iterations++;
        const text = await callAI(msgs);
        const call = parseToolCall(text);

        if (call) {
          pushMessage('action', actionLabel(call.tool, call.args ?? {}), true);
          const result = await executeTool(call.tool, call.args ?? {}, user, setPage);
          msgs.push({ role: 'assistant', content: text });
          msgs.push({ role: 'user', content: `Tool result for ${call.tool}: ${JSON.stringify(result)}` });
        } else {
          finalText = text;
          break;
        }
      }

      if (!finalText) finalText = 'Done! Let me know if you need anything else.';

      pushMessage('assistant', finalText);
      saveToFirestore('assistant', finalText);

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

  if (!user) return null;

  return (
    <section className="hc-section">
      <div className="hc-card">
        <div className="hc-header">
          <span className="hc-title">
            <span className="hc-dot" />
            AI Assistant
          </span>
          <span className="hc-hint">Ask me anything about your schedule or wellbeing</span>
        </div>

        <div className="hc-messages">
          {messages.length === 0 && !loading && (
            <div className="hc-empty">
              <p>What can I help you with today?</p>
              <div className="hc-suggestions">
                {[
                  "What's on my schedule today?",
                  "Add a task for tomorrow",
                  "How's my week looking?",
                  "Turn on focus mode",
                ].map(s => (
                  <button
                    key={s}
                    className="hc-suggestion"
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`hc-msg ${msg.isAction ? 'hc-action' : msg.role === 'user' ? 'hc-user' : 'hc-bot'}`}
            >
              {msg.isAction
                ? <span className="hc-action-chip">⚙ {msg.text}</span>
                : <span className="hc-bubble">{msg.text}</span>
              }
            </div>
          ))}

          {loading && (
            <div className="hc-msg hc-bot">
              <span className="hc-bubble hc-typing"><span /><span /><span /></span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="hc-input-row">
          <input
            ref={inputRef}
            className="hc-input"
            type="text"
            placeholder="Ask your AI assistant…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={loading}
          />
          <button className="hc-send" onClick={send} disabled={loading || !input.trim()}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
