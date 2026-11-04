# Croq

Guide indépendant des cartes françaises de McDonald's, Burger King, Quick et KFC. Interface responsive en français, photos officielles, nouveautés, recherche, filtres, favoris, fiches, allergènes, nutrition et avis étoilés.

Site publié : https://randomiii.github.io/croq/ · Dépôt : https://github.com/RandomIII/croq

## Offres et souvenirs

Le calendrier présente les offres récurrentes selon le jour et les horaires de Paris : Crazy mardi / Tuesday Deal de KFC, Mercredeal et Poulet du dimanche de Burger King. Les prix promotionnels sont accompagnés de leurs conditions. La carte, les offres et les souvenirs ont des collections distinctes.

Le planning montre les sept jours de la semaine en colonnes, avec les dates, le jour courant et les menus cliquables dans chaque rendez-vous. Les déclinaisons sont regroupées par `schedule.campaign` et `schedule.campaignTitle`. Les offres quotidiennes apparaissent sous la grille pour éviter de les répéter sept fois. Sur mobile, la grille défile horizontalement et « Voir aujourd'hui » recentre le jour courant. Les dates de début et de fin sont respectées pour chaque case ; les offres archivées ou incertaines restent exclues.

Le catalogue contient 1 291 fiches, incluant 9 anciennes éditions documentées et les références BK à dater. Ce total ne représente pas autant de produits actuellement vendus. Les dates documentées sont affichées ; les dates de fin inconnues ne sont pas inventées. Un tarif historique est étiqueté comme tel. Chaque référence possède son identifiant pour conserver ses avis, y compris après son archivage. Les allergènes d'une ancienne recette ne sont jamais déduits de la version actuelle.

### Collecte Burger King

`npm run refresh:bk` collecte la carte, les campagnes de l'accueil, les bons plans publics et leurs règlements, puis met à jour `public/data/products.json` et `supabase/seed.sql` sans reconstruire les autres enseignes. Aucun ajout spécifique de la Box Mystère n'est codé dans l'import. Les catégories `PRODUCT` et `MENU` sont parcourues ; les références hors rayon sont également conservées. Les 764 références BK dont la période reste inconnue sont conservées dans les données. Les références non datées sont masquées dans l'interface lorsqu'un produit du même nom normalisé existe dans la même enseigne sur la carte actuelle. Les recettes, tailles et variantes « + » restent distinctes, et les éditions historiques documentées restent visibles. La règle précède les filtres et s'applique aussi aux compteurs. Une campagne principale non reconnue arrête l'import explicitement.

