import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

// Uses the browser Web Notifications API — no external service or account needed.

export const emailjsConfigured = () => 'Notification' in window;

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

async function getUserTodos(uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'todos'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

function notify(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.svg' });
  }
}

export async function sendDailyReminder(user) {
  if (Notification.permission !== 'granted') {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') throw new Error('Notification permission not granted. Allow notifications in your browser settings.');
  }
  const todos = await getUserTodos(user.uid);
  const today = todayStr();
  const pending = todos.filter(t => t.date === today && !t.done);
  const dayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  notify(
    `📋 Tasks for ${dayStr}`,
    pending.length
      ? `${pending.length} task${pending.length > 1 ? 's' : ''} today: ${pending.map(t => t.text).join(', ')}`
      : 'No tasks today — enjoy your day!'
  );
}

export async function sendWeeklyDigest(user) {
  if (Notification.permission !== 'granted') {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') throw new Error('Notification permission not granted. Allow notifications in your browser settings.');
  }
  const todos = await getUserTodos(user.uid);
  const now = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });
  const weekTodos = todos.filter(t => dates.includes(t.date));
  const done = weekTodos.filter(t => t.done).length;
  const total = weekTodos.length;
  const upcoming = todos.filter(t => t.date >= todayStr() && !t.done).length;

  notify(
    '📊 Weekly progress — efficient.epp',
    `You completed ${done}/${total} tasks this week. ${upcoming} upcoming.`
  );
}

export async function sendDeadlineAlert(user, todo) {
  if (Notification.permission === 'granted') {
    notify(`⏰ Due soon: ${todo.text}`, `Due at ${todo.dueTime} today.`);
  }
}

export async function checkAndSendNotifications(user) {
  if (!user || !('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const prefsSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'notifications'));
    if (!prefsSnap.exists()) return;
    const prefs = prefsSnap.data();

    const sentSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'notificationSent'));
    const sent = sentSnap.exists() ? sentSnap.data() : {};

    const today = todayStr();
    const week = `${new Date().getFullYear()}-W${getISOWeek(new Date())}`;
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

    if (prefs.taskDeadlines) {
      checkDeadlineAlerts(user);
    }
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
  const now = new Date();

  todos
    .filter(t => t.date === today && !t.done && t.dueTime)
    .forEach(t => {
      const [h, m] = t.dueTime.split(':').map(Number);
      const due = new Date();
      due.setHours(h, m, 0, 0);
      const diffMin = (due - now) / 60000;
      if (diffMin > 0 && diffMin <= 30) {
        notify(`⏰ Due in ${Math.round(diffMin)} min`, t.text);
      }
    });
}
