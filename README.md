# SmartDev — Samuel Martin, architecte solution & spécialiste IA

Portfolio de **Samuel Martin** (SmartDev), architecte solution & spécialiste IA spécialisé dans la conception d'architectures et la gestion des données de sites web propulsés par l'IA, avec une exigence constante en **sécurité**, **SEO**, **performances** et **UI/UX design**.

Site en ligne : <https://smartdev-web.github.io/>

Le site est 100 % statique (HTML, CSS et JavaScript natifs, sans framework ni étape de build) et présente dix sites de démonstration complets, chacun avec sa propre identité visuelle.

## Structure

```
index.html                  Page d'accueil du portfolio (contenu entièrement rendu en HTML pour le SEO)
404.html                    Page d'erreur personnalisée servie par GitHub Pages
mentions-legales.html       Mentions légales, hébergeur et politique de confidentialité
assets/css/main.css         Styles du portfolio
assets/js/main.js           Animations et interactions (révélations rejouables, services, projets, formulaire)
assets/img/                 Favicon, icônes et image de partage Open Graph
robots.txt, sitemap.xml     Indexation par les moteurs de recherche
site.webmanifest            Manifeste d'application web
.well-known/security.txt    Contact pour le signalement de failles
serverless/                 Relais Cloudflare Worker entre le formulaire de contact et Mailjet
projects/<slug>/            Un site de démonstration autonome par dossier
```

## Sections du portfolio

| Section | Contenu |
| --- | --- |
| Accueil | Positionnement, accroche animée et chiffres clés calculés à partir des listes de technologies et de domaines d'expertise |
| 01 — Expertise | Profil de Samuel Martin et ses quatre spécialités : sécurité, SEO, performances, UI/UX design |
| 02 — Services | Vitrine animée pilotée par le défilement : sites vitrines, e-commerce, applications web, communautés, audit & refonte |
| 03 — Projets | Liste interactive des dix démos : au survol, l'aperçu du site apparaît dans la ligne et se fond dans la couleur du projet ; filtres animés |
| 04 — Méthode | Processus en quatre étapes avec frise de progression |
| 05 — Compétences | Technologies choisies selon chaque projet (langages, frameworks et bibliothèques, bases de données et outils) et compétences regroupées par domaine, sans niveau chiffré |
| 06 — Contact | Formulaire validé côté client, envoi via Mailjet ou client mail |

Les animations de révélation et les compteurs se réinitialisent lorsqu'un élément sort par le bas de l'écran : elles se rejouent à chaque nouvelle descente.

## Sites de démonstration

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

Toutes ces entreprises sont **fictives** : adresses inventées, numéros de téléphone issus des plages réservées à la fiction par l'ARCEP, adresses e-mail en `.example` (domaine réservé par la RFC 2606) et réseaux sociaux désactivés. Chaque page porte la balise `noindex, follow` afin que ces entreprises fictives n'apparaissent jamais dans les moteurs de recherche, et un lien vers le portfolio.

## SEO

- Balises `title`, `description`, `canonical` et `robots` sur la page d'accueil.
- Métadonnées Open Graph et Twitter Card avec image de partage 1200 × 630 (`assets/img/og-image.png`).
- Données structurées JSON-LD Schema.org : `Person` (Samuel Martin), `ProfessionalService` (SmartDev) et `WebSite`.
- Contenu des projets rendu directement en HTML (aucun contenu essentiel injecté en JavaScript).
- `robots.txt`, `sitemap.xml`, manifeste, favicon SVG et icône Apple.
- Hiérarchie de titres stricte (un seul `h1`), textes alternatifs, images en chargement différé.

Après publication, déclarer le site dans [Google Search Console](https://search.google.com/search-console) et [Bing Webmaster Tools](https://www.bing.com/webmasters), puis soumettre `https://smartdev-web.github.io/sitemap.xml`.

## Sécurité

GitHub Pages ne permet pas de définir des en-têtes HTTP personnalisés ; les protections sont donc appliquées au niveau des pages :

- Politique de sécurité du contenu (CSP) en balise `meta` sur chaque page : scripts limités aux fichiers du site, aucun script en ligne, aucun objet embarqué, origines externes restreintes à Google Fonts et Unsplash.
- Politique de référent `strict-origin-when-cross-origin`.
- Aucune donnée saisie par l'utilisateur, issue de l'URL ou du stockage local n'est injectée sans échappement ; les données restaurées depuis `localStorage` sont validées champ par champ.
- Rendu Markdown du forum sécurisé : échappement HTML préalable, liste blanche de transformations, liens limités à `http(s)` avec `rel="noopener noreferrer nofollow"`.
- Formulaire de contact : validation, longueurs maximales, champ piège anti-robot, relais serveur avec contrôle d'origine, de format, de taille et de débit.

Limites connues propres à GitHub Pages : les directives `frame-ancestors`, `X-Frame-Options` et `Strict-Transport-Security` personnalisée ne peuvent pas être définies en `meta`. Pour les obtenir, placer le site derrière un CDN (Cloudflare par exemple) qui ajoute ces en-têtes.

## Formulaire de contact et Mailjet

Les clés API Mailjet sont secrètes et ne doivent jamais figurer dans un site statique. Le formulaire passe donc par un petit relais serverless (`serverless/contact-worker.js`, Cloudflare Workers, offre gratuite suffisante).

Tant qu'aucun relais n'est configuré, le formulaire ouvre le client mail du visiteur avec un message prérempli.

### Mise en service

1. Dans Mailjet, valider l'adresse expéditrice (**Account settings → Sender addresses & domains**) et récupérer la clé API et la clé secrète (**API key management**).
2. Installer Wrangler et se connecter : `npm install -g wrangler` puis `wrangler login`.
3. Depuis le dossier `serverless/` (après avoir adapté `ALLOWED_ORIGIN` dans `wrangler.toml` si le portfolio est publié sur un autre domaine) :
   ```
   wrangler secret put MAILJET_API_KEY
   wrangler secret put MAILJET_API_SECRET
   wrangler deploy
   ```
4. Copier l'URL du Worker obtenue (par exemple `https://smartdev-contact.<compte>.workers.dev`) puis, dans `index.html` :
   - la renseigner dans l'attribut `data-endpoint` du formulaire `#contactForm` ;
   - ajouter son origine à la directive `connect-src` de la balise `Content-Security-Policy`.

Pour une délivrabilité optimale, utiliser idéalement une adresse expéditrice sur un nom de domaine personnel authentifié (SPF et DKIM) dans Mailjet : un envoi « depuis » une adresse Gmail via un service tiers peut être classé en indésirable.

## Aperçu en local

Ouvrir `index.html` dans un navigateur suffit. Pour se rapprocher de GitHub Pages (chemins absolus de la page 404, transitions animées entre les pages, actives uniquement en HTTP) :

```
python3 -m http.server 8000
```

puis ouvrir <http://localhost:8000/>.

## Publication sur GitHub Pages

1. Dans le dépôt GitHub : **Settings → Pages**.
2. Source : **Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Le fichier `.nojekyll` désactive le traitement Jekyll pour servir les fichiers tels quels.

## Ajouter un projet

1. Créer le dossier `projects/<slug>/` avec un `index.html` et appliquer les mêmes balises de sécurité et `noindex` que les autres démos.
2. Ajouter une ligne `<li class="project-row">` dans la liste `#projectList` de `index.html` (catégorie, couleur d'accent, image, titre, description, étiquettes).
3. Adapter le titre et le texte de la section Projets qui annoncent dix sites. Les chiffres clés de l'accueil se calculent seuls à partir des listes de technologies et de domaines d'expertise.
