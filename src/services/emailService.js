import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

const functions = getFunctions(app);
const sendNotificationFn = httpsCallable(functions, 'sendNotification');

export const emailjsConfigured = () => true;

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

async function getUserTodos(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'todos'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function sendEmail(toEmail, toName, subject, message) {
  const result = await sendNotificationFn({ to: toEmail, toName, subject, message });
  if (!result.data.success) throw new Error('Email send failed');
}

export async function sendDailyReminder(user) {
  const todos = await getUserTodos(user.uid);
  const today = todayStr();
  const pending = todos.filter(t => t.date === today && !t.done);
  const dayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const name = user.displayName || 'there';

  const message = pending.length
    ? `You have ${pending.length} task${pending.length > 1 ? 's' : ''} today:\n\n${pending.map(t => `• ${t.text}`).join('\n')}`
    : 'No tasks scheduled for today — enjoy your day!';

  await sendEmail(user.email, name, `📋 Tasks for ${dayStr}`, message);
}

export async function sendWeeklyDigest(user) {
  const todos = await getUserTodos(user.uid);
  const now = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
  const weekTodos = todos.filter(t => dates.includes(t.date));
  const done     = weekTodos.filter(t => t.done).length;
  const total    = weekTodos.length;
  const upcoming = todos.filter(t => t.date >= todayStr() && !t.done).length;
  const name     = user.displayName || 'there';

  const message = `Here's your weekly summary:\n\n• Completed: ${done}/${total} tasks\n• Upcoming: ${upcoming} task${upcoming !== 1 ? 's' : ''} remaining\n\nKeep it up!`;
  await sendEmail(user.email, name, '📊 Weekly Progress — efficient.epp', message);
}

export async function sendDeadlineAlert(user, todo) {
  await sendEmail(
    user.email,
    user.displayName || 'there',
    `⏰ Due soon: ${todo.text}`,
    `Heads up — "${todo.text}" is due at ${todo.dueTime} today.`,
  ).catch(() => {});
}

export async function checkAndSendNotifications(user) {
  if (!user) return;
  try {
    const prefsSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'notifications'));
    if (!prefsSnap.exists()) return;
    const prefs = prefsSnap.data();

    const sentSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'notificationSent'));
    const sent = sentSnap.exists() ? sentSnap.data() : {};

    const today = todayStr();
    const week  = `${new Date().getFullYear()}-W${getISOWeek(new Date())}`;
    const updates = {};

    if (prefs.emailReminders && sent.dailyDate !== today) {
      await sendDailyReminder(user);
      updates.dailyDate = today;
    }
    if (prefs.weeklyDigest && sent.weekKey !== week && new Date().getDay() === 1) {
      await sendWeeklyDigest(user);
      updates.weekKey = week;
    }
    if (Object.keys(updates).length > 0) {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'notificationSent'), { ...sent, ...updates });
    }
    if (prefs.taskDeadlines) checkDeadlineAlerts(user);
  } catch (err) {
    console.warn('Notification check failed:', err.message);
  }
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function checkDeadlineAlerts(user) {
  const todos = await getUserTodos(user.uid);
  const today = todayStr();
  const now   = new Date();
  todos
    .filter(t => t.date === today && !t.done && t.dueTime)
    .forEach(t => {
      const [h, m] = t.dueTime.split(':').map(Number);
      const due = new Date(); due.setHours(h, m, 0, 0);
      const diffMin = (due - now) / 60000;
      if (diffMin > 0 && diffMin <= 30) sendDeadlineAlert(user, t);
    });
}