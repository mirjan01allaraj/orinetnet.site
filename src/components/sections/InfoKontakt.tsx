"use client";

type Pill = {
  title: string;
  subtitle: string;
  href?: string;
  targetBlank?: boolean;
  ariaLabel?: string;
  icon: React.ReactNode;

  // neon theme
  glow: string; // rgba(...)
  fill: string; // gradient background
};

function cx(...arr: Array<string | false | undefined>) {
  return arr.filter(Boolean).join(" ");
}

const MAPS_LINK = "https://maps.app.goo.gl/SxqJApTCJ8DJzwXv8";
const OFFICE_EMAIL = "orientnetal@gmail.com";
const OFFICE_TEL = "+355 68 6666 419";

// Desktop Gmail compose (md+)
const GMAIL_COMPOSE = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
  OFFICE_EMAIL
)}`;

// Mobile default mail app (<md)
const MAILTO = `mailto:${OFFICE_EMAIL}`;

// WhatsApp
const WHATSAPP_TEXT = "Pershendetje ORIENT NET ! Po ju kontaktoj per ";
const WHATSAPP_LINK = `https://wa.me/355686666419?text=${encodeURIComponent(
  WHATSAPP_TEXT
)}`;

const ICONS = {
  map: (
    <svg viewBox="0 0 24 24" fill="none" className="h-11 w-11">
      <path
        d="M10 21s-6-4.35-6-10a6 6 0 0 1 12 0c0 5.65-6 10-6 10Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M10 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" className="h-11 w-11">
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M6.5 7.5 12 12l5.5-4.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" fill="none" className="h-11 w-11">
      <path
        d="M8.5 3.5 6.9 5.1c-.6.6-.8 1.5-.5 2.3 1.2 3.2 3.9 5.9 7.1 7.1.8.3 1.7.1 2.3-.5l1.6-1.6c.6-.6.6-1.6 0-2.2l-1.4-1.4c-.5-.5-1.3-.6-1.9-.2l-.8.5c-1-.5-1.9-1.4-2.4-2.4l.5-.8c.4-.6.3-1.4-.2-1.9L10.7 3.5c-.6-.6-1.6-.6-2.2 0Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 5.5a5 5 0 0 1 4 4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" className="h-11 w-11">
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

function PillCard({ pill }: { pill: Pill }) {
  const Tag = pill.href ? "a" : "div";

  return (
    <Tag
      {...(pill.href
        ? {
            href: pill.href,
            target: pill.targetBlank ? "_blank" : undefined,
            rel: pill.targetBlank ? "noopener noreferrer" : undefined,
            "aria-label": pill.ariaLabel,
          }
        : {})}
      className={cx(
        "glass-card relative overflow-hidden rounded-[18px]",
        "px-7 py-7 md:px-9 md:py-9",
        "transition-all duration-300 will-change-transform",
        "group"
      )}
      style={{
        // neon fill
        background: pill.fill,
        borderColor: "rgba(255,255,255,0.14)",
        boxShadow: `0 22px 70px rgba(0,0,0,0.55)`,
      }}
    >
      {/* glow */}
      <div
        className="pointer-events-none absolute -inset-8 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle, ${pill.glow}, transparent 60%)` }}
      />

      {/* hover lift */}
      <div className="pointer-events-none absolute inset-0 transition-transform duration-300 group-hover:scale-[1.02]" />

      <div className="relative flex flex-col items-center text-center">
        <div className="text-[var(--brand)] drop-shadow-[0_0_18px_rgba(39,188,216,0.35)]">
          {pill.icon}
        </div>

        <div className="mt-4 text-lg md:text-xl font-extrabold tracking-wide">
          {pill.title}
        </div>

        <div className="mt-2 text-white/70 text-sm md:text-lg md:font-semibold leading-snug tracking-wide">
          {pill.subtitle}
        </div>
      </div>
    </Tag>
  );
}

