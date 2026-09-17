import Link from "next/link";

export default function HospitalUnauthorizedPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-12 flex items-center justify-center">
      <div className="card max-w-lg w-full text-center">
        <h1 className="text-2xl font-bold text-text-primary">Accès non autorisé</h1>
        <p className="text-text-secondary mt-3">Cet ordinateur n'a pas encore reçu l'autorisation nécessaire pour cette section de CareLink Hôpital.</p>
        <div className="flex gap-3 justify-center mt-6">
          <Link href="/hospital/activate" className="btn-primary">Voir l'état du poste</Link>
          <Link href="/hospital" className="px-4 py-2 rounded-lg border border-border">Retour</Link>
        </div>
      </div>
    </main>
  );
}
