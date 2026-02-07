import Navbar from "@/components/layout/Navbar";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export default function CheckoutPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-3xl md:text-4xl font-extrabold">Checkout</h1>
        <p className="mt-2 text-[var(--muted)]">
          Plotëso të dhënat dhe përfundo aplikimin.
        </p>

        <div className="mt-8">
          <CheckoutForm />
        </div>
      </main>
    </>
  );
}
