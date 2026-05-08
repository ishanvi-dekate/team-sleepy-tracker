import { useState, useEffect } from "react";
import "./Profile.css";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

function Profile({ setPage }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError('Please log in first.');
          setLoading(false);
          return;
        }
        // FIXED: read from users/{uid} to match where Info.jsx saves
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProfile(docSnap.data());
          setEditData(docSnap.data());
        } else {
          setError('No profile found. Please complete your profile setup first. Or try to refresh it.');
        }
      } catch (err) {
        setError('Error loading profile: ' + err.message);
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleEditChange = (field, value) => {
    setEditData({ ...editData, [field]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const user = auth.currentUser;
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        ...editData,
        updatedAt: new Date().toISOString(),
      });
      setProfile(editData);
      setIsEditing(false);
      setSaveMessage('Profile updated! ✓');
      setTimeout(() => setSaveMessage(''), 2500);
    } catch (err) {
      setSaveMessage('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData(profile);
    setIsEditing(false);
  };

  if (loading) return <div className="profile-page"><div className="profile-loading">Loading profile…</div></div>;
  if (error) return (
    <div className="profile-page">
      <div className="profile-error-msg">
        {error}
        {error.includes('No profile') && (
          <button className="profile-setup-btn" onClick={() => setPage && setPage('Info')}>
            Set up profile
          </button>
        )}
      </div>
    </div>
  );
  if (!profile) return <div className="profile-page"><div className="profile-error-msg">No profile data found.</div></div>;

  const goals = [profile.goal1, profile.goal2, profile.goal3].filter(Boolean);
  const courseList = profile.courses ? profile.courses.split(/[,\n]+/).map(s => s.trim()).filter(Boolean) : [];
  const extracurricularList = profile.extracurriculars ? profile.extracurriculars.split(/[,\n]+/).map(s => s.trim()).filter(Boolean) : [];

  // Get initial for avatar
  const initial = (profile.username || 'U').charAt(0).toUpperCase();

  return (
    <div className="profile-page">
      <div className="profile-header-bar">
        <span className="profile-header-label">Profile</span>
        {!isEditing && (
          <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>
            Edit
          </button>
        )}
      </div>

      {saveMessage && <div className="profile-save-toast">{saveMessage}</div>}

      <div className="profile-hero">
        <div className="profile-avatar">{initial}</div>
        <div className="profile-hero-info">
          {isEditing ? (
            <input
              className="profile-name-input"
              value={editData.username || ''}
              onChange={(e) => handleEditChange('username', e.target.value)}
              placeholder="Your name"
            />
          ) : (
            <h1 className="profile-name">{profile.username}</h1>
          )}
        </div>
      </div>

      <div className="profile-content">
        {/* About / Sleep section */}
        <div className="profile-about-card">
          <div className="profile-field-row">
            <span className="profile-field-label">Bedtime:</span>
            {isEditing ? (
              <input
                className="profile-inline-input"
                value={editData.bedtime || ''}
                onChange={(e) => handleEditChange('bedtime', e.target.value)}
              />
            ) : (
              <span className="profile-field-value">{profile.bedtime || '—'}</span>
            )}
          </div>
          <div className="profile-field-row">
            <span className="profile-field-label">Average sleep:</span>
            {isEditing ? (
              <input
                className="profile-inline-input"
                value={editData.sleepHours || ''}
                onChange={(e) => handleEditChange('sleepHours', e.target.value)}
              />
            ) : (
              <span className="profile-field-value">{profile.sleepHours || '—'}</span>
            )}
          </div>
          <div className="profile-field-row">
            <span className="profile-field-label">Most homework:</span>
            {isEditing ? (
              <input
                className="profile-inline-input"
                value={editData.homeworkClass || ''}
                onChange={(e) => handleEditChange('homeworkClass', e.target.value)}
              />
            ) : (
              <span className="profile-field-value">{profile.homeworkClass || '—'}</span>
            )}
          </div>
        </div>

        {/* Three column grid: Courses, Extracurriculars, Goals */}
        <div className="profile-grid">
          {/* Courses */}
          <div className="profile-section">
            <div className="profile-section-header">Current Courses</div>
            {isEditing ? (
              <textarea
                className="profile-section-textarea"
                rows="4"
                value={editData.courses || ''}
                onChange={(e) => handleEditChange('courses', e.target.value)}
                placeholder="Separate with commas or new lines"
              />
            ) : (
              <div className="profile-pill-grid">
                {courseList.length > 0 ? courseList.map((c, i) => (
                  <div key={i} className="profile-pill">{c}</div>
                )) : <div className="profile-empty">No courses listed</div>}
              </div>
            )}
          </div>

          {/* Extracurriculars */}
          <div className="profile-section">
            <div className="profile-section-header">Extracurriculars</div>
            {isEditing ? (
              <textarea
                className="profile-section-textarea"
                rows="4"
                value={editData.extracurriculars || ''}
                onChange={(e) => handleEditChange('extracurriculars', e.target.value)}
                placeholder="Separate with commas or new lines"
              />
            ) : (
              <div className="profile-pill-grid">
                {extracurricularList.length > 0 ? extracurricularList.map((e, i) => (
                  <div key={i} className="profile-pill">{e}</div>
                )) : <div className="profile-empty">None listed</div>}
              </div>
            )}
          </div>

          {/* Goals */}
          <div className="profile-section">
            <div className="profile-section-header">Personal Goals</div>
            {isEditing ? (
              <div className="profile-goals-edit">
                {[1, 2, 3].map(n => (
                  <input
                    key={n}
                    className="profile-inline-input"
                    placeholder={`Goal ${n}`}
                    value={editData[`goal${n}`] || ''}
                    onChange={(e) => handleEditChange(`goal${n}`, e.target.value)}
                  />
                ))}
              </div>
            ) : (
              <div className="profile-pill-grid">
                {goals.length > 0 ? goals.map((g, i) => (
                  <div key={i} className="profile-pill">{g}</div>
                )) : <div className="profile-empty">No goals set</div>}
              </div>
            )}
          </div>
        </div>

        {/* Wellbeing section */}
        <div className="profile-wellbeing">
          <div className="profile-wellbeing-card">
            <div className="profile-section-header">Biggest Stressor</div>
            {isEditing ? (
              <textarea
                className="profile-section-textarea"
                rows="3"
                value={editData.stress || ''}
                onChange={(e) => handleEditChange('stress', e.target.value)}
              />
            ) : (
              <p className="profile-wellbeing-text">{profile.stress || 'Not specified'}</p>
            )}
          </div>
          <div className="profile-wellbeing-card">
            <div className="profile-section-header">Distractions</div>
            {isEditing ? (
              <textarea
                className="profile-section-textarea"
                rows="3"
                value={editData.distractions || ''}
                onChange={(e) => handleEditChange('distractions', e.target.value)}
              />
            ) : (
              <p className="profile-wellbeing-text">{profile.distractions || 'Not specified'}</p>
            )}
          </div>
        </div>

        {/* Edit mode buttons */}
        {isEditing && (
          <div className="profile-edit-actions">
            <button className="profile-cancel-btn" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
            <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;