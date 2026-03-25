import { useState } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const meQuery = useQuery({
    queryKey: ['auth-me'],
    queryFn: authService.me,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ user, pass }: { user: string; pass: string }) => authService.login(user, pass),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: ({ user, pass }: { user: string; pass: string }) => authService.register(user, pass),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
  });

  if (meQuery.isLoading) {
    return <div className="min-h-screen bg-zinc-950 px-6 py-10 text-sm text-slate-400">Checking session...</div>;
  }

  if (meQuery.data?.user) {
    return (
      <div className="min-h-screen">
        <div className="fixed right-4 top-3 z-50 text-xs text-slate-300">
          <button
            className="rounded border border-white/10 bg-zinc-900/80 px-2 py-1 hover:text-white"
            onClick={async () => {
              await authService.logout();
              await queryClient.invalidateQueries({ queryKey: ['auth-me'] });
            }}
          >
            Logout {meQuery.data.user.username}
          </button>
        </div>
        {children}
      </div>
    );
  }

  const pending = loginMutation.isPending || registerMutation.isPending;
  const error =
    (loginMutation.error instanceof Error ? loginMutation.error.message : null)
    || (registerMutation.error instanceof Error ? registerMutation.error.message : null)
    || (meQuery.error instanceof Error ? meQuery.error.message : null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-xl">
        <p className="text-lg font-semibold text-white">{mode === 'login' ? 'Login' : 'Register'}</p>
        <p className="mt-1 text-xs text-slate-400">Sign in to access user-scoped dashboard data.</p>
        <div className="mt-4 space-y-3">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            className="w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
          />
          {error ? <p className="rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}
          <button
            className="w-full rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:opacity-50"
            disabled={pending}
            onClick={() => {
              if (!username.trim() || !password) return;
              if (mode === 'login') {
                loginMutation.mutate({ user: username.trim(), pass: password });
                return;
              }
              registerMutation.mutate({ user: username.trim(), pass: password });
            }}
          >
            {pending ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
          </button>
          <button
            className="w-full text-xs text-slate-400 hover:text-slate-200"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
