import { useState, useRef, useCallback } from 'react';
import { ArrowLeft, Upload, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { uploadProfilePicture } from '../../services/storage';
import Avatar from '../Avatar/Avatar';
import ImageCropper from '../ImageCropper/ImageCropper';
import styles from './ProfileSettings.module.css';

interface Props {
  onBack: () => void;
}

export default function ProfileSettings({ onBack }: Props) {
  const { user, updateProfile, deleteAccount, finalizeDeletion, completeDeletion } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [showGoodbye, setShowGoodbye] = useState(false);

  const doUpload = useCallback(
    async (blob: Blob) => {
      if (!user) return;
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      setUploading(true);
      setUploadProgress(0);
      setCropFile(null);
      try {
        const { downloadURL } = await uploadProfilePicture(
          user.uid,
          file,
          (pct) => setUploadProgress(pct)
        );
        setPhotoURL(downloadURL);
      } catch {
        setError('Failed to upload image.');
      } finally {
        setUploading(false);
      }
    },
    [user]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }
    setError('');
    setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = () => {
    setPhotoURL('');
    setUploadProgress(0);
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError('Display name is required');
      return;
    }
    if (!user) return;
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await updateProfile(name, photoURL || null, bio.trim() || null);
      setSuccess('Profile updated!');
    } catch {
      setError('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setError('');
    setSuccess('');
    setDeleting(true);
    try {
      // Phase 1: delete Firestore data
      await deleteAccount();

      // Phase 2: delete auth user (may trigger re-auth popup)
      await finalizeDeletion();

      // Phase 3: fade-out animation, then show goodbye, then cleanup
      setFadingOut(true);
      setTimeout(() => {
        setShowGoodbye(true);
        setTimeout(() => {
          completeDeletion();
        }, 1500);
      }, 500);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/requires-recent-login' || code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('Re-authentication was cancelled. Please try again.');
      } else {
        setError('Failed to delete account. Please try again.');
      }
      setConfirmDelete(false);
      setDeleting(false);
    }
  };

  return (
    <>
      <div className={`${styles.screen} ${fadingOut ? styles.fadingOutScreen : ''}`}>
        <form className={styles.card} onSubmit={handleSubmit}>
          <button type="button" className={styles.back} onClick={onBack}>
            <ArrowLeft size={18} /> Back to chats
          </button>

          <h1 className={styles.title}>Profile Settings</h1>
          <p className={styles.subtitle}>Customize how others see you</p>

          {/* Photo */}
          <div className={styles.photoSection}>
            <div className={styles.photoWrap}>
              {uploading ? (
                <div style={{ position: 'relative', width: 72, height: 72 }}>
                  <Avatar src={photoURL || undefined} name={displayName} size={72} />
                  <div className={styles.uploadOverlay}>
                    <div className={styles.uploadSpinner} />
                    <span className={styles.uploadPct}>{uploadProgress}%</span>
                  </div>
                </div>
              ) : (
                <Avatar src={photoURL || undefined} name={displayName} size={72} />
              )}
            </div>

            <div className={styles.photoActions}>
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload size={14} />
                {photoURL ? 'Change photo' : 'Upload photo'}
              </button>
              {photoURL && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={handleRemovePhoto}
                >
                  Remove photo
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Display name</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Bio</label>
            <textarea
              className={styles.textarea}
              placeholder="A short bio about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
            />
            <p className={styles.hint}>{bio.length}/160</p>
          </div>

          <button className={styles.saveBtn} type="submit" disabled={saving || uploading}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>

          {success && <p className={styles.successMsg}>{success}</p>}
          {error && <p className={styles.errorMsg}>{error}</p>}
        </form>

        {/* ── Danger zone ── */}
        <div className={styles.dangerZone}>
          <div className={styles.dangerHeader}>
            <AlertTriangle size={18} />
            <span>Danger zone</span>
          </div>
          <p className={styles.dangerDesc}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>

          {!confirmDelete ? (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
            >
              Delete my account
            </button>
          ) : (
            <div className={styles.confirmRow}>
              <p className={styles.confirmText}>Are you sure? This cannot be undone.</p>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className={styles.confirmYesBtn}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, delete my account'}
                </button>
                <button
                  type="button"
                  className={styles.confirmNoBtn}
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Crop modal */}
        {cropFile && (
          <ImageCropper
            file={cropFile}
            onCrop={doUpload}
            onCancel={() => setCropFile(null)}
          />
        )}
      </div>

      {/* Goodbye overlay — sibling of .screen, not affected by its opacity */}
      {showGoodbye && (
        <div className={styles.goodbyeOverlay}>
          <h2 className={styles.goodbyeTitle}>Goodbye 👋</h2>
          <p className={styles.goodbyeSub}>Your account has been deleted.</p>
        </div>
      )}
    </>
  );
}
