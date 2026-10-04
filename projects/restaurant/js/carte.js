/* ==========================================================================
   Maison Ambre — menu page: animated category tabs and dietary filters.
   The active category follows the URL hash and filters persist locally.
   ========================================================================== */

const menuCategoryIntroductions = {
  entrees: 'Pour ouvrir l’appétit, au gré du marché des Capucins.',
  plats: 'Cuissons lentes, jus réduits et garnitures de saison.',
  desserts: 'La touche sucrée de notre pâtissière, Inès Larrieu.',
  vins: 'Une sélection de vignerons indépendants, servie au verre ou à la bouteille.',
};

const menuItemsByCategory = {
  entrees: [
    { name: 'Velouté de potimarron', description: 'Châtaignes torréfiées, crème crue de la ferme Lartigue et huile de noisette.', price: '12 €', vegetarian: true, glutenFree: true },
    { name: 'Huîtres du Cap Ferret n°3', description: 'Six huîtres, mignonnette à l’échalote grise, pain de seigle et beurre demi-sel.', price: '16 €', vegetarian: false, glutenFree: false },
    { name: 'Tartare de bœuf de Bazas', description: 'Taillé au couteau, jaune d’œuf confit, câpres frites et pickles de shiitakés.', price: '15 €', vegetarian: false, glutenFree: true },
    { name: 'Œuf parfait 64 °C', description: 'Crème de cèpes, mouillettes de brioche toastée et copeaux de comté 24 mois.', price: '14 €', vegetarian: true, glutenFree: false },
    { name: 'Burrata & figues rôties', description: 'Figues de Solliès au thym, roquette sauvage et vinaigre balsamique vieilli.', price: '13 €', vegetarian: true, glutenFree: true },
    { name: 'Terrine de canard maison', description: 'Foie gras des Landes, chutney de coing et pain de campagne grillé.', price: '17 €', vegetarian: false, glutenFree: false },
  ],
  plats: [
    { name: 'Bœuf de Bazas maturé 30 jours', description: 'Cuit au sarment, jus corsé au Saint-Émilion, échalotes confites et pommes grenaille.', price: '34 €', vegetarian: false, glutenFree: true },
    { name: 'Merlu de ligne nacré', description: 'Beurre blanc au piment d’Espelette, poireaux fondants et coques du Bassin.', price: '29 €', vegetarian: false, glutenFree: true },
    { name: 'Agneau de Pauillac', description: 'Épaule confite sept heures, carottes glacées au cumin et semoule aux herbes.', price: '32 €', vegetarian: false, glutenFree: false },
    { name: 'Risotto de petit épeautre', description: 'Champignons des bois, parmesan affiné et beurre noisette à la sauge.', price: '24 €', vegetarian: true, glutenFree: false },
    { name: 'Jardin d’automne', description: 'Courges rôties au miel de bruyère, chèvre frais, noisettes et sauge croustillante.', price: '22 €', vegetarian: true, glutenFree: true },
    { name: 'Magret de canard des Landes', description: 'Laqué au miel et vinaigre de Xérès, purée de céleri et poire pochée.', price: '28 €', vegetarian: false, glutenFree: true },
  ],
  desserts: [
    { name: 'Canelé façon Ambre', description: 'Canelé tiède caramélisé, glace vanille de Tahiti et rhum ambré flambé à table.', price: '12 €', vegetarian: true, glutenFree: false },
    { name: 'Tarte fine aux pommes', description: 'Pâte feuilletée maison, pommes reinettes du Limousin et crème d’Isigny.', price: '11 €', vegetarian: true, glutenFree: false },
    { name: 'Moelleux chocolat noir', description: 'Grand cru du Pérou 70 %, cœur coulant et sorbet framboise.', price: '12 €', vegetarian: true, glutenFree: true },
    { name: 'Pavlova aux agrumes', description: 'Meringue croquante, crème de yuzu, suprêmes de pamplemousse et basilic.', price: '11 €', vegetarian: true, glutenFree: true },
    { name: 'Plateau de fromages affinés', description: 'Sélection de la fromagerie Deruelle : ossau-iraty, tomme des Pyrénées, bleu des Causses.', price: '14 €', vegetarian: true, glutenFree: true },
  ],
  vins: [
    { name: 'Château Pey La Tour — Bordeaux', description: 'Rouge souple, fruits rouges et notes épicées. Merlot majoritaire.', price: '7 € / 32 €', badges: ['Rouge', 'Au verre'] },
    { name: 'Domaine des Moirots — Côtes-de-Bourg', description: 'Rouge charpenté, tanins fondus, cassis et réglisse. Vigneron indépendant.', price: '9 € / 42 €', badges: ['Rouge', 'Bio'] },
    { name: 'Clos Bellevue — Saint-Émilion Grand Cru', description: 'Ample et élégant, fruits noirs, cacao et fin de bouche boisée.', price: '78 €', badges: ['Rouge', 'Bouteille'] },
    { name: 'Château Graville — Entre-deux-Mers', description: 'Blanc vif, agrumes et fleurs blanches. Idéal avec les huîtres.', price: '6 € / 28 €', badges: ['Blanc', 'Au verre'] },
    { name: 'Les Hauts de Lagarde — Graves blanc', description: 'Sauvignon et sémillon, belle rondeur et notes de pêche blanche.', price: '8 € / 38 €', badges: ['Blanc', 'Bio'] },
    { name: 'Château Laville — Sauternes', description: 'Liquoreux équilibré, abricot sec, miel et safran. Parfait sur le canelé.', price: '11 € / 64 €', badges: ['Liquoreux', 'Au verre'] },
    { name: 'Crémant de Bordeaux rosé', description: 'Bulles fines, petits fruits rouges. Maison Jaillance.', price: '8 € / 36 €', badges: ['Effervescent', 'Au verre'] },
  ],
};

