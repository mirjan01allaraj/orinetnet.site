export default function Cancel(){
  return (
    <div className="px-6 py-16 max-w-2xl mx-auto text-center">
      <h1 className="text-3xl font-bold">Pagesa u anulua</h1>
      <p className="text-[var(--muted)] mt-3">
        Nuk u krye asnjë pagesë. Mund të provosh përsëri.
      </p>
      <a className="inline-block mt-8 px-5 py-3 rounded-xl border border-[var(--border)]" href="/checkout">
        Kthehu te Checkout
      </a>
    </div>
  );
}
