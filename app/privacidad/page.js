import Link from "next/link";
import PrivacyContent from "../components/PrivacyContent";

export const metadata = {
  title: "Política de privacidad · AeroGuía",
  description: "Cómo trata AeroGuía la ubicación, el clima y las consultas de vuelo."
};

export default function PrivacidadPage() {
  return (
    <main className="legal">
      <PrivacyContent />
      <p><Link href="/">Volver a AeroGuía</Link></p>
    </main>
  );
}