const menuFilterStorageKey = 'maisonAmbreMenuFilters';

const menuTabListElement = document.querySelector('[data-menu-tabs]');
const menuTabButtonElements = Array.from(document.querySelectorAll('.menu-tab'));
const menuTabIndicatorElement = document.querySelector('.menu-tabs__indicator');
const menuPanelElement = document.getElementById('panneau-carte');
const menuListElement = document.querySelector('[data-menu-list]');
const menuIntroElement = document.querySelector('[data-menu-intro]');
const dietFilterButtonElements = Array.from(document.querySelectorAll('[data-diet-filter]'));

const menuState = {
  activeCategory: 'entrees',
  activeDietFilters: loadStoredDietFilters(),
};

/* Reads persisted dietary filters from localStorage */
function loadStoredDietFilters() {
  try {
    const storedFilters = JSON.parse(localStorage.getItem(menuFilterStorageKey));
    return Array.isArray(storedFilters) ? storedFilters : [];
  } catch (storageError) {
    return [];
  }
}

/* Persists the active dietary filters */
function persistDietFilters() {
  try {
    localStorage.setItem(menuFilterStorageKey, JSON.stringify(menuState.activeDietFilters));
  } catch (storageError) {
    menuState.storageUnavailable = true;
  }
}

/* Returns true when a dish matches every active dietary filter */
function doesMenuItemMatchFilters(menuItem) {
  return menuState.activeDietFilters.every((dietFilterKey) => {
    if (dietFilterKey === 'vegetarien') return menuItem.vegetarian;
    if (dietFilterKey === 'sansGluten') return menuItem.glutenFree;
    return true;
  });
}

/* Builds the badge list displayed under a menu item */
function getMenuItemBadges(menuItem) {
  if (menuItem.badges) return menuItem.badges.map((badgeLabel) => ({ label: badgeLabel, isWine: true }));
  const dietBadges = [];
  if (menuItem.vegetarian) dietBadges.push({ label: 'Végétarien', isWine: false });
  if (menuItem.glutenFree) dietBadges.push({ label: 'Sans gluten', isWine: false });
  return dietBadges;
}

/* Moves the sliding indicator under the selected tab */
function positionTabIndicator() {
  const selectedTabElement = menuTabButtonElements.find((tabButtonElement) => tabButtonElement.dataset.category === menuState.activeCategory);
  menuTabIndicatorElement.style.width = `${selectedTabElement.offsetWidth}px`;
  menuTabIndicatorElement.style.transform = `translateX(${selectedTabElement.offsetLeft}px)`;
}

