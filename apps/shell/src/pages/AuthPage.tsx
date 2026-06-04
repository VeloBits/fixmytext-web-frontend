import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOidcAuth } from '@/auth/useOidcAuth';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { SocialButtons } from '@/components/auth/SocialButtons';
import '@/assets/css/auth.css';

type Tab = 'signin' | 'signup';

interface AuthPageProps {
  defaultTab?: Tab;
}

export function AuthPage({ defaultTab = 'signin' }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const { isAuthenticated, isLoading } = useOidcAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSuccess = () => {
    navigate('/', { replace: true });
  };

  if (isLoading) return null;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-text">FixMyText</span>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'signin'}
            className={`auth-tab${activeTab === 'signin' ? ' auth-tab--active' : ''}`}
            onClick={() => setActiveTab('signin')}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'signup'}
            className={`auth-tab${activeTab === 'signup' ? ' auth-tab--active' : ''}`}
            onClick={() => setActiveTab('signup')}
          >
            Sign up
          </button>
        </div>

        <div role="tabpanel">
          {activeTab === 'signin' ? (
            <LoginForm onSuccess={handleSuccess} />
          ) : (
            <SignupForm onSuccess={handleSuccess} />
          )}
        </div>

        <SocialButtons />
      </div>
    </div>
  );
}

export default AuthPage;
