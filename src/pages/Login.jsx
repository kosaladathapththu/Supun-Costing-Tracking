import { useState } from 'react';
import { LockKeyhole, ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
const message = code =>
  ({
    'auth/invalid-credential': 'Incorrect email address or password.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/network-request-failed': 'Unable to connect to Firebase. Check your internet connection.',
  })[code] || 'Unable to sign in. Please check your credentials.';
export default function Login() {
  const { login, resetPassword } = useApp();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault();
    if (!email || !password) return setError('Enter your email and password.');
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(message(err.code));
    } finally {
      setLoading(false);
    }
  };
  const forgot = async () => {
    const address = email.trim();
    if (!address) return setError('Enter your email address first.');
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await resetPassword(address);
      setNotice('Password reset email sent. Check your inbox and spam folder.');
    } catch (err) {
      setError(message(err.code));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="brand-mark large">SG</div>
        <h1>
          Know the true cost.
          <br />
          <em>Price with confidence.</em>
        </h1>
        <p>
          A single source of truth for landed costs, pricing and profitability across Supun Group.
        </p>
        <div className="secure-note">
          <ShieldCheck />
          <span>
            <b>Secure financial workspace</b>
            <small>Protected by Firebase Authentication</small>
          </span>
        </div>
      </div>
      <form className="login-card" onSubmit={submit}>
        <div className="mobile-logo">
          <div className="brand-mark">SG</div>
          <b>SUPUN GROUP</b>
        </div>
        <span className="kicker">WELCOME BACK</span>
        <h2>Sign in to your account</h2>
        <p>Use the credentials registered by your administrator.</p>
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <div className="password">
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <LockKeyhole size={18} />
          </div>
        </label>
        {error && <div className="error">{error}</div>}
        {notice && <div className="login-notice">{notice}</div>}
        <button type="button" className="forgot-password" onClick={forgot} disabled={loading}>
          Forgot password?
        </button>
        <button disabled={loading} className="btn primary login-btn">
          {loading ? 'Signing in...' : 'Sign in'}
          <ArrowRight size={18} />
        </button>
        <small className="demo-hint">Firebase-secured company access</small>
      </form>
    </div>
  );
}