/* Renders tabs, filters and the list of items for the current state */
function renderMenu() {
  const isWineCategory = menuState.activeCategory === 'vins';
  const categoryItems = menuItemsByCategory[menuState.activeCategory];
  const visibleItems = isWineCategory ? categoryItems : categoryItems.filter(doesMenuItemMatchFilters);
  menuTabButtonElements.forEach((tabButtonElement) => {
    const isSelected = tabButtonElement.dataset.category === menuState.activeCategory;
    tabButtonElement.setAttribute('aria-selected', String(isSelected));
    tabButtonElement.tabIndex = isSelected ? 0 : -1;
    if (isSelected) menuPanelElement.setAttribute('aria-labelledby', tabButtonElement.id);
  });
  dietFilterButtonElements.forEach((filterButtonElement) => {
    filterButtonElement.setAttribute('aria-pressed', String(menuState.activeDietFilters.includes(filterButtonElement.dataset.dietFilter)));
    filterButtonElement.disabled = isWineCategory;
  });
  positionTabIndicator();
  menuIntroElement.textContent = isWineCategory ? `${menuCategoryIntroductions.vins} Les filtres alimentaires ne s’appliquent pas aux vins.` : menuCategoryIntroductions[menuState.activeCategory];
  menuListElement.replaceChildren();
  if (!visibleItems.length) {
    const emptyMessageElement = document.createElement('li');
    emptyMessageElement.className = 'menu-empty';
    emptyMessageElement.textContent = 'Aucun plat ne correspond à ces filtres dans cette catégorie. Demandez-nous : la cuisine peut souvent adapter une assiette.';
    menuListElement.appendChild(emptyMessageElement);
    return;
  }
  visibleItems.forEach((menuItem, itemIndex) => {
    const menuItemElement = document.createElement('li');
    menuItemElement.className = 'menu-item';
    menuItemElement.style.setProperty('--item-index', String(itemIndex));
    const badgeMarkup = getMenuItemBadges(menuItem).map((badge) => `<span class="diet-badge${badge.isWine ? ' diet-badge--wine' : ''}">${badge.label}</span>`).join('');
    menuItemElement.innerHTML = `<h3 class="menu-item__name">${menuItem.name}</h3><span class="menu-item__price">${menuItem.price}</span><p class="menu-item__description">${menuItem.description}</p><div class="menu-item__badges">${badgeMarkup}</div>`;
    menuListElement.appendChild(menuItemElement);
  });
}

/* Activates a category and keeps the URL hash in sync */
function selectMenuCategory(categoryKey, shouldFocusTab) {
  if (!menuItemsByCategory[categoryKey]) return;
  menuState.activeCategory = categoryKey;
  history.replaceState(null, '', `#${categoryKey}`);
  renderMenu();
  if (shouldFocusTab) menuTabButtonElements.find((tabButtonElement) => tabButtonElement.dataset.category === categoryKey).focus();
}

menuTabButtonElements.forEach((tabButtonElement) => {
  tabButtonElement.addEventListener('click', () => selectMenuCategory(tabButtonElement.dataset.category, false));
});

menuTabListElement.addEventListener('keydown', (keyboardEvent) => {
  const currentTabIndex = menuTabButtonElements.findIndex((tabButtonElement) => tabButtonElement.dataset.category === menuState.activeCategory);
  const indexOffsetByKey = { ArrowRight: 1, ArrowLeft: -1 };
  if (keyboardEvent.key === 'Home') selectMenuCategory(menuTabButtonElements[0].dataset.category, true);
  if (keyboardEvent.key === 'End') selectMenuCategory(menuTabButtonElements[menuTabButtonElements.length - 1].dataset.category, true);
  if (!(keyboardEvent.key in indexOffsetByKey)) return;
  keyboardEvent.preventDefault();
  const nextTabIndex = (currentTabIndex + indexOffsetByKey[keyboardEvent.key] + menuTabButtonElements.length) % menuTabButtonElements.length;
  selectMenuCategory(menuTabButtonElements[nextTabIndex].dataset.category, true);
});

dietFilterButtonElements.forEach((filterButtonElement) => {
  filterButtonElement.addEventListener('click', () => {
    const dietFilterKey = filterButtonElement.dataset.dietFilter;
    const isAlreadyActive = menuState.activeDietFilters.includes(dietFilterKey);
    menuState.activeDietFilters = isAlreadyActive ? menuState.activeDietFilters.filter((activeKey) => activeKey !== dietFilterKey) : [...menuState.activeDietFilters, dietFilterKey];
    persistDietFilters();
    renderMenu();
  });
});

if ('ResizeObserver' in window) new ResizeObserver(positionTabIndicator).observe(menuTabListElement);
if (document.fonts) document.fonts.ready.then(positionTabIndicator);

selectMenuCategory(window.location.hash.slice(1) in menuItemsByCategory ? window.location.hash.slice(1) : 'entrees', false);
