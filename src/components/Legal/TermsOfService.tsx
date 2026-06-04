import { ArrowLeft } from 'lucide-react';
import styles from './Legal.module.css';

interface Props {
  onBack: () => void;
}

export default function TermsOfService({ onBack }: Props) {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <button className={styles.back} onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1>Terms of Service</h1>
        <p className={styles.date}>Last updated: June 3, 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By using Smartschool Messenger, you agree to these Terms of Service. If you do not
            agree, please do not use the service.
          </p>
        </section>

        <section>
          <h2>2. Eligibility</h2>
          <p>
            You must be at least 13 years old to use Smartschool Messenger. By signing in, you
            represent that you meet this requirement.
          </p>
        </section>

        <section>
          <h2>3. User Conduct</h2>
          <p>
            You agree not to use Smartschool Messenger to send spam, harass other users, share
            illegal content, or violate any applicable laws. We reserve the right
            to suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2>4. Intellectual Property</h2>
          <p>
            You retain ownership of the messages and content you create. By using
            the service, you grant us a limited license to store and display your
            content as necessary to provide the service.
          </p>
        </section>

        <section>
          <h2>5. Disclaimer</h2>
          <p>
            Smartschool Messenger is provided "as is" without warranties of any kind. We are
            not responsible for the content of messages exchanged between users.
          </p>
        </section>

        <section>
          <h2>6. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the
            service after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2>7. Contact</h2>
          <p>
            For questions about these terms, contact us at legal@smartschool-messenger.com.
          </p>
        </section>
      </div>
    </div>
  );
}
