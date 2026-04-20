import { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import BuildKontrolLogo from '../shared/BuildKontrolLogo';

interface LoginViewProps {
  onLogin: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    const result = await onLogin(username.trim(), password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'Credenciales incorrectas');
    }
  }

  return (
    <div
      className="h-screen w-full flex items-center justify-end overflow-hidden relative"
      style={{
        background: `
          radial-gradient(ellipse at 65% 45%, rgba(194, 128, 48, 0.55) 0%, transparent 55%),
          radial-gradient(ellipse at 20% 80%, rgba(80, 45, 10, 0.4) 0%, transparent 50%),
          linear-gradient(155deg, #0e0904 0%, #251408 20%, #4a2b0d 45%, #6b3e14 60%, #3a2008 80%, #150b03 100%)
        `,
      }}
    >
      {/* Subtle grid texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(255,255,255,0.03) 0,rgba(255,255,255,0.03) 1px,transparent 0,transparent 48px),' +
            'repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0,rgba(255,255,255,0.03) 1px,transparent 0,transparent 48px)',
        }}
      />

      {/* Login card */}
      <div className="relative z-10 m-10 mr-14 bg-white rounded-2xl shadow-2xl p-8 w-72 flex-shrink-0">
        <div className="flex justify-center mb-7">
          <BuildKontrolLogo />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-colors"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-colors"
                autoComplete="current-password"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full flex items-center justify-center gap-2 bg-[#1e2d45] text-white text-sm font-semibold py-3 rounded-lg hover:bg-[#14203a] active:scale-[0.98] transition-all disabled:opacity-50 mt-1"
          >
            <LogIn size={15} />
            {loading ? 'Ingresando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
          >
            Olvidaste tu contraseña?
          </button>
        </div>
      </div>
    </div>
  );
}
