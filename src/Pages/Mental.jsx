import { useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import "./Mental.css";

function Mental() {
  const [sleepTime, setSleepTime]     = useState("");
  const [wakeTime, setWakeTime]       = useState("");
  const [stressLevel, setStressLevel] = useState("");
  const [dayScale, setDayScale]       = useState("");
  const [worries, setWorries]         = useState("");
  const [extraTime, setExtraTime]     = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState("");

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) { setError("Please log in first."); return; }

    setError("");
    try {
      await addDoc(collection(db, "users", user.uid, "mentalChecks"), {
        sleepTime,
        wakeTime,
        stressLevel,
        dayScale,
        worries,
        extraTime,
        submittedAt: Date.now(),
      });

      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 700);
      setSubmitted(true);

      // Reset fields
      setSleepTime("");
      setWakeTime("");
      setStressLevel("");
      setDayScale("");
      setWorries("");
      setExtraTime("");
    } catch (err) {
      setError("Failed to save. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="mental-page">
      <div className="mental-banner">
        <h1 className="mental-title">Mental Check</h1>
      </div>

      <div className="mental-content">
        <p className="mental-subtitle">
          Please fill this out once every week so we can provide accurate data for you.
        </p>

        {submitted && (
          <div className="mental-success">
            ✅ Check-in saved! Come back next week.
          </div>
        )}

        {error && <p className="mental-error">{error}</p>}

        <div className="mental-grid">
          {/* Left column */}
          <div className="mental-column">
            <div className="mental-question">
              <label className="mental-card">What time did you sleep yesterday?</label>
              <input
                className="mental-input"
                type="time"
                value={sleepTime}
                onChange={(e) => setSleepTime(e.target.value)}
              />
            </div>

            <div className="mental-question">
              <label className="mental-card">When did you wake up?</label>
              <input
                className="mental-input"
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
              />
            </div>

            <div className="mental-question">
              <label className="mental-card">
                On a scale from 1–5, how often did you feel unable to control important things this week?
              </label>
              <input
                className="mental-input"
                type="number"
                min="1"
                max="5"
                placeholder="1 – 5"
                value={stressLevel}
                onChange={(e) => setStressLevel(e.target.value)}
              />
            </div>
          </div>

          {/* Center submit button */}
         {/* <button className={`mental-submit ${celebrating ? 'celebrating' : ''}`} onClick={handleSubmit}> 
            Click to<br />upload it!
          </button>*/}

          {/* Right column */}
          <div className="mental-column">
            <div className="mental-question">
              <label className="mental-card">On a scale from 1–10, how was your day?</label>
              <input
                className="mental-input"
                type="number"
                min="1"
                max="10"
                placeholder="1 – 10"
                value={dayScale}
                onChange={(e) => setDayScale(e.target.value)}
              />
            </div>

            <div className="mental-question">
              <label className="mental-card">List out your worries / concerns</label>
              <textarea
                className="mental-input mental-textarea"
                placeholder="Anything on your mind…"
                rows={3}
                value={worries}
                onChange={(e) => setWorries(e.target.value)}
              />
            </div>

            <div className="mental-question">
              <label className="mental-card">How much time did you spend on extracurriculars?</label>
              <input
                className="mental-input"
                placeholder="e.g. 2 hours"
                value={extraTime}
                onChange={(e) => setExtraTime(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Mental;