Le rapport des sources et de la couverture se trouve dans `data/bk-import-report.json`. Le détail du défaut corrigé et des limites de la collecte est dans [l'audit BK](docs/BK_IMPORT_AUDIT.md). La commande constitue un rafraîchissement à la demande ; elle ne tourne pas automatiquement en continu.

Les entrées éditoriales et les menus supplémentaires sont dans `data/editions.json`. `tools/prepare-editions.mjs` reproduit leur préparation à partir des relevés locaux, puis `tools/build-catalogue.mjs` les intègre et génère `supabase/seed.sql`. Les archives antérieures sont conservées lors d'une reconstruction. Ne pas renommer leurs identifiants ni supprimer les anciennes lignes SQL. Après ajout, exécuter le seed idempotent dans Supabase avant de publier, afin que les nouvelles fiches acceptent les avis.

Les périodes explicites expirent automatiquement dans l'interface après leur dernier jour inclus. Une disparition d'un import ne suffit pas à prouver un retrait : les autres changements de statut demandent une vérification éditoriale. L'historique n'est pas exhaustif et il n'y a pas de suivi des stocks en temps réel. Un visuel éditorial clairement étiqueté remplace les photographies non documentées.

Projet autonome : le programme AI File Organizer n'est pas utilisé ou modifié. **Pour GitHub, publier uniquement le contenu de ce dossier `croq` dans un nouveau dépôt.** Ne pas publier le dépôt parent, qui contient des données personnelles.

## Lancer l'aperçu

Node.js 24, aucune installation de dépendances :

```powershell
cd croq
npm run dev
```

Ouvre http://localhost:5088. Ne pas ouvrir `index.html` directement : le catalogue utilise `fetch`.

```powershell
npm test
```

## Ce qui fonctionne et ce qui attend la configuration

- Le catalogue, les photos, les nouveautés, la recherche et les filtres fonctionnent immédiatement.
- Les favoris sont conservés dans le navigateur. Ils ne sont pas synchronisés avec Discord.
- Les avis sont **partagés et persistants dans Supabase**, jamais simulés ou enregistrés seulement en local. Leur publication attend un projet Supabase configuré.
- Le code gère la connexion Discord, la modification d'un avis par produit, la suppression d'avis, les signalements, la déconnexion et la suppression du compte.
- Aucune note, aucun nombre d'utilisateurs et aucun avis fictif ne sont préremplis.

## Activer Discord et les avis

1. Créer un projet sur https://supabase.com/dashboard.
2. Exécuter `supabase/schema.sql`, puis `supabase/seed.sql` dans le SQL Editor. Le schéma est prévu pour un **nouveau** projet, pas pour être réexécuté sur une base existante.
3. Dans https://discord.com/developers/applications, créer une application. Dans OAuth2, ajouter la redirection `https://TON-PROJET.supabase.co/auth/v1/callback`.
4. Dans Supabase, Authentication > Sign In / Providers > Discord, activer Discord et renseigner son Client ID et son Client Secret. **Le secret Discord reste exclusivement dans Supabase.** Désactiver les autres méthodes de connexion si elles sont actives et non souhaitées.
5. Dans Authentication > URL Configuration, définir Site URL sur `https://TON-COMPTE.github.io/TON-DEPOT/` et autoriser cette URL ainsi que `http://localhost:5088/` dans Redirect URLs.
6. Pour l'aperçu local, renseigner `public/config.js` avec Project URL et la clé **publishable** ou **anon**. Ne jamais utiliser une clé service_role ou `sb_secret_`.

Documentation officielle : https://supabase.com/docs/guides/auth/social-sign-in/auth-discord.

### Sécurité des données

La base active RLS. Lecture publique des avis et noms d'affichage, écriture réservée au propriétaire authentifié, unicité compte/produit, contraintes de longueur et de note, limite de 30 secondes entre deux écritures. Les produits doivent exister dans la table `products` : impossible de créer un avis sur un identifiant arbitraire.

Les signalements sont privés et consultables par l'administrateur dans Supabase > Table Editor > reports. La modération est manuelle : supprimer un avis contraire aux règles dans la table reviews. Ne pas ouvrir les droits d'écriture aux visiteurs anonymes. Activer les protections anti-abus disponibles dans le tableau de bord Auth avant une ouverture à grande audience.

**Validation externe restante :** le parcours OAuth réel, les écritures multi-utilisateurs et les politiques SQL doivent être vérifiés avec ton projet Supabase. Ils ne sont pas testables sans accès à ce service.

## Déployer sur GitHub Pages

1. Créer un nouveau dépôt pour Croq et y placer le **contenu** de ce dossier, y compris `.github/`, à la racine. Aucun fichier du projet parent n'est nécessaire.
2. Settings > Pages > Build and deployment > Source : **GitHub Actions**.
3. La configuration publique de `public/config.js` est déjà utilisée par le déploiement. Pour la remplacer, Settings > Secrets and variables > Actions > Variables : ajouter `SUPABASE_URL` et `SUPABASE_ANON_KEY` (valeurs publiques destinées au navigateur).
4. Pousser sur la branche `main` ou lancer le workflow « Publier Croq sur GitHub Pages ».
5. Reporter l'URL finale dans la configuration Supabase ci-dessus.

Le workflow teste le catalogue et génère `config.js` à partir des variables. `npm run build` prépare ensuite `dist/` avec une empreinte de version commune aux scripts, styles et données JSON. Elle empêche le navigateur de mélanger le nouvel HTML avec d'anciens modules en cache. Le workflow refuse de publier sans configuration Supabase ou avec une clé secrète reconnue. Aucun abonnement serveur Node n'est nécessaire : GitHub Pages sert `dist/`, Supabase gère la base et OAuth.

Documentation : https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages.

## Produits et tarifs

Les données proviennent des cartes officielles relevées le **3 novembre 2026**. `public/data/products.json` est autonome et contient la provenance et la date de chaque fiche. Les photos sont servies depuis les domaines officiels, avec remplacement local si elles deviennent indisponibles.

Le catalogue initial n'est pas une garantie de disponibilité dans tous les restaurants. Certaines descriptions, listes d'allergènes et valeurs nutritionnelles restent à relever et sont explicitement signalées. Une liste d'allergènes `null` signifie **non vérifiée**, jamais « aucun allergène ». La recette seule et le menu n'ont pas forcément les mêmes allergènes. Les données Burger King importées concernent le produit seul.

Les prix n'ont pas de tarif national unique. Les tarifs du catalogue public Quick sont affichés avec un astérisque comme **indicatifs**, avec canal, source et date de relevé. Le restaurant n'est pas précisé par cette source : la note de la fiche le dit explicitement. Le menu relevé est de taille M. Les autres prix restent « À vérifier » lorsqu'aucun montant fiable n'a été relevé.

Pour ajouter un prix dans une fiche :

```json
"price": {
  "solo": 6.5,
  "menu": 10.5,
  "restaurant": "Nom exact du restaurant",
  "channel": "Sur place",
  "source": "https://url-de-la-carte-du-restaurant",
  "checkedAt": "2026-11-03",
  "note": "Relevé sur place dans ce restaurant le 03/11/2026. Autres restaurants : tarifs variables."
}
```

Cet exemple montre le format, **pas un tarif réel**. Le site affiche les deux montants et la note de contexte sur la fiche.

Les scripts `tools/inspect-sources.ps1`, `tools/fetch-quick.ps1` et `tools/extract-bk.cjs` aident à préparer un relevé. Ils ne contournent pas les restrictions des enseignes. Les exports temporaires sont ignorés par Git dans `research/`. Le script `tools/build-catalogue.mjs` normalise ces relevés en JSON et génère les produits autorisés pour la base. Ne pas le lancer sans les exports sources : il reconstruirait un catalogue partiel.

Les enrichissements manuels peuvent être conservés dans `data/overrides.json`, indexés par identifiant produit. Aucun rafraîchissement automatique ou contrôle des stocks en temps réel n'est revendiqué.

## Avant une ouverture publique

Renseigner l'identité et le contact de l'exploitant et sa politique de confidentialité dans « À propos & données ». Organiser le traitement des signalements, vérifier les droits d'utilisation des photos et compléter les données manquantes. Les marques et les visuels appartiennent aux enseignes concernées.
