import React, { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import { azureConfigured, devLoginEnabled } from '../../lib/auth';

const ERRORS: Record<string, string> = {
  AccessDenied: 'Your account is not allowed to use this app. Contact an administrator.',
  CredentialsSignin: 'Enter a valid email address.',
  OAuthCallback: 'Microsoft sign-in failed. Please try again.',
};

export default function SignInPage({ azure, dev }: { azure: boolean; dev: boolean }) {
  const router = useRouter();
  const callbackUrl = typeof router.query.callbackUrl === 'string' ? router.query.callbackUrl : '/';
  const error = typeof router.query.error === 'string' ? router.query.error : null;
  const [email, setEmail] = useState('');

  // Microsoft is the only option: go straight there. On Entra-joined Windows PCs (Edge, or Chrome with
  // Windows accounts enabled) and phones with Microsoft Authenticator this completes without a password prompt.
  useEffect(() => {
    if (azure && !dev && !error && router.isReady) signIn('azure-ad', { callbackUrl });
  }, [azure, dev, error, router.isReady]);

  return (
    <div style={{ maxWidth: 420, margin: '8vh auto 0' }}>
      <div className="card">
        <h1 style={{ fontSize: '1.4rem' }}>Sign in</h1>
        <p className="hint">Use your work account to reserve desks and manage your assigned seat.</p>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{ERRORS[error] || 'Sign-in failed. Please try again.'}</div>}

        {azure && (
          <button className="btn-primary" style={{ width: '100%', padding: '12px' }} onClick={() => signIn('azure-ad', { callbackUrl })}>
            Sign in with Microsoft
          </button>
        )}

        {dev && (
          <form
            style={{ marginTop: azure ? 24 : 8, paddingTop: azure ? 16 : 0, borderTop: azure ? '1px solid var(--border)' : undefined }}
            onSubmit={(e) => { e.preventDefault(); signIn('dev', { email, callbackUrl }); }}
          >
            <div className="field">
              <label htmlFor="email">Development login (email)</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required style={{ maxWidth: 'none' }} />
            </div>
            <button type="submit" style={{ width: '100%' }}>Continue</button>
            <p className="hint" style={{ marginTop: 8, marginBottom: 0 }}>Enabled by AUTH_DEV_LOGIN. Not available in production.</p>
          </form>
        )}

        {!azure && !dev && (
          <div className="alert alert-error">
            No sign-in method is configured. Set the AZURE_AD_* variables (or AUTH_DEV_LOGIN=true for local development) in .env.
          </div>
        )}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: { azure: azureConfigured, dev: devLoginEnabled } });
