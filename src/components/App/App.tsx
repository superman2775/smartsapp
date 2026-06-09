import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import NotificationProvider from '../../contexts/NotificationContext';
import Messenger from '../Messenger/Messenger';
import Login from '../Login/Login';
import Onboarding from '../Onboarding/Onboarding';
import ProfileSettings from '../ProfileSettings/ProfileSettings';
import PrivacyPolicy from '../Legal/PrivacyPolicy';
import TermsOfService from '../Legal/TermsOfService';
import type { Page } from '../../types';

export default function App() {
  const { user, loading, needsOnboarding } = useAuth();
  const [page, setPage] = useState<Page>('login');

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  // Show onboarding for new users before the messenger
  if (user && needsOnboarding) {
    return <Onboarding />;
  }

  if (!user) {
    if (page === 'privacy') {
      return <PrivacyPolicy onBack={() => setPage('login')} />;
    }
    if (page === 'terms') {
      return <TermsOfService onBack={() => setPage('login')} />;
    }
    return (
      <Login
        onPrivacy={() => setPage('privacy')}
        onTerms={() => setPage('terms')}
      />
    );
  }

  if (page === 'profile') {
    return <ProfileSettings onBack={() => setPage('messenger')} />;
  }
  if (page === 'privacy') {
    return <PrivacyPolicy onBack={() => setPage('messenger')} />;
  }
  if (page === 'terms') {
    return <TermsOfService onBack={() => setPage('messenger')} />;
  }

  return (
    <div className="App">
      <NotificationProvider userId={user.uid}>
        <Messenger
          user={user}
          onProfile={() => setPage('profile')}
          onPrivacy={() => setPage('privacy')}
          onTerms={() => setPage('terms')}
        />
      </NotificationProvider>
    </div>
  );
}
