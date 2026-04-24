import { useNavigate } from 'react-router-dom';
import './Settings.css';

function Settings() {
  const navigate = useNavigate();

  const settingsOptions = [
    { label: 'Manage Account', path: '/settings/account' },
    { label: 'Notification Emails / Texts', path: '/settings/notifications' },
    { label: 'Troubleshooting', path: '/settings/troubleshooting' },
    { label: 'Focus Mode', path: '/settings/focus-mode' },
    { label: 'Personal Information', path: '/settings/personal-info' },
    { label: 'Danger Zone', path: '/settings/danger-zone', danger: true },
  ];

  return (
    <div className="settings-page">
      <div className="settings-banner">
        <h1 className="settings-title">Settings</h1>
      </div>

      <div className="settings-content">
        <div className="settings-grid">
          {settingsOptions.map((option) => (
            <button
              key={option.path}
              className={`settings-button ${option.danger ? 'settings-button-danger' : ''}`}
              onClick={() => navigate(option.path)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Settings;