# SmartDev — Portfolio

Portfolio statique (HTML, CSS, JavaScript vanilla) hébergeable sur GitHub Pages, présentant dix sites de démonstration complets et explorables.

## Structure

```
index.html               Page d'accueil du portfolio
assets/css/main.css      Styles du portfolio
assets/js/projects.js    Catalogue des projets affichés sur l'accueil
assets/js/main.js        Animations et interactions du portfolio
projects/<slug>/         Un site de démonstration autonome par dossier
```

| Projet | Dossier | Type |
| --- | --- | --- |
| HighlightForge | `projects/highlightforge/` | Application SaaS |
| Maison Ambre | `projects/restaurant/` | Restaurant |
| IronPulse | `projects/gym/` | Salle de sport |
| Atelier Méca Rivière | `projects/garage/` | Garage mécanique |
| DevAgora | `projects/forum/` | Forum |
| Nordik Store | `projects/shop/` | Boutique e-commerce |
| Horizon Immobilier | `projects/immobilier/` | Agence immobilière |
| Lumen Studio | `projects/photographe/` | Photographe |
| Azur Hôtel & Spa | `projects/hotel/` | Hôtellerie |
| Echoes Festival | `projects/festival/` | Festival de musique |

Tous les chemins sont relatifs : le site fonctionne aussi bien à la racine d'un domaine que dans un sous-dossier GitHub Pages, ou directement en ouvrant `index.html` dans un navigateur.

## Publication sur GitHub Pages

1. Dans le dépôt GitHub : **Settings → Pages**.
2. Source : **Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Le fichier `.nojekyll` désactive le traitement Jekyll pour servir les fichiers tels quels.

> Un dépôt nommé `SmartDev.github.io` sur le compte `samuelnitram` est publié à l'adresse `https://samuelnitram.github.io/SmartDev.github.io/`. Pour obtenir l'adresse racine `https://samuelnitram.github.io/`, le dépôt doit être renommé `samuelnitram.github.io`.

## Ajouter un projet

1. Créer le dossier `projects/<slug>/` avec un `index.html`.
2. Ajouter une entrée dans `assets/js/projects.js` (titre, catégorie, description, tags, couleur, image).
