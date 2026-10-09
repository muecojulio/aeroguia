import Link from "next/link";
import PrivacyContent from "../components/PrivacyContent";

export const metadata = {
  title: "Política de privacidad · AeroGuía",
  description: "Qué datos utiliza AeroGuía, cuándo se consulta tu ubicación y qué servicios externos participan."
};

export default function PrivacidadPage() {
  return (
    <main className="legal">
      <PrivacyContent />
      <p><Link href="/">Volver a AeroGuía</Link></p>
    </main>
  );
}
