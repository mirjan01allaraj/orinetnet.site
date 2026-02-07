export default function WhatsAppFloating(){
  const phone = "355686666419"; // change to your business number
  const url = `https://wa.me/${phone}?text=Pershendetje!%20Po%20ju%kontaktoj%20per.`;
  return (
    <a
      href={url}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[var(--brand)] text-black font-bold flex items-center justify-center shadow-lg"
      aria-label="WhatsApp"
      target="_blank"
      rel="noreferrer"
    >
      WA
    </a>
  );
}
