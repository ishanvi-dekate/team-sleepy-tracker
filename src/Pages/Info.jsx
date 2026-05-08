import { useState } from 'react';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import './Info.css';

function Info({ setPage }) {
  // All form data in one object - cleaner than 7 separate useStates
  const [formData, setFormData] = useState({
    username: '',
    bedtime: '',
    sleepHours: '',
    stress: '',
    distractions: '',
    extracurriculars: '',
    homeworkClass: '',
    courses: '',
    goal1: '',
    goal2: '',
    goal3: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.username.trim()) {
      setError('Please set a username.');
      return;
    }

    // Validate agreement
    if (!agreed) {
      setError('Please agree to use the app responsibly.');
      return;
    }

    // Clear errors and proceed
    setError('');
    setLoading(true);

    try {
      // Get current user
      const user = auth.currentUser;
      
      if (!user) {
        setError('Please log in first.');
        setLoading(false);
        return;
      }

      // Save to Firestore using user's ID
      await setDoc(doc(db, 'users', user.uid), {
        ...formData,
        userId: user.uid,
        email: user.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log('User profile saved to Firestore');
      setPage('Home');
    } catch (error) {
      setError('Error saving profile: ' + error.message);
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="info-page">
      <button
        type="button"
        onClick={() => setPage('Profile')}
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          background: 'rgba(255, 255, 255, 0.9)',
          color: '#4a3f9e',
          border: 'none',
          borderRadius: '8px',
          padding: '0.5rem 1rem',
          fontFamily: 'inherit',
          fontSize: '0.9rem',
          fontWeight: 600,
          cursor: 'pointer',
          zIndex: 10,
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        }}
      >
        Back
      </button>
      <div className="info-banner">
        <h1 className="info-title">Thank you for signing up for efficient.epp!</h1>
        <p className="info-subtitle">There is just one more thing you need to do</p>
      </div>

      <div className="info-content">
        <p className="info-instructions">
          Please set a username for yourself for your new profile before you proceed any further.
        </p>

        <form onSubmit={handleSubmit} className="info-form">
          {/* Username row */}
          <div className="info-username-row">
            <label className="info-username-label" htmlFor="username">Username:</label>
            <input
              id="username"
              type="text"
              className="info-username-input"
              placeholder="Input username"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
            />
          </div>

          {/* Question grid */}
          <div className="info-grid">
            {/* Sleep card */}
            <div className="info-card">
              <label>
                Time you go to bed:
                <input
                  type="text"
                  placeholder="e.g. 11pm"
                  value={formData.bedtime}
                  onChange={(e) => handleChange('bedtime', e.target.value)}
                />
              </label>
              <label>
                Average amount of sleep:
                <input
                  type="text"
                  placeholder="e.g. 7 hours"
                  value={formData.sleepHours}
                  onChange={(e) => handleChange('sleepHours', e.target.value)}
                />
              </label>
            </div>

            {/* Stress card */}
            <div className="info-card">
              <label>
                What stresses you the most?
                <textarea
                  rows="3"
                  value={formData.stress}
                  onChange={(e) => handleChange('stress', e.target.value)}
                />
              </label>
            </div>

            {/* Distractions card */}
            <div className="info-card">
              <label>
                Do you have any external distractions?
                <textarea
                  rows="3"
                  value={formData.distractions}
                  onChange={(e) => handleChange('distractions', e.target.value)}
                />
              </label>
            </div>

            {/* Extracurriculars card */}
            <div className="info-card">
              <label>
                What extracurricular do you do and for how long?
                <textarea
                  rows="3"
                  value={formData.extracurriculars}
                  onChange={(e) => handleChange('extracurriculars', e.target.value)}
                />
              </label>
            </div>

            {/* Homework card */}
            <div className="info-card">
              <label>
                Which class gives the most homework?
                <input
                  type="text"
                  value={formData.homeworkClass}
                  onChange={(e) => handleChange('homeworkClass', e.target.value)}
                />
              </label>
            </div>

            {/* Courses card */}
            <div className="info-card">
              <label>
                What courses do you take at school currently?
                <textarea
                  rows="3"
                  value={formData.courses}
                  onChange={(e) => handleChange('courses', e.target.value)}
                />
              </label>
            </div>
          </div>

          {/* Goals card - full width */}
          <div className="info-card info-goals-card">
            <label className="info-goals-label">What are 3 goals you have for yourself?</label>
            <div className="info-goal-row">
              <span>1.</span>
              <input
                type="text"
                value={formData.goal1}
                onChange={(e) => handleChange('goal1', e.target.value)}
              />
            </div>
            <div className="info-goal-row">
              <span>2.</span>
              <input
                type="text"
                value={formData.goal2}
                onChange={(e) => handleChange('goal2', e.target.value)}
              />
            </div>
            <div className="info-goal-row">
              <span>3.</span>
              <input
                type="text"
                value={formData.goal3}
                onChange={(e) => handleChange('goal3', e.target.value)}
              />
            </div>
          </div>

          <p className="info-note">
            Please fill in these boxes as accurately as you can so we can provide
            you accurate information. You can always change this information by
            editing your profile.
          </p>

          {/* Agreement checkbox */}
          <label className="info-agree">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            I agree to use this app responsibly for the right purposes
          </label>

          {error && <p className="info-error">{error}</p>}

          <button type="submit" className="info-submit" disabled={loading}>
            {loading ? 'Saving...' : 'Create Account'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default Info;