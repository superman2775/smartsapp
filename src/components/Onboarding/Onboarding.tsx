import { useState, useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { uploadProfilePicture } from '../../services/storage';
import Avatar from '../Avatar/Avatar';
import ImageCropper from '../ImageCropper/ImageCropper';
import styles from './Onboarding.module.css';

export default function Onboarding() {
  const { user, completeOnboarding } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL ?? '');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setError('Failed to upload image. Try again.');
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
      setError('Please select an image file (JPEG, PNG, GIF, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }
    setError('');
    setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) {
      setError('Display name is required');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await completeOnboarding(name, photoURL || null, bio.trim() || null);
    } catch {
      setError('Failed to save profile. Try again.');
      setSaving(false);
    }
  };

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <h1 className={styles.title}>Complete your profile</h1>
          <p className={styles.subtitle}>Pick a display name, photo, and tell others about yourself</p>
        </div>

        {/* Photo picker */}
        <div className={styles.photoSection}>
          <div className={styles.photoWrap}>
            {uploading ? (
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <Avatar src={photoURL || undefined} name={displayName} size={80} />
                <div className={styles.uploadOverlay}>
                  <div className={styles.uploadSpinner} />
                  <span className={styles.uploadPct}>{uploadProgress}%</span>
                </div>
              </div>
            ) : (
              <Avatar src={photoURL || undefined} name={displayName} size={80} />
            )}
          </div>

          <button
            type="button"
            className={styles.uploadBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={14} />
            {photoURL ? 'Change photo' : 'Upload a photo'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Display name *</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            required
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

        <button
          className={styles.submitBtn}
          type="submit"
          disabled={saving || uploading}
        >
          {saving ? 'Saving...' : 'Continue to chats'}
        </button>

        {error && <p className={styles.errorMsg}>{error}</p>}
      </form>

      {/* Crop modal */}
      {cropFile && (
        <ImageCropper
          file={cropFile}
          onCrop={doUpload}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
}
