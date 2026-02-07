export default function Footer(){
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-[var(--muted)]">
        © {new Date().getFullYear()} ORIENT NET ISP
      </div>
    </footer>
  );
}
