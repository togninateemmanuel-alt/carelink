<template>
  <main class="page">
    <section class="card">
      <div class="logo">CL</div>
      <p class="eyebrow">CareLink</p>
      <h1>Portail Pharmacie</h1>
      <p class="description">
        Suivez vos stocks, traitez les ordonnances et gérez les commandes depuis un espace sécurisé.
      </p>
      <div class="notice">
        La connexion Supabase est requise pour synchroniser les données de votre officine.
      </div>
    </section>
  </main>
</template>

<style>
:root { font-family: Inter, system-ui, sans-serif; color: #102a43; background: #f5f8fc; }
* { box-sizing: border-box; }
body { margin: 0; }
.page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: linear-gradient(135deg, #eefbf8, #f5fbff); }
.card { width: min(100%, 640px); padding: 48px; border-radius: 24px; background: #fff; box-shadow: 0 20px 50px rgb(20 70 120 / 12%); }
.logo { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 16px; color: #fff; font-weight: 800; background: linear-gradient(135deg, #0aa38c, #1677e8); }
.eyebrow { margin: 28px 0 6px; font-weight: 700; color: #0a8f7a; }
h1 { margin: 0; font-size: clamp(2rem, 6vw, 3.25rem); }
.description { margin: 18px 0 28px; color: #52667a; font-size: 1.05rem; line-height: 1.65; }
.notice { padding: 16px; border-radius: 12px; color: #075c51; background: #e7f8f4; font-size: .95rem; }
</style>
