"use client";

import { useEffect, useState } from "react";
import type { User } from "../_lib/types";

type Tab = "dashboard" | "klientet" | "reports" | "users" | "add_customer";

type Props = {
  user: User;
  tab: Tab;
  setTab: (t: Tab) => void;
  doLogout: () => void;
};

export default function HeaderBar({ user, tab, setTab, doLogout }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [tab]);

  function goToTab(nextTab: Tab) {
    setTab(nextTab);
    setMobileMenuOpen(false);
  }

  function handleLogout() {
    setMobileMenuOpen(false);
    doLogout();
  }

  const adminLinks = [
    { key: "dashboard" as const, label: "Dashboard" },
    { key: "klientet" as const, label: "Klientët" },
    { key: "reports" as const, label: "Reports" },
    { key: "users" as const, label: "Users" },
    { key: "add_customer" as const, label: "Shto Klient" },
  ];

  return (
    <header className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xl font-semibold sm:text-2xl">Pagesat</div>
          <div className="mt-1 text-sm text-white/70">
            {user.point_name} • {user.role === "admin" ? "Admin" : "Point"}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="inline-flex shrink-0 items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 md:hidden"
        >
          {mobileMenuOpen ? "✕ Mbyll" : "☰ Menu"}
        </button>
      </div>

      <div className="mt-4 hidden items-center gap-2 flex-wrap justify-end md:flex">
        {user.role === "admin" ? (
          <>
            {adminLinks.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`rounded-xl border border-white/10 px-4 py-2 ${
                  tab === item.key
                    ? "bg-white/15"
                    : "bg-white/5 hover:bg-white/10"
                }`}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </button>
            ))}

            <a
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
              href="/pagesat/import/"
            >
              Import / Export
            </a>
          </>
        ) : (
          <button
            type="button"
            className={`rounded-xl border border-white/10 px-4 py-2 ${
              tab === "dashboard"
                ? "bg-white/15"
                : "bg-white/5 hover:bg-white/10"
            }`}
            onClick={() => setTab("dashboard")}
          >
            Dashboard
          </button>
        )}

        <button
          type="button"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10"
          onClick={doLogout}
        >
          Dil
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4 md:hidden">
          {user.role === "admin" ? (
            <>
              {adminLinks.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`block w-full rounded-xl border border-white/10 px-4 py-3 text-left ${
                    tab === item.key
                      ? "bg-white/15"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                  onClick={() => goToTab(item.key)}
                >
                  {item.label}
                </button>
              ))}

              <a
                className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10"
                href="/pagesat/import/"
                onClick={() => setMobileMenuOpen(false)}
              >
                Import / Export
              </a>
            </>
          ) : (
            <button
              type="button"
              className={`block w-full rounded-xl border border-white/10 px-4 py-3 text-left ${
                tab === "dashboard"
                  ? "bg-white/15"
                  : "bg-white/5 hover:bg-white/10"
              }`}
              onClick={() => goToTab("dashboard")}
            >
              Dashboard
            </button>
          )}

          <button
            type="button"
            className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10"
            onClick={handleLogout}
          >
            Dil
          </button>
        </div>
      )}
    </header>
  );
}