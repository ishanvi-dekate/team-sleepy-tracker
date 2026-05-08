import { useState } from 'react';
import TodoList from '../Components/Todo';
import CalendarManager from '../Components/Calander';
import WeeklyPlanner from '../Components/WeeklyPlanner';
import ActivityTracker from '../Components/ActivityTracker';
import DistractionsTracker from '../Components/DistractionsTracker';
import './Tracker.css';

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Tracker({ setPage, user }) {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  return (
    <div className="tracker-page">
      <div className="tracker-banner">
        <h1 className="tracker-title">Tracker</h1>
      </div>
      <div className="tracker-content">
        <CalendarManager selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <TodoList user={user} selectedDate={selectedDate} />
        <div className="tracker-log-col">
          <ActivityTracker user={user} selectedDate={selectedDate} />
          <DistractionsTracker user={user} selectedDate={selectedDate} />
        </div>
        <div className="tracker-planner-row">
          <WeeklyPlanner user={user} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </div>
      </div>
    </div>
  );
}

export default Tracker;
