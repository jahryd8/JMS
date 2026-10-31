import { Lock, User } from 'lucide-react';

interface Props {
  darkMode: boolean;
  loginUsername: string;
  setLoginUsername: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  loginError: string;
  isLoggingIn: boolean;
  showWakingMessage: boolean;
  handleLogin: (e: React.FormEvent) => void;
}

export default function LoginScreen({
  darkMode, loginUsername, setLoginUsername, loginPassword, setLoginPassword,
  loginError, isLoggingIn, showWakingMessage, handleLogin,
}: Props) {
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${
      darkMode ? 'bg-slate-950 text-white' : 'bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 text-slate-900'
    }`}>
      <div className={`w-full max-w-md p-8 rounded-2xl shadow-2xl border transition-all duration-300 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-purple-200'
      }`}>
        <div className="flex items-center justify-center mb-6">
          <div className={`p-3 rounded-full ${darkMode ? 'bg-blue-600/10 border border-blue-500/30' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
            <Lock className={`w-6 h-6 ${darkMode ? 'text-blue-500' : 'text-white'}`} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-1">JMS Server</h1>
        <p className={`text-sm text-center mb-6 ${textMuted}`}>Authorized Private Server Access Only</p>

        {loginError && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Username</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text" value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border transition ${
                  darkMode ? 'bg-slate-800/80 border-slate-700 text-white focus:border-blue-500'
                            : 'bg-slate-50 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                }`}
                placeholder="Enter username" disabled={isLoggingIn} autoComplete="username" required
              />
            </div>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password" value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border transition ${
                  darkMode ? 'bg-slate-800/80 border-slate-700 text-white focus:border-blue-500'
                            : 'bg-slate-50 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                }`}
                placeholder="••••••••" disabled={isLoggingIn} autoComplete="current-password" required
              />
            </div>
          </div>
          <button
            type="submit" disabled={isLoggingIn}
            className={`w-full py-2.5 rounded-xl text-white text-sm font-semibold transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait ${
              darkMode ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/30'
            }`}
          >
            {isLoggingIn ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Connecting...</>
            ) : ('Sign In to JMS')}
          </button>
          {showWakingMessage && (
            <p className={`text-[11px] text-center mt-2 animate-pulse ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              Waking up the server — this can take up to 50 seconds on the first login...
            </p>
          )}
        </form>
      </div>
    </div>
  );
}