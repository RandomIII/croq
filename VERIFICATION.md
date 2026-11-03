# Vérification de cette version

Vérification locale du 3 novembre 2026.

## Réussi

- Dix-sept tests Node : catalogue, filtres, tri, validation et échappement des avis ; calendrier Europe/Paris, changement de jour en été/hiver, fins inclusives, horaires, filtres année/jour et recherche Crazy mardi ; renouvellement de toute la chaîne JS/JSON à chaque nouvelle version publique.
- Vérification syntaxique de l'application, du client Supabase et du serveur de prévisualisation.
- Vérification dans le navigateur : chargement des photos, recherche Giant, favoris ajoutés puis retirés, prix du Giant seul et en menu avec contexte indicatif, ouverture et fermeture de fiche, onglets recette/allergènes/avis.
- État explicite lorsque la sauvegarde des avis n'est pas encore configurée. Aucun faux succès de connexion ou publication.
- Rendu à largeur mobile de 390 pixels dans un iframe de test. Les media queries sont actives, le catalogue passe à deux colonnes et la navigation est adaptée.
- 518 fiches : 152 McDonald's, 186 Burger King, 61 Quick et 119 KFC. Parmi elles, 9 anciennes éditions documentées. Les 452 identifiants existants sont conservés. Les fiches encore incomplètes sont signalées.

## À vérifier avec les services connectés

Le projet Supabase Croq est maintenant créé. `schema.sql` et `seed.sql` ont été exécutés, et les 452 produits sont importés. `supabase/verify-rls.sql` a été exécuté avec succès dans une transaction annulée : lecture, agrégation, validation des notes et refus des modifications entre comptes.

Les API publiques `products`, `public_reviews` et `product_ratings` répondent correctement avec la clé publishable. Le site utilise exclusivement cette clé publique. L'adresse de retour `http://localhost:5088/` est configurée et autorisée.

L'application Discord Croq est créée et son callback Supabase est enregistré. Le fournisseur Discord est maintenant activé dans Supabase (vérifié via l'API Auth). Le bouton de connexion du site redirige correctement vers l'écran d'autorisation Discord de Croq, avec les seules portées `identify` et `email`. L'utilisateur doit autoriser la première connexion pour valider l'échange final, le retour au site et la publication d'un avis réel.

Le site est publié sur https://randomiii.github.io/croq/ depuis le dépôt autonome https://github.com/RandomIII/croq. Le workflow `.github/workflows/pages.yml` teste et déploie chaque mise à jour de `main`. L'URL publique est configurée dans Supabase. Les nouveaux identifiants d'offres et archives ont été ajoutés au catalogue autorisé dans Supabase sans modifier les avis existants.

## Projet parent

Aucun fichier applicatif de AI File Organizer n'a été modifié. Sa commande `main.py selftest` a été tentée mais son environnement `.venv` référence un exécutable Python Windows absent ou inaccessible. Aucun commit n'a été créé.
