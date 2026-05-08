import { useState, useEffect, useRef } from "react";
import "./Profile.css";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

// Preset banner gradients
const BANNER_PRESETS = [
  { id: 'lavender', name: 'Lavender Sky', gradient: 'linear-gradient(135deg, #A5BDF4 0%, #7364D2 100%)' },
  { id: 'sunset',   name: 'Sunset',       gradient: 'linear-gradient(135deg, #FBC2EB 0%, #A18CD1 50%, #FF9A9E 100%)' },
  { id: 'ocean',    name: 'Ocean',        gradient: 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)' },
  { id: 'mint',     name: 'Mint',         gradient: 'linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%)' },
  { id: 'peach',    name: 'Peach',        gradient: 'linear-gradient(135deg, #FFE0C3 0%, #FFAFBD 100%)' },
  { id: 'galaxy',   name: 'Galaxy',       gradient: 'linear-gradient(135deg, #2C0E5C 0%, #6E48AA 50%, #9D50BB 100%)' },
];

const getBannerGradient = (id) => {
  const preset = BANNER_PRESETS.find(p => p.id === id);
  return preset ? preset.gradient : BANNER_PRESETS[0].gradient;
};

// Helper: compress image to base64
const compressImage = (file, maxWidth, maxHeight, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Inline SVG icons
const IconCamera = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const IconMoon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const IconClock = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconBook = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const IconMail = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconPencil = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);
const IconPalette = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
  </svg>
);

