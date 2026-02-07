export default function CTA(){
  return (
    <section className="max-w-6xl mx-auto px-6 pb-14">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold">Gati për lidhje?</h3>
          <p className="text-[var(--muted)] mt-1">Apliko online dhe ne të kontaktojmë menjëherë.</p>
        </div>
        <a className="px-5 py-3 rounded-xl bg-[var(--brand)] text-black font-semibold" href="/checkout?plan=turbo">
          Shko te Checkout
        </a>
      </div>
    </section>
  );
}
