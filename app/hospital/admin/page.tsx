import Link from "next/link";

const sections = [
  ["Licence & abonnement", "/hospital/subscription"],
  ["Appareils autorisés", "/hospital/activate"],
  ["Postes d'accueil", "/hospital/reception"],
  ["Personnel et médecins", "/hospital/doctor"],
];

export default function HospitalAdminPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm font-medium text-primary">Administration</p>
        <h1 className="text-3xl font-bold text-text-primary mt-2">Organisation de l'hôpital</h1>
        <p className="text-text-secondary mt-2 mb-8">
          Le compte hôpital devient l'organisation centrale. Les agents et médecins auront ensuite leurs comptes individuels.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map(([label, href]) => (
            <Link key={href} href={href} className="card hover:shadow-card transition">
              <h2 className="font-semibold text-text-primary">{label}</h2>
              <p className="text-sm text-text-secondary mt-1">Configurer cette partie de l'organisation.</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
