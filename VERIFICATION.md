# Vérification de cette version

Vérification locale du 3 novembre 2026.

## Réussi

- Huit tests Node : identifiants uniques, présence des quatre enseignes, filtres combinés, recherche sans accents, favoris, nouveautés, tri des prix inconnus, classement à partir des vrais avis, validation des avis et échappement HTML.
- Vérification syntaxique de l'application, du client Supabase et du serveur de prévisualisation.
- Vérification dans le navigateur : chargement des photos, recherche Giant, favoris ajoutés puis retirés, prix du Giant seul et en menu avec contexte indicatif, ouverture et fermeture de fiche, onglets recette/allergènes/avis.
- État explicite lorsque la sauvegarde des avis n'est pas encore configurée. Aucun faux succès de connexion ou publication.
- Rendu à largeur mobile de 390 pixels dans un iframe de test. Les media queries sont actives, le catalogue passe à deux colonnes et la navigation est adaptée.
- Relevé initial : 452 références, dont 150 McDonald's, 136 Burger King, 59 Quick et 107 KFC. Les fiches encore incomplètes sont signalées.

## À vérifier avec les services connectés

Le projet Supabase Croq est maintenant créé. `schema.sql` et `seed.sql` ont été exécutés, et les 452 produits sont importés. `supabase/verify-rls.sql` a été exécuté avec succès dans une transaction annulée : lecture, agrégation, validation des notes et refus des modifications entre comptes.

Les API publiques `products`, `public_reviews` et `product_ratings` répondent correctement avec la clé publishable. Le site utilise exclusivement cette clé publique. L'adresse de retour `http://localhost:5088/` est configurée et autorisée.

L'application Discord Croq est créée et son callback Supabase est enregistré. Le fournisseur Discord est maintenant activé dans Supabase (vérifié via l'API Auth). Le bouton de connexion du site redirige correctement vers l'écran d'autorisation Discord de Croq, avec les seules portées `identify` et `email`. L'utilisateur doit autoriser la première connexion pour valider l'échange final, le retour au site et la publication d'un avis réel.

La publication GitHub Pages n'a pas été effectuée : aucun dépôt destiné à Croq n'a été identifié ou connecté. Le workflow est fourni dans `.github/workflows/pages.yml`.

## Projet parent

Aucun fichier applicatif de AI File Organizer n'a été modifié. Sa commande `main.py selftest` a été tentée mais son environnement `.venv` référence un exécutable Python Windows absent ou inaccessible. Aucun commit n'a été créé.
