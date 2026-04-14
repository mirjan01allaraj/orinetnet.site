"use client";

type Props = {
  username: string;
  password: string;
  loginErr: string | null;
  loginBusy: boolean;
  setUsername: (v: string) => void;
  setPassword: (v: string) => void;
  doLogin: () => void;
};

export default function LoginView({
  username,
  password,
  loginErr,
  loginBusy,
  setUsername,
  setPassword,
  doLogin,
}: Props) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-2xl font-semibold">Pagesat — Portal</div>
        <div className="mt-1 text-white/70 text-sm">Hyrja kërkohet për akses.</div>

        <div className="mt-6 space-y-3">
          <input
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {loginErr && <div className="text-red-300 text-sm">{loginErr}</div>}

          <button
            onClick={doLogin}
            disabled={loginBusy}
            className="w-full rounded-xl bg-[#27BCD8] text-black font-semibold py-3 disabled:opacity-60"
          >
            {loginBusy ? "Duke hyrë…" : "Hyr"}
          </button>
        </div>
      </div>
    </div>
  );
}