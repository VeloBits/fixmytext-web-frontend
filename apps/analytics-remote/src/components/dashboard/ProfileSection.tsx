import { useState, useEffect, useRef } from 'react';
import { PERSONAS } from '@velobits/app-core/constants/tools';
import type { GamificationContextValue, User } from '@velobits/app-core/types/context';
import type { AlertLevel } from '@velobits/app-core/types/alert';
import type { Persona } from '@velobits/app-core/types/tools';


interface ProfileSectionProps {
  user: User | null;
  isAuthenticated: boolean;
  g: GamificationContextValue;
  mode: string;
  setMode: (mode: string) => void;
  showAlert: (msg: string, type?: AlertLevel) => void;
}

/**
 * Dashboard profile section.
 * Allows editing display name, selecting persona, and toggling theme.
 */
export default function ProfileSection({ user, isAuthenticated, g, mode, setMode, showAlert }: ProfileSectionProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.display_name || '');
  const nameRef = useRef<HTMLInputElement>(null);

  // TODO: Email verification resend is now handled by Keycloak.
  const resending = false;
  const [cooldownUntil] = useState(0);
  const [, forceTick] = useState(0);

  const isVerified = !!user?.is_email_verified;

  useEffect(() => {
    if (editingName && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [editingName]);

  // Drive the live countdown while a cooldown is active.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return undefined;
    const id = setInterval(() => {
      forceTick((n) => n + 1);
      if (cooldownUntil <= Date.now()) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const handleResendVerification = async () => {
    // TODO: Email verification resend is now handled by Keycloak.
    showAlert('Please check your Keycloak account to resend the verification email.', 'info');
  };

  const cooldownSecs = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  const resendLabel =
    cooldownSecs > 0
      ? `Resend in ${cooldownSecs}s`
      : resending
      ? 'Sending...'
      : 'Resend verification email';

  return (
    <div className="tu-dash-content">
      <h2 className="tu-dash-title">Profile</h2>
      <p className="tu-dash-subtitle">Manage your account and preferences</p>

      {/* Profile card */}
      <div className="tu-dash-card tu-dash-card--profile">
        <div className="tu-dash-profile-large">
          <div className="tu-dash-avatar-large">
            {user?.display_name?.charAt(0)?.toUpperCase() || 'G'}
          </div>
          <div className="tu-dash-profile-large-info">
            {editingName ? (
              <div className="tu-dash-profile-edit-row">
                <input
                  ref={nameRef}
                  className="tu-dash-profile-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingName(false);
                      showAlert('Display name updated (local only)', 'success');
                    }
                    if (e.key === 'Escape') {
                      setEditingName(false);
                      setNameInput(user?.display_name || '');
                    }
                  }}
                  placeholder="Display name"
                />
                <button
                  className="tu-dash-profile-save-btn"
                  onClick={() => {
                    setEditingName(false);
                    showAlert('Display name updated (local only)', 'success');
                  }}
                >
                  Save
                </button>
                <button
                  className="tu-dash-profile-cancel-btn"
                  onClick={() => {
                    setEditingName(false);
                    setNameInput(user?.display_name || '');
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="tu-dash-profile-name-row">
                <span className="tu-dash-profile-large-name">
                  {nameInput || user?.display_name || 'Guest'}
                </span>
                <button
                  className="tu-dash-profile-edit-btn"
                  onClick={() => setEditingName(true)}
                  title="Edit name"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
              </div>
            )}
            <span className="tu-dash-profile-large-email">{user?.email || 'Not signed in'}</span>
            <div className="tu-dash-badge-row">
              <span
                className={`tu-dash-settings-badge${
                  isAuthenticated ? ' tu-dash-settings-badge--ok' : ''
                }`}
              >
                {isAuthenticated ? 'Signed in' : 'Guest'}
              </span>
              {isAuthenticated && (
                <span
                  className={`tu-dash-settings-badge${
                    isVerified ? ' tu-dash-settings-badge--ok' : ' tu-dash-settings-badge--warn'
                  }`}
                  title={
                    isVerified
                      ? 'Your email address is verified'
                      : 'Verify your email to unlock all tools'
                  }
                >
                  {isVerified ? 'Verified' : 'Not verified'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email verification (only shown when authed + unverified) */}
      {isAuthenticated && !isVerified && (
        <div className="tu-dash-card tu-dash-card--warn">
          <div className="tu-dash-verify">
            <div className="tu-dash-verify__icon" aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="tu-dash-verify__body">
              <h3 className="tu-dash-card-title">Verify your email</h3>
              <p className="tu-dash-card-desc">
                We sent a verification link to <b>{user?.email}</b>. Confirm your address to unlock
                all FixMyText tools — AI-powered tools and local transformations both require a
                verified email.
              </p>
            </div>
            <button
              type="button"
              className="tu-dash-verify__btn"
              onClick={handleResendVerification}
              disabled={resending || cooldownSecs > 0}
            >
              {resendLabel}
            </button>
          </div>
        </div>
      )}

      {/* Persona */}
      <div className="tu-dash-card">
        <h3 className="tu-dash-card-title">Persona</h3>
        <p className="tu-dash-card-desc">Choose your persona to get tailored tool suggestions</p>
        <div className="tu-dash-persona-grid">
          {Object.entries(PERSONAS).map(([key, p]) => (
            <button
              key={key}
              className={`tu-dash-persona-card${
                // persona is stored as a string key in practice
                (g?.persona as unknown as string) === key ? ' tu-dash-persona-card--active' : ''
              }`}
              onClick={() => {
                g.setPersona(key as unknown as Persona);
                showAlert(`Persona changed to ${p.label}`, 'success');
              }}
            >
              <span className="tu-dash-persona-icon">{p.icon}</span>
              <span className="tu-dash-persona-label">{p.label}</span>
              {(g?.persona as unknown as string) === key && <span className="tu-dash-persona-check">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div className="tu-dash-card">
        <h3 className="tu-dash-card-title">Appearance</h3>
        <div className="tu-dash-settings-row">
          <span className="tu-dash-settings-label">Theme</span>
          <div className="tu-dash-theme-toggle">
            <button
              className={`tu-dash-theme-btn${mode === 'light' ? ' tu-dash-theme-btn--active' : ''}`}
              onClick={() => setMode('light')}
            >
              <span>☀️</span> Light
            </button>
            <button
              className={`tu-dash-theme-btn${mode === 'dark' ? ' tu-dash-theme-btn--active' : ''}`}
              onClick={() => setMode('dark')}
            >
              <span>🌙</span> Dark
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