export default function InfoKontakt() {
  // Two different email links based on breakpoint:
  // - mobile: mailto (default mail app)
  // - desktop: gmail compose
  const pills: Pill[] = [
    {
      title: "KU NDODHEMI",
      subtitle: `Rr "Demokracia" Paskuqan Tiranë`,
      href: MAPS_LINK,
      targetBlank: true,
      ariaLabel: "Hap vendndodhjen në Google Maps",
      icon: ICONS.map,
      glow: "rgba(34,211,238,0.55)", // cyan glow
      fill:
        "linear-gradient(180deg, rgba(10,22,34,0.72), rgba(10,22,34,0.48))",
    },
    {
      title: "EMAIL",
      subtitle: OFFICE_EMAIL,
      // we render both and switch with responsive helpers
      href: undefined,
      icon: ICONS.mail,
      glow: "rgba(167,139,250,0.55)", // purple glow
      fill:
        "linear-gradient(180deg, rgba(24,16,40,0.68), rgba(24,16,40,0.42))",
    },
    {
      title: "CEL / WHATSAPP",
      subtitle: OFFICE_TEL.replace("+", "+"),
      href: WHATSAPP_LINK,
      targetBlank: true,
      ariaLabel: "Hap WhatsApp chat",
      icon: ICONS.phone,
      glow: "rgba(74,222,128,0.50)", // green glow
      fill:
        "linear-gradient(180deg, rgba(10,30,22,0.70), rgba(10,30,22,0.44))",
    },
    {
      title: "ORARI",
      subtitle: "Hënë–Premte: 9:00–23:00 • Shtunë–Djelë: 9:00–17:00",
      icon: ICONS.clock,
      glow: "rgba(251,146,60,0.55)", // orange glow
      fill:
        "linear-gradient(180deg, rgba(38,22,10,0.68), rgba(38,22,10,0.42))",
    },
  ];

  return (
    <section className="relative py-16" id="kontakt">
      <div className="max-w-6xl mx-auto px-6">
        <h3 className="text-2xl md:text-3xl font-extrabold">INFO / KONTAKT</h3>
        <p className="mt-2 text-[var(--muted)]">
          Na kontakto! INFO Location, Email, WhatsApp dhe Orari.
        </p>

        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1: MAP */}
          <PillCard pill={pills[0]} />

          {/* 2: EMAIL (mobile mailto, desktop gmail compose) */}
          <div className="glass-card relative overflow-hidden rounded-[18px] px-7 py-7 md:px-9 md:py-9 group transition-all duration-300">
            <div
              className="pointer-events-none absolute -inset-8 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(circle, rgba(167,139,250,0.55), transparent 60%)",
              }}
            />
            <div className="relative flex flex-col items-center text-center">
              <div className="text-[var(--brand)] drop-shadow-[0_0_18px_rgba(39,188,216,0.35)]">
                {ICONS.mail}
              </div>

              <div className="mt-4 text-lg md:text-xl font-extrabold tracking-wide">
                EMAIL
              </div>

              <div className="mt-2 text-white/70 text-sm md:text-base leading-snug">
                {OFFICE_EMAIL}
              </div>

              {/* Mobile: mailto */}
              <a
                href={MAILTO}
                className="mt-4 inline-flex md:hidden items-center justify-center rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10"
                aria-label="Dërgo email (mobile)"
              >
                Dërgo Email
              </a>

              {/* Desktop: Gmail compose */}
              <a
                href={GMAIL_COMPOSE}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 hidden md:inline-flex items-center justify-center rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10"
                aria-label="Hap Gmail compose (desktop)"
              >
                Hap Gmail
              </a>
            </div>
          </div>

          {/* 3: WHATSAPP (also works like a call alternative) */}
          <PillCard pill={pills[2]} />

          {/* 4: HOURS (no link) */}
          <PillCard pill={pills[3]} />
        </div>

        {/* Optional tiny helper row under pills */}
        <div className="mt-5 text-xs text-white/40">
          * WhatsApp hapet direkt me mesazh të paraplotësuar.
        </div>
      </div>
    </section>
  );
}
