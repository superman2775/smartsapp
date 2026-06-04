import { useState, useRef, useCallback } from 'react';
import { ArrowLeft, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { uploadProfilePicture } from '../../services/storage';
import Avatar from '../Avatar/Avatar';
import ImageCropper from '../ImageCropper/ImageCropper';
import styles from './ProfileSettings.module.css';

interface Props {
  onBack: () => void;
}

export default function ProfileSettings({ onBack }: Props) {
  const { user, updateProfile } = useAuth();
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

  return (
    <div className={styles.screen}>
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
