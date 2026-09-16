import Link from "next/link";

export default function HospitalActivatePage() {
  return (
    <main className="min-h-screen bg-background px-5 py-12">
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">CareLink Hôpital</p>
          <h1 className="text-3xl font-bold text-text-primary mt-2">Activer cet ordinateur</h1>
          <p className="text-text-secondary mt-2">
            Cette étape associera ce poste à l'organisation de l'hôpital et à sa licence.
          </p>
        </div>
        <div className="card space-y-3">
          <p className="font-semibold">Flux prévu</p>
          <ol className="list-decimal pl-5 text-sm text-text-secondary space-y-2">
            <li>Saisir la clé de licence fournie par CareLink.</li>
            <li>Vérifier l'abonnement et le nombre de postes autorisés.</li>
            <li>Enregistrer un identifiant unique pour cet ordinateur.</li>
            <li>Associer le poste à Accueil ou Médecin.</li>
          </ol>
        </div>
        <Link href="/hospital" className="btn-primary inline-flex">Retour à l'espace hôpital</Link>
      </div>
    </main>
  );
}
