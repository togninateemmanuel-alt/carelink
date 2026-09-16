import Link from "next/link";

export default function HospitalDoctorPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm font-medium text-primary">Médecin</p>
        <h1 className="text-3xl font-bold text-text-primary mt-2">Espace médecin</h1>
        <p className="text-text-secondary mt-2">
          Le médecin verra ici les dossiers qui lui sont affectés pour la journée et pourra terminer la consultation sans repasser par l'accueil.
        </p>
        <div className="card mt-6 space-y-3">
          <p className="font-semibold">Flux prévu</p>
          <ul className="list-disc pl-5 text-sm text-text-secondary space-y-2">
            <li>Afficher les patients programmés aujourd'hui.</li>
            <li>Ouvrir le dossier patient complet.</li>
            <li>Renseigner consultation, constantes et compte-rendu.</li>
            <li>Créer et signer l'ordonnance.</li>
            <li>Publier directement le résultat dans l'espace patient.</li>
          </ul>
        </div>
        <Link href="/hospital/admin" className="text-primary font-medium inline-block mt-5">← Administration</Link>
      </div>
    </main>
  );
}
