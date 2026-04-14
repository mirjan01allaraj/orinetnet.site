"use client";

import { useEffect, useState } from "react";

type Props = {
  api: <T>(path: string, opts?: RequestInit) => Promise<T>;
};

export default function UsersView({ api }: Props) {
  const [usersBusy, setUsersBusy] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [points, setPoints] = useState<string[]>([]);
  const [userMsg, setUserMsg] = useState<string | null>(null);

  const [newU, setNewU] = useState({
    username: "",
    password: "",
    role: "point",
    point_name: "",
  });

  async function fetchPoints() {
    const r = await api<{ ok: boolean; points?: string[] }>("/users_manage.php", {
      method: "POST",
      body: JSON.stringify({ action: "list_points" }),
    });
    if (r.ok && r.points) setPoints(r.points);
  }

  async function loadUsers() {
    setUsersBusy(true);
    try {
      const r = await api<{ ok: boolean; users?: any[] }>("/users_manage.php", {
        method: "POST",
        body: JSON.stringify({ action: "list" }),
      });
      setUsersList(r.users || []);
    } finally {
      setUsersBusy(false);
    }
  }

  async function createUser() {
    setUserMsg(null);
    setUsersBusy(true);
    try {
      const r = await api<any>("/users_manage.php", {
        method: "POST",
        body: JSON.stringify({ action: "create", ...newU }),
      });

      if (!r.ok) return setUserMsg(`Gabim: ${r.error || "CREATE_FAILED"}`);

      setUserMsg("User u krijua me sukses.");
      setNewU({ username: "", password: "", role: "point", point_name: "" });
      await loadUsers();
      await fetchPoints();
    } finally {
      setUsersBusy(false);
    }
  }

  async function setUserActive(id: number, is_active: 0 | 1) {
    setUsersBusy(true);
    try {
      const r = await api<any>("/users_manage.php", {
        method: "POST",
        body: JSON.stringify({ action: "set_active", id, is_active }),
      });
      if (!r.ok && r.error) setUserMsg(`Gabim: ${r.error}`);
      await loadUsers();
      await fetchPoints();
    } finally {
      setUsersBusy(false);
    }
  }

  async function resetUserPassword(id: number) {
    setUserMsg(null);
    setUsersBusy(true);
    try {
      const r = await api<any>("/users_manage.php", {
        method: "POST",
        body: JSON.stringify({ action: "reset_password", id }),
      });
      if (r.ok && r.temp_password) setUserMsg(`Password i ri (temporary): ${r.temp_password}`);
      else setUserMsg("Gabim në reset.");
    } finally {
      setUsersBusy(false);
    }
  }

  async function deleteUser(id: number) {
    setUserMsg(null);
    if (!confirm("Ta fshij këtë user? Kjo nuk kthehet mbrapsht.")) return;

    setUsersBusy(true);
    try {
      const r = await api<any>("/users_manage.php", {
        method: "POST",
        body: JSON.stringify({ action: "delete_user", id }),
      });

      if (!r.ok) {
        setUserMsg(`Gabim: ${r.error || "DELETE_FAILED"}`);
        return;
      }

      setUserMsg("User u fshi me sukses.");
      await loadUsers();
      await fetchPoints();
    } finally {
      setUsersBusy(false);
    }
  }

  useEffect(() => {
    loadUsers();
    fetchPoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Neon button base
  const neonBase =
    "rounded-lg px-3 py-2 font-semibold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_0_18px_rgba(0,0,0,0.2)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* CREATE */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="font-semibold">Krijo User</div>

        <div className="mt-3 space-y-3">
          <input
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
            placeholder="Username"
            value={newU.username}
            onChange={(e) => setNewU((s) => ({ ...s, username: e.target.value }))}
          />

          <input
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
            placeholder="Password"
            type="text"
            value={newU.password}
            onChange={(e) => setNewU((s) => ({ ...s, password: e.target.value }))}
          />

          <select
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
            value={newU.role}
            onChange={(e) => setNewU((s) => ({ ...s, role: e.target.value }))}
          >
            <option value="point">point</option>
            <option value="admin">admin</option>
          </select>

          <input
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
            placeholder="Point name (p.sh. Pika - Kombinat)"
            value={newU.point_name}
            onChange={(e) => setNewU((s) => ({ ...s, point_name: e.target.value }))}
            list="points"
          />

          <datalist id="points">
            {points.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>

          <button
            className="w-full rounded-xl bg-[#27BCD8] text-black font-semibold py-3 shadow-[0_0_24px_rgba(39,188,216,0.35)] hover:brightness-110 transition disabled:opacity-60"
            onClick={createUser}
            disabled={usersBusy}
          >
            Krijo
          </button>

          {userMsg && <div className="text-sm text-white/80">{userMsg}</div>}
        </div>
      </div>

      {/* LIST */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Users</div>
          <button
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10 disabled:opacity-60"
            onClick={loadUsers}
            disabled={usersBusy}
          >
            Refresh
          </button>
        </div>

        <div className="mt-3 space-y-2 max-h-[520px] overflow-auto">
          {usersList.map((u: any) => {
            const isDisabled = !u.is_active;

            return (
              <div key={u.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {u.username} <span className="text-white/60 text-sm">({u.role})</span>
                    </div>
                    <div className="text-white/60 text-sm">{u.point_name}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* RESET PW — neon purple */}
                    <button
                      className={`${neonBase} bg-fuchsia-400 shadow-[0_0_18px_rgba(232,121,249,0.45)] hover:brightness-110`}
                      onClick={() => resetUserPassword(u.id)}
                      disabled={usersBusy}
                      title="Reset password"
                    >
                      Reset PW
                    </button>

                    {/* ENABLE/DISABLE — neon amber for disable, neon green for enable */}
                    {u.is_active ? (
                      <button
                        className={`${neonBase} bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)] hover:brightness-110`}
                        onClick={() => setUserActive(u.id, 0)}
                        disabled={usersBusy}
                        title="Disable user"
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        className={`${neonBase} bg-lime-400 shadow-[0_0_18px_rgba(163,230,53,0.45)] hover:brightness-110`}
                        onClick={() => setUserActive(u.id, 1)}
                        disabled={usersBusy}
                        title="Enable user"
                      >
                        Enable
                      </button>
                    )}

                    {/* DELETE — only if user is disabled and role is point */}
                    {isDisabled && u.role === "point" && (
                      <button
                        className={`${neonBase} bg-rose-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.45)] hover:brightness-110`}
                        onClick={() => deleteUser(u.id)}
                        disabled={usersBusy}
                        title="Delete user (only when disabled)"
                      >
                        DELETE
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-white/40 text-xs mt-2">
                  Status: {u.is_active ? "Active" : "Disabled"}
                </div>
              </div>
            );
          })}

          {!usersList.length && <div className="text-white/50 text-sm">S’ka user-a.</div>}
        </div>
      </div>
    </div>
  );
}