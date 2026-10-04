/* DevAgora seed data: categories, members, badges, threads and posts.
   Post dates are expressed in minutes before page load so the forum always looks active. */
(function buildDevAgoraData() {
  const MINUTES_IN_DAY = 1440;
  const pageLoadTimestamp = Date.now();
  const toTimestamp = (minutesAgo) => pageLoadTimestamp - minutesAgo * 60000;
  const badgeDefinitions = {
    mentor: { label: "Mentor", tier: "gold", description: "Plus de 100 réponses acceptées comme solution." },
    pionnier: { label: "Pionnier", tier: "gold", description: "Membre depuis l'ouverture du forum." },
    moderateur: { label: "Modératrice", tier: "gold", description: "Veille au respect de la charte." },
    expertCss: { label: "Expert CSS", tier: "silver", description: "50 réponses appréciées sur le front-end." },
    rustacean: { label: "Rustacé", tier: "silver", description: "Contributeur régulier sur Rust et les systèmes." },
    pedagogue: { label: "Pédagogue", tier: "silver", description: "Explications très votées par les débutants." },
    curieux: { label: "Curieux", tier: "bronze", description: "A posé 10 questions bien formulées." },
    premierVote: { label: "Premier vote", tier: "bronze", description: "A voté pour la première fois." },
    bienvenue: { label: "Bienvenue", tier: "bronze", description: "A complété son profil." },
    a11y: { label: "Gardienne a11y", tier: "silver", description: "Référente accessibilité de la communauté." },
    securite: { label: "Chasseuse de failles", tier: "silver", description: "Signale et explique les vulnérabilités." },
    dataviz: { label: "Data wizard", tier: "silver", description: "Réponses de référence sur la donnée." }
  };
  const categories = [
    { id: "javascript", name: "JavaScript & TypeScript", description: "Frameworks front, Node.js, outillage, typage et bonnes pratiques.", color: "#f2b632", icon: "js" },
    { id: "backend", name: "Back-end & API", description: "Go, Rust, Python, PHP, bases de données et conception d'API.", color: "#22b07d", icon: "server" },
    { id: "devops", name: "DevOps & Cloud", description: "CI/CD, conteneurs, Kubernetes, infrastructure as code et observabilité.", color: "#3d8bfd", icon: "cloud" },
    { id: "mobile", name: "Mobile", description: "Flutter, Kotlin, Swift, React Native et publication sur les stores.", color: "#e8590c", icon: "mobile" },
    { id: "data", name: "Data & bases de données", description: "Pipelines, SQL, formats de fichiers, analytics et entrepôts.", color: "#be4bdb", icon: "data" },
    { id: "accessibilite", name: "UX & Accessibilité", description: "RGAA, WCAG, design systems et interfaces inclusives.", color: "#12b886", icon: "a11y" },
    { id: "carriere", name: "Carrière & freelance", description: "Salaires, entretiens, reconversion, statut indépendant.", color: "#f06595", icon: "career" },
    { id: "comptoir", name: "Le Comptoir", description: "Discussions libres, présentations, setups et vie du forum.", color: "#7c5cff", icon: "chat" }
  ];
  const users = [
    { id: "u1", username: "lea.martin", displayName: "Léa Martin", title: "Développeuse front-end senior", location: "Lyon", joinedDaysAgo: 1190, reputation: 4820, online: true, color: "#7c5cff", badges: ["mentor", "pionnier", "expertCss"], skills: ["React", "TypeScript", "CSS", "Vite"], bio: "Front-end depuis 2014, passionnée par les design systems et la performance web. J'anime le meetup JS de Lyon." },
    { id: "u2", username: "thomas_dubois", displayName: "Thomas Dubois", title: "Lead développeur back-end", location: "Nantes", joinedDaysAgo: 1185, reputation: 3315, online: true, color: "#22b07d", badges: ["pionnier", "pedagogue"], skills: ["Go", "PostgreSQL", "gRPC", "Kafka"], bio: "Je construis des API qui tiennent la charge. Fan de code simple et de tests lisibles." },
    { id: "u3", username: "sarah.benali", displayName: "Sarah Benali", title: "Ingénieure SRE", location: "Paris", joinedDaysAgo: 1200, reputation: 3990, online: false, color: "#3d8bfd", badges: ["moderateur", "pionnier", "mentor"], skills: ["Kubernetes", "Terraform", "Prometheus", "AWS"], bio: "Modératrice de DevAgora. Le jour, je garde des clusters en vie ; le soir, je relis vos pipelines CI." },
    { id: "u4", username: "nico.rust", displayName: "Nicolas Lefèvre", title: "Développeur systèmes", location: "Grenoble", joinedDaysAgo: 640, reputation: 2140, online: true, color: "#e8590c", badges: ["rustacean", "pedagogue"], skills: ["Rust", "C", "WebAssembly", "Linux"], bio: "Rust, embarqué et un peu de WebAssembly. J'aime comprendre ce qui se passe sous le capot." },
    { id: "u5", username: "ines.data", displayName: "Inès Moreau", title: "Data engineer", location: "Bordeaux", joinedDaysAgo: 420, reputation: 1675, online: false, color: "#be4bdb", badges: ["dataviz", "curieux"], skills: ["Python", "Spark", "dbt", "DuckDB"], bio: "Pipelines de données, modélisation et un faible pour les jolis tableaux de bord." },
    { id: "u6", username: "julien.mobile", displayName: "Julien Garnier", title: "Développeur mobile", location: "Lille", joinedDaysAgo: 365, reputation: 1210, online: true, color: "#f2b632", badges: ["curieux"], skills: ["Flutter", "Kotlin", "Firebase"], bio: "Applications mobiles grand public, 12 apps publiées. Toujours partant pour parler offline-first." },
    { id: "u7", username: "chloe.a11y", displayName: "Chloé Rousseau", title: "Experte accessibilité", location: "Rennes", joinedDaysAgo: 720, reputation: 2655, online: false, color: "#12b886", badges: ["a11y", "pedagogue"], skills: ["RGAA", "ARIA", "Svelte", "Figma"], bio: "Auditrice RGAA et développeuse. Un bon site est un site que tout le monde peut utiliser." },
    { id: "u8", username: "maxime.py", displayName: "Maxime Fabre", title: "Développeur Python / Django", location: "Toulouse", joinedDaysAgo: 530, reputation: 1480, online: false, color: "#1098ad", badges: ["curieux", "premierVote"], skills: ["Python", "Django", "PostgreSQL"], bio: "Back-end Python dans une startup agritech. J'apprends TypeScript en ce moment." },
    { id: "u9", username: "amandine.sec", displayName: "Amandine Perrin", title: "Ingénieure sécurité applicative", location: "Strasbourg", joinedDaysAgo: 810, reputation: 2390, online: true, color: "#f03e3e", badges: ["securite", "mentor"], skills: ["OWASP", "Pentest", "OAuth", "Java"], bio: "Je casse des applis pour qu'elles soient plus solides. Questions sécu bienvenues." },
    { id: "u10", username: "karim.js", displayName: "Karim Haddad", title: "Développeur junior Node.js", location: "Marseille", joinedDaysAgo: 95, reputation: 310, online: true, color: "#f06595", badges: ["curieux", "premierVote"], skills: ["JavaScript", "Node.js", "Express"], bio: "Sorti de bootcamp l'an dernier, premier poste en alternance. Je pose beaucoup de questions !" },
    { id: "u11", username: "alex.durand", displayName: "Alex Durand", title: "Membre de la communauté", location: "Montpellier", joinedDaysAgo: 2, reputation: 15, online: true, color: "#495057", badges: ["bienvenue"], skills: ["HTML", "CSS", "JavaScript"], bio: "Nouveau sur DevAgora. Je découvre le développement web en autodidacte." }
  ];
  const threadDefinitions = [
    { id: "t23", categoryId: "comptoir", title: "Charte de DevAgora : à lire avant de poster", tags: ["règles", "communauté"], views: 5120, pinned: true, posts: [
      { authorId: "u3", ago: 300 * MINUTES_IN_DAY, votes: 142, body: "Bienvenue sur **DevAgora** ! Quelques règles simples pour que tout le monde s'y retrouve :\n\n- Cherchez avant de poster, votre question a peut-être déjà une réponse.\n- Un titre clair vaut mieux que « Help urgent !!! ».\n- Partagez le code concerné entre triples accents graves, avec le message d'erreur complet.\n- Bienveillance obligatoire : on a tous été débutants.\n- Marquez la réponse qui vous a aidé comme solution.\n\n> Les publicités et le recrutement sauvage sont supprimés sans préavis.\n\nBonne discussion à toutes et à tous." }
    ] },
    { id: "t19", categoryId: "carriere", title: "Grille des salaires dev 2026 : partagez vos chiffres (anonymes)", tags: ["salaire", "2026", "sondage"], views: 9874, pinned: true, posts: [
      { authorId: "u3", ago: 61 * MINUTES_IN_DAY, votes: 96, body: "Comme chaque année, on compile vos retours pour aider les juniors et les reconversions à négocier.\n\nFormat suggéré :\n\n- Poste et techno principale\n- Ville ou full remote\n- Années d'expérience\n- Brut annuel fixe + variable\n\nMerci de rester factuels, les débats sont les bienvenus dans un sujet séparé." },
      { authorId: "u2", ago: 60 * MINUTES_IN_DAY, votes: 41, body: "Lead dev Go, Nantes, 11 ans d'XP : **62 k€** fixe + 4 k€ de variable, 2 jours de télétravail." },
      { authorId: "u10", ago: 58 * MINUTES_IN_DAY, votes: 37, body: "Dev Node.js junior en alternance, Marseille : 1 450 € net par mois. On commence tous quelque part !" },
      { authorId: "u1", ago: 12 * MINUTES_IN_DAY, votes: 29, body: "Front-end senior, Lyon, 12 ans : **58 k€** + intéressement. J'ajoute que les grilles lyonnaises ont bien rattrapé Paris depuis deux ans." }
    ] },
    { id: "t01", categoryId: "javascript", title: "useEffect qui se déclenche deux fois en dev : bug ou feature ?", tags: ["react", "hooks"], views: 1843, solved: true, posts: [
      { authorId: "u10", ago: 95, votes: 6, body: "Salut tout le monde,\n\nMon `useEffect` qui appelle mon API part **deux fois** au montage du composant. En production tout va bien. J'ai raté quelque chose ?\n\n```js\nuseEffect(() => {\n  fetchOrders().then(setOrders);\n}, []);\n```" },
      { authorId: "u1", ago: 80, votes: 24, body: "C'est le comportement voulu de `<StrictMode>` en développement : React monte, démonte puis remonte le composant pour révéler les effets qui ne savent pas se nettoyer.\n\nLa bonne pratique est de prévoir l'annulation :\n\n```js\nuseEffect(() => {\n  const controller = new AbortController();\n  fetchOrders({ signal: controller.signal }).then(setOrders);\n  return () => controller.abort();\n}, []);\n```\n\nEt pour du chargement de données, une lib comme TanStack Query règle le problème proprement." },
      { authorId: "u10", ago: 64, votes: 3, body: "Merci Léa, c'était exactement ça. Je passe le sujet en résolu !" }
    ] },
    { id: "t02", categoryId: "javascript", title: "TypeScript : typer proprement un reducer avec des actions discriminées", tags: ["typescript", "react", "typage"], views: 1204, solved: true, posts: [
      { authorId: "u8", ago: 3 * MINUTES_IN_DAY, votes: 9, body: "Je viens de Python et je galère à typer mon reducer. Chaque action a un `payload` différent et TypeScript me renvoie `any` partout. Une approche propre à conseiller ?" },
      { authorId: "u1", ago: 3 * MINUTES_IN_DAY - 120, votes: 31, body: "Utilise une **union discriminée** sur la propriété `type` :\n\n```ts\ntype CartAction =\n  | { type: \"add\"; productId: string; quantity: number }\n  | { type: \"remove\"; productId: string }\n  | { type: \"clear\" };\n```\n\nDans le `switch (action.type)`, TypeScript affine automatiquement le type de `action`. Ajoute un cas `default` avec `const exhaustiveCheck: never = action;` pour être averti si tu oublies une action." },
      { authorId: "u4", ago: 2 * MINUTES_IN_DAY, votes: 8, body: "Petite remarque : le check `never` est l'équivalent du `match` exhaustif en Rust. Une fois qu'on y a goûté, difficile de s'en passer." }
    ] },
    { id: "t03", categoryId: "javascript", title: "Vite vs Webpack en 2026 : vous migrez encore ?", tags: ["vite", "webpack", "outillage"], views: 2310, posts: [
      { authorId: "u2", ago: 6 * MINUTES_IN_DAY, votes: 12, body: "On a encore deux applications internes sous Webpack 5 avec une config de 400 lignes. L'équipe hésite à migrer vers Vite. Vos retours sur des projets de taille moyenne ?" },
      { authorId: "u1", ago: 6 * MINUTES_IN_DAY - 200, votes: 19, body: "Migré trois projets l'an dernier. Démarrage du serveur de dev passé de **48 s à moins de 2 s**. Le plus long a été de remplacer quelques loaders exotiques et les variables `process.env`." },
      { authorId: "u4", ago: 5 * MINUTES_IN_DAY, votes: 7, body: "Côté bundler, Rolldown commence à être vraiment solide. La migration se fera presque toute seule quand Vite l'aura adopté par défaut." },
      { authorId: "u10", ago: 4 * MINUTES_IN_DAY, votes: 2, body: "Question de junior : est-ce qu'il faut encore apprendre Webpack aujourd'hui pour les entretiens ?" }
    ] },
    { id: "t04", categoryId: "javascript", title: "Fetch qui renvoie [object Promise] dans mon template", tags: ["javascript", "async", "débutant"], views: 642, solved: true, posts: [
      { authorId: "u10", ago: 9 * MINUTES_IN_DAY, votes: 3, body: "J'affiche le résultat de ma fonction dans une carte et j'obtiens littéralement `[object Promise]` à l'écran.\n\n```js\nfunction getUserName(id) {\n  return fetch(`/api/users/${id}`).then(r => r.json()).then(u => u.name);\n}\ncard.textContent = getUserName(4);\n```" },
      { authorId: "u8", ago: 9 * MINUTES_IN_DAY - 45, votes: 14, body: "Ta fonction renvoie une promesse, pas le nom. Il faut attendre la résolution :\n\n```js\ncard.textContent = await getUserName(4);\n```\n\nDans une fonction `async` évidemment. Pense aussi à gérer le cas d'erreur avec `try / catch`." }
    ] },
    { id: "t05", categoryId: "javascript", title: "Retour d'expérience : migration d'un back-office Angular vers Svelte", tags: ["svelte", "angular", "migration"], views: 1580, posts: [
      { authorId: "u7", ago: 14 * MINUTES_IN_DAY, votes: 27, body: "On vient de finir la migration d'un back-office de 60 écrans. Quelques chiffres :\n\n- Bundle initial : **1,2 Mo → 310 ko**\n- Temps de build divisé par 5\n- Montée en compétence de l'équipe : environ 3 semaines\n\nLe point noir : l'écosystème de composants accessibles est plus mince, on a dû réécrire nos combobox." },
      { authorId: "u1", ago: 13 * MINUTES_IN_DAY, votes: 11, body: "Merci pour ce retour très concret ! Vous avez migré écran par écran ou d'un bloc ?" },
      { authorId: "u7", ago: 13 * MINUTES_IN_DAY - 300, votes: 9, body: "Écran par écran, avec un reverse proxy qui routait vers l'ancienne ou la nouvelle app. Ça nous a permis de livrer en continu pendant quatre mois." }
    ] },
    { id: "t06", categoryId: "javascript", title: "Les signals arrivent partout : effet de mode ou vrai changement ?", tags: ["signals", "réactivité", "débat"], views: 2045, posts: [
      { authorId: "u1", ago: 20 * MINUTES_IN_DAY, votes: 18, body: "Angular, Solid, Preact, Vue… et la proposition TC39 avance. Vous pensez que les signals vont devenir le modèle de réactivité standard du web ?" },
      { authorId: "u4", ago: 19 * MINUTES_IN_DAY, votes: 10, body: "Le modèle push-pull à granularité fine est objectivement plus efficace que le re-render complet. Si c'est natif dans le langage, les frameworks deviendront surtout des couches de templating." },
      { authorId: "u6", ago: 18 * MINUTES_IN_DAY, votes: 4, body: "Côté Flutter on a des approches assez proches avec les notifiers. J'ai l'impression que tout le monde converge." }
    ] },
    { id: "t07", categoryId: "javascript", title: "Comment tester un composant qui utilise IntersectionObserver ?", tags: ["tests", "vitest", "jsdom"], views: 214, posts: [
      { authorId: "u7", ago: 340, votes: 2, body: "jsdom n'implémente pas `IntersectionObserver` et mes tests de lazy-loading plantent. Vous mockez l'API à la main ou vous passez par un vrai navigateur avec Playwright ?" }
    ] },
    { id: "t08", categoryId: "javascript", title: "Node 24 : le test runner natif suffit-il pour remplacer Jest ?", tags: ["node", "tests", "jest"], views: 932, posts: [
      { authorId: "u2", ago: 27 * MINUTES_IN_DAY, votes: 8, body: "`node --test` gère maintenant le mock des modules, la couverture et le mode watch. Quelqu'un a déjà retiré Jest d'un projet en production ?" },
      { authorId: "u10", ago: 26 * MINUTES_IN_DAY, votes: 5, body: "Sur mon API Express de stage oui ! 220 tests, aucune dépendance de test, et la CI a gagné 40 secondes. Seul manque : les snapshots sont moins pratiques." }
    ] },
    { id: "t09", categoryId: "backend", title: "Go ou Rust pour un service d'ingestion à fort débit ?", tags: ["go", "rust", "performance"], views: 1720, posts: [
      { authorId: "u5", ago: 2 * MINUTES_IN_DAY, votes: 11, body: "On doit ingérer environ **80 000 événements par seconde** depuis Kafka, les enrichir et les écrire dans ClickHouse. L'équipe connaît surtout Python. Go ou Rust ?" },
      { authorId: "u4", ago: 2 * MINUTES_IN_DAY - 90, votes: 16, body: "Rust te donnera la latence la plus stable (pas de GC), mais la courbe d'apprentissage pour une équipe Python est raide. À ce débit, Go tient très bien la charge." },
      { authorId: "u2", ago: 2 * MINUTES_IN_DAY - 240, votes: 21, body: "+1 pour Go dans votre contexte. On fait 120 k msg/s sur 3 pods avec `franz-go`. Le vrai goulot sera probablement l'écriture par lots dans ClickHouse, pas le langage." }
    ] },
    { id: "t10", categoryId: "backend", title: "PostgreSQL : index partiel ou colonne générée pour filtrer par statut ?", tags: ["postgresql", "sql", "index"], views: 803, solved: true, posts: [
      { authorId: "u8", ago: 11 * MINUTES_IN_DAY, votes: 7, body: "Table de 40 millions de commandes, 95 % au statut `livree`. Les requêtes du back-office ne portent que sur les commandes `en_cours`. Quelle approche choisir ?" },
      { authorId: "u5", ago: 11 * MINUTES_IN_DAY - 60, votes: 19, body: "Un **index partiel** est parfait pour ce cas :\n\n```sql\nCREATE INDEX idx_orders_pending\n  ON orders (created_at)\n  WHERE status = 'en_cours';\n```\n\nIl ne pèse que quelques Mo et le planner l'utilise dès que ta clause `WHERE` contient la même condition." }
    ] },
    { id: "t11", categoryId: "backend", title: "Pagination par curseur avec une API REST : bonnes pratiques ?", tags: ["api", "rest", "pagination"], views: 158, posts: [
      { authorId: "u10", ago: 35, votes: 1, body: "Mon tech lead veut abandonner `?page=3` au profit d'un curseur. Comment encoder le curseur proprement, et comment gérer le tri sur plusieurs colonnes ?" }
    ] },
    { id: "t12", categoryId: "devops", title: "Kubernetes pour une équipe de 4 développeurs, overkill ?", tags: ["kubernetes", "architecture", "débat"], views: 2780, posts: [
      { authorId: "u2", ago: 8 * MINUTES_IN_DAY, votes: 15, body: "Notre CTO veut passer nos 6 services sur Kubernetes managé. On est 4 devs, aucun ops. Je trouve ça disproportionné, vous en pensez quoi ?" },
      { authorId: "u3", ago: 8 * MINUTES_IN_DAY - 100, votes: 33, body: "Honnêtement, pour 6 services et zéro ops, un PaaS ou des conteneurs managés (Cloud Run, Scaleway Serverless Containers…) vous feront gagner des mois. Kubernetes se justifie quand vous avez besoin de son écosystème, pas avant." },
      { authorId: "u4", ago: 7 * MINUTES_IN_DAY, votes: 6, body: "Et si vraiment vous tenez à l'API Kubernetes, k3s sur deux VM fait très bien le travail pour apprendre." }
    ] },
    { id: "t13", categoryId: "devops", title: "GitHub Actions : le cache des dépendances ne se restaure jamais", tags: ["ci", "github-actions", "cache"], views: 667, solved: true, posts: [
      { authorId: "u6", ago: 4 * MINUTES_IN_DAY, votes: 4, body: "Chaque run affiche `Cache not found for input keys` alors que l'étape de sauvegarde passe bien. On utilise `actions/cache` avec la clé `deps-${{ hashFiles('package-lock.json') }}`." },
      { authorId: "u3", ago: 4 * MINUTES_IN_DAY - 30, votes: 12, body: "Classique : les caches sont isolés par branche. Une branche de feature peut lire le cache de `main`, mais pas l'inverse. Lance une fois le workflow sur `main` et ajoute une `restore-keys` plus large :\n\n```yaml\nrestore-keys: |\n  deps-\n```" },
      { authorId: "u6", ago: 3 * MINUTES_IN_DAY, votes: 2, body: "C'était bien ça, merci Sarah ! Pipeline passée de 7 à 3 minutes." }
    ] },
    { id: "t14", categoryId: "devops", title: "Terraform : séparer les états par environnement ou par composant ?", tags: ["terraform", "iac"], views: 301, posts: [
      { authorId: "u3", ago: 22 * 60, votes: 5, body: "Je refonds notre organisation Terraform. Un state par environnement devient énorme (plan de 4 minutes). Vous découpez par composant (réseau, données, applicatif) ? Comment gérez-vous les dépendances entre states ?" }
    ] },
    { id: "t15", categoryId: "mobile", title: "Flutter ou Kotlin Multiplatform pour une appli bancaire ?", tags: ["flutter", "kmp", "sécurité"], views: 1390, posts: [
      { authorId: "u6", ago: 5 * MINUTES_IN_DAY, votes: 9, body: "Appel d'offres pour une néobanque régionale. Ils veulent iOS + Android avec un fort niveau de sécurité et l'intégration de la biométrie native. Je penche pour KMP mais je maîtrise mieux Flutter." },
      { authorId: "u9", ago: 5 * MINUTES_IN_DAY - 180, votes: 13, body: "Côté sécurité, les deux se valent si le stockage des secrets passe par le Keychain et le Keystore natifs. Ce qui comptera pour l'audit : certificate pinning, détection root/jailbreak et obfuscation." },
      { authorId: "u1", ago: 4 * MINUTES_IN_DAY, votes: 3, body: "Si l'UI doit coller aux guidelines natives de chaque plateforme, KMP avec Compose et SwiftUI est plus naturel." }
    ] },
    { id: "t16", categoryId: "mobile", title: "Mode hors-ligne : quelle stratégie de synchronisation adopter ?", tags: ["offline-first", "sync"], views: 512, posts: [
      { authorId: "u5", ago: 16 * MINUTES_IN_DAY, votes: 6, body: "Application de relevés terrain pour des techniciens sans réseau toute la journée. Comment gérer les conflits quand deux techniciens modifient la même fiche ?" },
      { authorId: "u6", ago: 15 * MINUTES_IN_DAY, votes: 10, body: "File d'opérations locale + horodatage serveur, et résolution « dernier qui écrit gagne » par champ plutôt que par fiche. Si les conflits sont fréquents, regarde du côté des CRDT." }
    ] },
    { id: "t17", categoryId: "data", title: "Parquet vs CSV pour les exports clients : vos retours ?", tags: ["parquet", "csv", "export"], views: 455, posts: [
      { authorId: "u5", ago: 10 * MINUTES_IN_DAY, votes: 8, body: "Nos clients récupèrent des exports CSV de 3 Go par jour. Je voudrais proposer Parquet, mais beaucoup utilisent Excel. Vous proposez les deux ?" },
      { authorId: "u8", ago: 10 * MINUTES_IN_DAY - 300, votes: 5, body: "On propose les deux : CSV compressé en gzip par défaut, Parquet en option pour les équipes data. Le Parquet fait **8 fois moins** de volume chez nous." }
    ] },
    { id: "t18", categoryId: "data", title: "DuckDB en production, quelqu'un a sauté le pas ?", tags: ["duckdb", "analytics"], views: 1102, posts: [
      { authorId: "u8", ago: 30 * MINUTES_IN_DAY, votes: 12, body: "On envisage DuckDB pour remplacer un petit entrepôt Redshift qui nous coûte cher pour 200 Go de données. Des retours en production ?" },
      { authorId: "u5", ago: 29 * MINUTES_IN_DAY, votes: 17, body: "Oui, pour des tableaux de bord internes : DuckDB lit directement nos fichiers Parquet sur S3. Facture divisée par 10. Attention en revanche aux écritures concurrentes, ce n'est pas son terrain." }
    ] },
    { id: "t20", categoryId: "carriere", title: "Passer freelance après 3 ans de CDI : vos conseils ?", tags: ["freelance", "reconversion"], views: 1960, posts: [
      { authorId: "u7", ago: 7 * MINUTES_IN_DAY, votes: 10, body: "Je réfléchis à me lancer en freelance spécialisée accessibilité. Statut, TJM, recherche de clients… par quoi avez-vous commencé ?" },
      { authorId: "u2", ago: 7 * MINUTES_IN_DAY - 240, votes: 14, body: "Avoir 2 ou 3 clients potentiels **avant** de démissionner. Et prévoir 6 mois de trésorerie, les premiers paiements arrivent souvent à 60 jours." },
      { authorId: "u9", ago: 6 * MINUTES_IN_DAY, votes: 9, body: "L'accessibilité est une niche très demandée avec les obligations légales de 2025. Ne te sous-vends pas : un audit RGAA se facture bien." }
    ] },
    { id: "t21", categoryId: "accessibilite", title: "Modales accessibles : focus trap maison ou <dialog> natif ?", tags: ["a11y", "dialog", "aria"], views: 870, solved: true, posts: [
      { authorId: "u7", ago: 12 * MINUTES_IN_DAY, votes: 8, body: "Je fais le tour des équipes pour savoir : vous utilisez encore des focus traps JavaScript ou vous êtes passés à l'élément `<dialog>` avec `showModal()` ?" },
      { authorId: "u1", ago: 12 * MINUTES_IN_DAY - 90, votes: 22, body: "`<dialog>` natif partout désormais. `showModal()` rend le reste de la page inerte, gère la touche Échap et le retour du focus. Il reste juste à styler `::backdrop` et à bloquer le scroll du `body`." }
    ] },
    { id: "t22", categoryId: "accessibilite", title: "Contraste des thèmes sombres : quels outils de vérification ?", tags: ["contraste", "dark-mode"], views: 189, posts: [
      { authorId: "u1", ago: 140, votes: 3, body: "On ajoute un thème sombre à notre design system. Vous vérifiez les contrastes avec quoi ? Les extensions que j'utilise ne gèrent pas bien les couleurs semi-transparentes." }
    ] },
    { id: "t24", categoryId: "comptoir", title: "Quel est votre setup de télétravail ?", tags: ["setup", "télétravail"], views: 3210, posts: [
      { authorId: "u4", ago: 18 * MINUTES_IN_DAY, votes: 15, body: "Clavier split, écran 32 pouces vertical pour lire du code et un vieux ThinkPad sous Arch. Et vous ?" },
      { authorId: "u1", ago: 18 * MINUTES_IN_DAY - 60, votes: 9, body: "Bureau assis-debout, MacBook et un écran 27 pouces. Le meilleur investissement reste la chaise." },
      { authorId: "u6", ago: 17 * MINUTES_IN_DAY, votes: 4, body: "Trois téléphones de test sur un support et un hub USB-C qui ne quitte jamais mon bureau." },
      { authorId: "u8", ago: 16 * MINUTES_IN_DAY, votes: 6, body: "Un casque à réduction de bruit : avec deux enfants à la maison, c'est vital." },
      { authorId: "u10", ago: 55, votes: 2, body: "Un portable de 2019 et la table de la cuisine… je prends des notes pour plus tard !" }
    ] }
  ];
  const threads = [];
  const posts = [];
  threadDefinitions.forEach((threadDefinition) => {
    const { posts: threadPostDefinitions, ...threadFields } = threadDefinition;
    threadPostDefinitions.forEach((postDefinition, postIndex) => {
      posts.push({
        id: `${threadDefinition.id}-p${postIndex + 1}`,
        threadId: threadDefinition.id,
        authorId: postDefinition.authorId,
        createdAt: toTimestamp(postDefinition.ago),
        body: postDefinition.body,
        votes: postDefinition.votes
      });
    });
    threads.push({
      ...threadFields,
      pinned: Boolean(threadFields.pinned),
      solved: Boolean(threadFields.solved),
      authorId: threadPostDefinitions[0].authorId,
      createdAt: toTimestamp(threadPostDefinitions[0].ago)
    });
  });
  users.forEach((user) => {
    user.joinedAt = toTimestamp(user.joinedDaysAgo * MINUTES_IN_DAY);
  });
  window.DevAgoraData = {
    currentUserId: "u11",
    badgeDefinitions,
    categories,
    users,
    threads,
    posts
  };
})();
