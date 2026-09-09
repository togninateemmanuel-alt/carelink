# CareLink + Supabase

Le dépôt contient le schéma CareLink et ses migrations sous `supabase/`.

## Projet Supabase de développement

Le projet distant a été aligné le 9 septembre 2026 avec le modèle utilisé par l'application, sans suppression des données existantes.

La migration d'alignement est :

`supabase/migrations/20260909103439_align_carelink_schema_with_github.sql`

## Important

- Ne jamais committer une clé `service_role` ou une clé secrète.
- Les applications clientes utilisent la clé publishable/anon via les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
- Les tables exposées doivent conserver RLS activé.
- `supabase/carelink_full_schema.sql` reste la référence complète du modèle CareLink historique; les migrations versionnées sont la source de vérité pour les changements successifs.
