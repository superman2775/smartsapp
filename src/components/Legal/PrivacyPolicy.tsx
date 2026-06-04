import { ArrowLeft } from 'lucide-react';
import styles from './Legal.module.css';

interface Props {
  onBack: () => void;
}

export default function PrivacyPolicy({ onBack }: Props) {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <button className={styles.back} onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1>Privacy Policy</h1>
        <p className={styles.date}>Last updated: June 3, 2026</p>

        <section>
          <h2>1. Information We Collect</h2>
          <p>
            When you sign in with Google, we collect your name, email address, and
            profile picture. We also store the messages you send and receive, along
            with timestamps and read status.
          </p>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>
          <p>
            Your information is used solely to provide the chat service. Your name
            and profile picture are shown to other users you chat with. Your email
            address is never shared with other users.
          </p>
        </section>

        <section>
          <h2>3. Data Storage</h2>
          <p>
            All data is stored in Firebase Firestore, a Google Cloud service.
            Your messages and profile data are encrypted in transit and at rest.
            We do not sell, rent, or share your personal data with third parties.
          </p>
        </section>

        <section>
          <h2>4. Your Rights</h2>
          <p>
            You can request a copy of your data or ask us to delete your account
            and all associated messages at any time by contacting us. You may also
            delete individual conversations from within the app.
          </p>
        </section>

        <section>
          <h2>5. Cookies</h2>
          <p>
            We use Firebase Authentication cookies to keep you signed in. No
            third-party tracking cookies are used.
          </p>
        </section>

        <section>
          <h2>6. Contact</h2>
          <p>
            For questions about this privacy policy, contact us at
            privacy@smartschool-messenger.com.
          </p>
        </section>
      </div>
    </div>
  );
}