function Profile({ setPage }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showBannerPicker, setShowBannerPicker] = useState(false);

  const avatarInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError('Please log in first.');
          setLoading(false);
          return;
        }
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProfile(docSnap.data());
          setEditData(docSnap.data());
        } else {
          setError('No profile found. Please complete your profile setup first.');
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

  // Close banner picker when clicking outside
  useEffect(() => {
    if (!showBannerPicker) return;
    const handler = (e) => {
      if (!e.target.closest('.profile-banner-picker') && !e.target.closest('.profile-banner-edit-btn')) {
        setShowBannerPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showBannerPicker]);

  const handleEditChange = (field, value) => {
    setEditData({ ...editData, [field]: value });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSaveMessage('Please upload an image file.');
      setTimeout(() => setSaveMessage(''), 2500);
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file, 400, 400, 0.9);
      const updated = { ...editData, photoURL: compressed };
      setEditData(updated);

      if (!isEditing) {
        const user = auth.currentUser;
        await updateDoc(doc(db, 'users', user.uid), {
          photoURL: compressed,
          updatedAt: new Date().toISOString(),
        });
        setProfile(updated);
        setSaveMessage('Profile picture updated');
        setTimeout(() => setSaveMessage(''), 2500);
      }
    } catch (err) {
      setSaveMessage('Upload failed: ' + err.message);
      setTimeout(() => setSaveMessage(''), 2500);
    } finally {
      setUploading(false);
    }
  };

  const handleBannerSelect = async (presetId) => {
    const updated = { ...editData, bannerPreset: presetId, bannerURL: null };
    setEditData(updated);
    setShowBannerPicker(false);

    if (!isEditing) {
      try {
        const user = auth.currentUser;
        await updateDoc(doc(db, 'users', user.uid), {
          bannerPreset: presetId,
          bannerURL: null,
          updatedAt: new Date().toISOString(),
        });
        setProfile(updated);
        setSaveMessage('Banner updated');
        setTimeout(() => setSaveMessage(''), 2500);
      } catch (err) {
        setSaveMessage('Error: ' + err.message);
      }
    }
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
      setSaveMessage('Profile updated');
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
  const initial = (profile.username || 'U').charAt(0).toUpperCase();
  const userEmail = auth.currentUser?.email || '';

  const avatarSrc = (isEditing ? editData.photoURL : profile.photoURL) || null;
  const currentBannerPreset = (isEditing ? editData.bannerPreset : profile.bannerPreset) || 'lavender';
  const bannerStyle = { background: getBannerGradient(currentBannerPreset) };

  return (
    <div className="profile-page">
      {/* Cover banner with gradient */}
      <div className="profile-cover" style={bannerStyle}>
        <button
          className="profile-banner-edit-btn"
          onClick={() => setShowBannerPicker(!showBannerPicker)}
          title="Change banner"
        >
          <IconPalette size={14} />
          <span>Change banner</span>
        </button>

        {showBannerPicker && (
          <div className="profile-banner-picker">
            <div className="profile-banner-picker-title">Choose a banner</div>
            <div className="profile-banner-picker-grid">
              {BANNER_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  className={`profile-banner-preset ${currentBannerPreset === preset.id ? 'is-selected' : ''}`}
                  style={{ background: preset.gradient }}
                  onClick={() => handleBannerSelect(preset.id)}
                  title={preset.name}
                >
                  <span className="profile-banner-preset-label">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {saveMessage && <div className="profile-save-toast">{saveMessage}</div>}

      <div className="profile-layout">
        {/* ===== LEFT SIDEBAR ===== */}
        <aside className="profile-sidebar">
          <div className="profile-avatar-wrapper">
            <div
              className="profile-avatar"
              style={avatarSrc ? { backgroundImage: `url(${avatarSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {!avatarSrc && initial}
            </div>
            <button
              className="profile-avatar-edit-btn"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploading}
              title="Change profile picture"
            >
              <IconCamera size={16} />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />
          </div>

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

          {!isEditing && (
            <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>
              <IconPencil size={14} />
              <span>Edit profile</span>
            </button>
          )}

          <div className="profile-info-block">
            <div className="profile-info-block-title">ABOUT</div>

            <div className="profile-info-item">
              <span className="profile-info-icon"><IconMoon /></span>
              <div className="profile-info-text">
                <span className="profile-info-key">Bedtime</span>
                {isEditing ? (
                  <input
                    className="profile-info-input"
                    value={editData.bedtime || ''}
                    onChange={(e) => handleEditChange('bedtime', e.target.value)}
                    placeholder="e.g. 11pm"
                  />
                ) : (
                  <span className="profile-info-val">{profile.bedtime || '—'}</span>
                )}
              </div>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-icon"><IconClock /></span>
              <div className="profile-info-text">
                <span className="profile-info-key">Average Sleep</span>
                {isEditing ? (
                  <input
                    className="profile-info-input"
                    value={editData.sleepHours || ''}
                    onChange={(e) => handleEditChange('sleepHours', e.target.value)}
                    placeholder="e.g. 7 hours"
                  />
                ) : (
                  <span className="profile-info-val">{profile.sleepHours || '—'}</span>
                )}
              </div>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-icon"><IconBook /></span>
              <div className="profile-info-text">
                <span className="profile-info-key">Most Homework</span>
                {isEditing ? (
                  <input
                    className="profile-info-input"
                    value={editData.homeworkClass || ''}
                    onChange={(e) => handleEditChange('homeworkClass', e.target.value)}
                    placeholder="Class name"
                  />
                ) : (
                  <span className="profile-info-val">{profile.homeworkClass || '—'}</span>
                )}
              </div>
            </div>
          </div>

          {userEmail && (
            <div className="profile-info-block">
              <div className="profile-info-block-title">CONTACT</div>
              <div className="profile-info-item">
                <span className="profile-info-icon"><IconMail /></span>
                <div className="profile-info-text">
                  <span className="profile-info-val profile-info-email">{userEmail}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* ===== RIGHT MAIN ===== */}
        <main className="profile-main">
          <section className="profile-section">
            <h2 className="profile-section-title">Current Courses</h2>
            {isEditing ? (
              <textarea
                className="profile-section-textarea"
                rows="3"
                value={editData.courses || ''}
                onChange={(e) => handleEditChange('courses', e.target.value)}
                placeholder="Separate with commas or new lines"
              />
            ) : (
              <div className="profile-pill-grid">
                {courseList.length > 0
                  ? courseList.map((c, i) => <div key={i} className="profile-pill">{c}</div>)
                  : <div className="profile-empty">No courses listed</div>}
              </div>
            )}
          </section>

          <section className="profile-section">
            <h2 className="profile-section-title">Extracurriculars</h2>
            {isEditing ? (
              <textarea
                className="profile-section-textarea"
                rows="3"
                value={editData.extracurriculars || ''}
                onChange={(e) => handleEditChange('extracurriculars', e.target.value)}
                placeholder="Separate with commas or new lines"
              />
            ) : (
              <div className="profile-pill-grid">
                {extracurricularList.length > 0
                  ? extracurricularList.map((e, i) => <div key={i} className="profile-pill">{e}</div>)
                  : <div className="profile-empty">None listed</div>}
              </div>
            )}
          </section>

          <section className="profile-section">
            <h2 className="profile-section-title">Personal Goals</h2>
            {isEditing ? (
              <div className="profile-goals-edit">
                {[1, 2, 3].map(n => (
                  <input
                    key={n}
                    className="profile-info-input"
                    placeholder={`Goal ${n}`}
                    value={editData[`goal${n}`] || ''}
                    onChange={(e) => handleEditChange(`goal${n}`, e.target.value)}
                  />
                ))}
              </div>
            ) : (
              <ol className="profile-goals-list">
                {goals.length > 0
                  ? goals.map((g, i) => <li key={i} className="profile-goal-item">{g}</li>)
                  : <div className="profile-empty">No goals set</div>}
              </ol>
            )}
          </section>

          <div className="profile-wellbeing-grid">
            <section className="profile-section">
              <h2 className="profile-section-title">Biggest Stressor</h2>
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
            </section>

            <section className="profile-section">
              <h2 className="profile-section-title">Distractions</h2>
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
            </section>
          </div>

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
        </main>
      </div>
    </div>
  );
}

export default Profile;