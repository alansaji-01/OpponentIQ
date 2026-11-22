import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Brain, Lock, User as UserIcon, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/opponents');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials or connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-bg-card border border-border rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-3">
            <Brain className="w-7 h-7 text-bg-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">OpponentIQ</h1>
          <p className="text-sm text-text-secondary mt-1">Sign in to tactical workspace</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg flex items-center gap-2 text-danger text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Username</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                placeholder="Username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                placeholder="Password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-bg-primary font-semibold py-2.5 rounded-lg text-sm transition-colors mt-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 border-t border-border pt-4 text-center">
          <p className="text-xs text-text-muted">
            Default test account: <span className="text-accent font-mono">admin / admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
