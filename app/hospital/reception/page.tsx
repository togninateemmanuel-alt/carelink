import Link from "next/link";

export default function HospitalReceptionPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm font-medium text-primary">Accueil</p>
        <h1 className="text-3xl font-bold text-text-primary mt-2">Postes d'accueil</h1>
        <p className="text-text-secondary mt-2">
          Cette zone accueillera les postes Accueil 1, Accueil 2, etc., avec leur configuration de symptômes et leur file de dossiers.
        </p>
        <div className="card mt-6 space-y-3">
          <p className="font-semibold">Configuration prévue</p>
          <ul className="list-disc pl-5 text-sm text-text-secondary space-y-2">
            <li>Créer plusieurs postes d'accueil.</li>
            <li>Associer des symptômes à chaque poste.</li>
            <li>Recevoir automatiquement les dossiers correspondants.</li>
            <li>Contrôler les champs obligatoires.</li>
            <li>Demander une correction ou valider le dossier.</li>
            <li>Planifier la spécialité, le médecin, la date et l'heure.</li>
          </ul>
        </div>
        <Link href="/hospital/admin" className="text-primary font-medium inline-block mt-5">← Administration</Link>
      </div>
    </main>
  );
}
