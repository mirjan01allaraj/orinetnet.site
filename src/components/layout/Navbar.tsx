"use client";

import { usePathname, useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  function handlePaketatClick(e: React.MouseEvent) {
    e.preventDefault();

    // If already on homepage → just scroll
    if (pathname === "/") {
      scrollToPlans();
    } else {
      // Go home first, then scroll
      router.push("/");

      // wait for page to mount
      setTimeout(scrollToPlans, 300);
    }
  }

  function scrollToPlans() {
    const recommender = document.getElementById("plan-recommender");
    const plans = document.getElementById("plans");

    if (recommender) {
      recommender.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // small delay → then align plans nicely
    if (plans) {
      setTimeout(() => {
        plans.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 500);
    }
  }

  return (
    <header className="border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" className="font-bold tracking-wide">
          <span className="text-[var(--brand)]">ORIENT</span> NET
        </a>

        <nav className="flex gap-5 text-sm text-[var(--muted)]">
          <a
            href="/"
            onClick={handlePaketatClick}
            className="hover:text-white cursor-pointer"
          >
            Paketat
          </a>

          <a
            href="/checkout?plan=turbo"
            className="hover:text-white"
          >
            Checkout
          </a>
        </nav>
      </div>
    </header>
  );
}
