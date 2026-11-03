# Audit de l'import Burger King du 3 novembre 2026

La Box Mystère n'a pas été ajoutée dans un fichier d'exceptions. Elle est retrouvée par `npm run refresh:bk`, qui collecte les sources publiques et régénère le catalogue et son seed SQL.

## Cause de l'omission

1. Le relevé initial contenait déjà le menu `9215885467303247332`, route `c-box-mystere`.
2. Aucune catégorie de la carte ne référençait cet identifiant. L'ancien parcours limité aux catégories ne pouvait donc pas l'atteindre.
3. Les animations marketing et le menu public « Bons plans » contenaient `/page/box-mystere`. Ces données sont dans la configuration du site, parfois sans lien HTML cliquable (`actionEnabled: false`), et n'étaient pas collectées.
4. Le premier parcours ne traitait que `PRODUCT`, puis un second import ne suivait qu'une liste fixe de rayons `MENU`. Les menus des autres branches pouvaient également manquer.
5. L'extracteur découpait les flux React par lignes. Des blocs texte de longueur exprimée en octets, contenant plusieurs lignes de HTML et du français, pouvaient masquer les objets suivants.

## Collecte corrigée

- Le flux est lu sans exécuter de JavaScript, en respectant la longueur en octets des blocs texte.
- Toutes les catégories visibles sont parcourues, avec les références `PRODUCT` et `MENU`.
- Les campagnes du site et les liens « Bons plans » sont découverts dans la configuration publique de l'accueil.
- Les pages de campagne et leurs règlements sont suivis. Le rapprochement utilise les liens explicites ou un nom non ambigu. Une formule peut être distinguée de son composant homonyme ; plusieurs formules homonymes ne sont pas départagées arbitrairement.
- Les périodes ne sont extraites que lorsqu'elles décrivent l'offre ou l'opération. La validité d'un code de jeu n'est pas prise pour la durée du menu.
- Les variantes tarifaires nommées dans les modalités gardent leur libellé et leur source.
- Une campagne principale non reliée provoque un échec explicite avant remplacement du catalogue. Les autres pages sans référence identifiable sont listées dans le rapport, sans promesse d'exhaustivité.

## Conservation de l'historique

Les 954 références du relevé BK sont conservées : 598 produits et 356 formules. Le relevé relie 190 références à la carte ou à une campagne actuelle. Les 764 autres portent « À dater » : leur présence dans une base publique ne prouve ni leur période de vente ni leur retrait. Elles restent consultables dans les souvenirs, avec leur identifiant source.

Les éditions historiques déjà documentées gardent leurs dates. Un nouveau relevé ne supprime pas les références disparues et ne remplace pas une période connue par une absence d'information. Les identifiants des 518 fiches de la version précédente sont tous conservés, donc leurs avis restent rattachés aux mêmes références.

Le catalogue réuni compte 1 291 fiches. Ce nombre inclut les références à dater et ne représente pas autant de produits actuellement vendus. Les données des trois autres enseignes sont conservées par la mise à jour BK.

## Vérifications

Les tests utilisent une campagne fictive « Formule surprise d'hiver » pour vérifier que la correction ne dépend pas du nom Box Mystère. Ils couvrent les campagnes hors rayon, les menus dans les nouveautés, les prix et variantes, les périodes, la conservation des anciennes fiches et l'arrêt en cas d'omission d'une campagne principale.

Le rapport machine est `data/bk-import-report.json`. Le relevé normalisé est `data/bk-generated.json`. La commande ne s'exécute pas en continu : le site reste un relevé publié, sans garantie de stock en temps réel. Après rafraîchissement, appliquer `supabase/seed.sql` avant publication pour autoriser les avis sur les nouvelles références.

Sources de l'opération retrouvée :

- https://www.burgerking.fr/page/box-mystere
- https://www.burgerking.fr/page/reglement-box-mystere
