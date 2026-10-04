/* Catalogue page: category filters, dual price slider, sorting, live search and quick-view modal. */
const PRICE_SLIDER_STEP = 10;
const highestCatalogPrice = Math.ceil(Math.max(...NordikCatalog.products.map((product) => product.price)) / 100) * 100;

const catalogueElements = {
  categoryFilterList: document.querySelector("[data-category-filters]"),
  minimumPriceInput: document.querySelector("#price-min"),
  maximumPriceInput: document.querySelector("#price-max"),
  priceRangeOutput: document.querySelector("[data-price-output]"),
  priceRangeTrack: document.querySelector("[data-price-track]"),
  sortSelect: document.querySelector("#sort-select"),
  searchInput: document.querySelector("#catalogue-search"),
  resultCount: document.querySelector("[data-result-count]"),
  productGrid: document.querySelector("[data-product-grid]"),
  pageTitle: document.querySelector("[data-catalogue-title]"),
  pageIntro: document.querySelector("[data-catalogue-intro]"),
  filterToggleButton: document.querySelector("[data-filter-toggle]"),
  filterPanel: document.querySelector("[data-filter-panel]"),
  quickViewDialog: document.querySelector("#quick-view"),
  quickViewContent: document.querySelector("[data-quick-view-content]")
};

const catalogueState = {
  categoryId: NordikCatalog.getCategoryById(getQueryParameter("cat")) ? getQueryParameter("cat") : "all",
  searchQuery: getQueryParameter("q") || "",
  sortMode: getQueryParameter("tri") || "featured",
  minimumPrice: Number(getQueryParameter("min")) || 0,
  maximumPrice: Number(getQueryParameter("max")) || highestCatalogPrice
};

const sortComparators = {
  featured: (firstProduct, secondProduct) => Number(secondProduct.bestseller) - Number(firstProduct.bestseller) || secondProduct.reviewCount - firstProduct.reviewCount,
  "price-asc": (firstProduct, secondProduct) => firstProduct.price - secondProduct.price,
  "price-desc": (firstProduct, secondProduct) => secondProduct.price - firstProduct.price,
  newest: (firstProduct, secondProduct) => Number(secondProduct.isNew) - Number(firstProduct.isNew) || secondProduct.rating - firstProduct.rating,
  rating: (firstProduct, secondProduct) => secondProduct.rating - firstProduct.rating || secondProduct.reviewCount - firstProduct.reviewCount
};

function getFilteredProducts() {
  const normalizedQueryWords = normalizeSearchText(catalogueState.searchQuery.trim()).split(/\s+/).filter(Boolean);
  return NordikCatalog.products.filter((product) => {
    const category = NordikCatalog.getCategoryById(product.category);
    const searchableText = normalizeSearchText([product.name, category.name, product.description, product.designer, product.colors.map((color) => color.name).join(" ")].join(" "));
    const matchesCategory = catalogueState.categoryId === "all" || product.category === catalogueState.categoryId;
    const matchesPrice = product.price >= catalogueState.minimumPrice && product.price <= catalogueState.maximumPrice;
    const matchesQuery = normalizedQueryWords.every((queryWord) => searchableText.includes(queryWord));
    return matchesCategory && matchesPrice && matchesQuery;
  }).sort(sortComparators[catalogueState.sortMode] || sortComparators.featured);
}

function syncCatalogueUrl() {
  const urlParameters = new URLSearchParams();
  if (catalogueState.categoryId !== "all") urlParameters.set("cat", catalogueState.categoryId);
  if (catalogueState.searchQuery.trim()) urlParameters.set("q", catalogueState.searchQuery.trim());
  if (catalogueState.sortMode !== "featured") urlParameters.set("tri", catalogueState.sortMode);
  if (catalogueState.minimumPrice > 0) urlParameters.set("min", String(catalogueState.minimumPrice));
  if (catalogueState.maximumPrice < highestCatalogPrice) urlParameters.set("max", String(catalogueState.maximumPrice));
  const queryString = urlParameters.toString();
  window.history.replaceState(null, "", queryString ? `?${queryString}` : window.location.pathname);
}

function renderCategoryFilters() {
  const filterOptions = [{ id: "all", name: "Tout voir" }].concat(NordikCatalog.categories);
  catalogueElements.categoryFilterList.innerHTML = filterOptions.map((filterOption) => {
    const optionCount = filterOption.id === "all" ? NordikCatalog.products.length : NordikCatalog.products.filter((product) => product.category === filterOption.id).length;
    return `<li><button type="button" class="filter-chip" data-category-filter="${filterOption.id}" aria-pressed="${filterOption.id === catalogueState.categoryId}">${escapeHtml(filterOption.name)} <span>${optionCount}</span></button></li>`;
  }).join("");
  const activeCategory = NordikCatalog.getCategoryById(catalogueState.categoryId);
  catalogueElements.pageTitle.textContent = activeCategory ? activeCategory.name : "Toute la collection";
  catalogueElements.pageIntro.textContent = activeCategory ? `${activeCategory.tagline}. Des pièces choisies chez nos artisans du Nord.` : "Luminaires, céramiques, textiles et mobilier : des pièces simples et durables, sélectionnées auprès d'ateliers scandinaves.";
  document.title = `${activeCategory ? activeCategory.name : "Catalogue"} · Nordik Store`;
}

function renderPriceRange() {
  const minimumRatio = catalogueState.minimumPrice / highestCatalogPrice;
  const maximumRatio = catalogueState.maximumPrice / highestCatalogPrice;
  catalogueElements.priceRangeTrack.style.setProperty("--range-start", `${minimumRatio * 100}%`);
  catalogueElements.priceRangeTrack.style.setProperty("--range-end", `${maximumRatio * 100}%`);
  catalogueElements.priceRangeOutput.textContent = `${formatPrice(catalogueState.minimumPrice)} – ${formatPrice(catalogueState.maximumPrice)}`;
}

function renderProductGrid() {
  const filteredProducts = getFilteredProducts();
  catalogueElements.resultCount.textContent = `${filteredProducts.length} produit${filteredProducts.length > 1 ? "s" : ""}`;
  catalogueElements.productGrid.innerHTML = filteredProducts.length
    ? filteredProducts.map((product) => renderProductCard(product, { withQuickView: true })).join("")
    : `<div class="empty-results">
        <h2>Aucun produit ne correspond</h2>
        <p>Essayez d'élargir la fourchette de prix ou de modifier votre recherche.</p>
        <button type="button" class="button button--primary" data-reset-filters>Réinitialiser les filtres</button>
      </div>`;
  syncCatalogueUrl();
  observeRevealElements(catalogueElements.productGrid);
}

function refreshCatalogue() {
  renderCategoryFilters();
  renderPriceRange();
  renderProductGrid();
}

function resetCatalogueFilters() {
  Object.assign(catalogueState, { categoryId: "all", searchQuery: "", sortMode: "featured", minimumPrice: 0, maximumPrice: highestCatalogPrice });
  catalogueElements.searchInput.value = "";
  catalogueElements.sortSelect.value = "featured";
  catalogueElements.minimumPriceInput.value = "0";
  catalogueElements.maximumPriceInput.value = String(highestCatalogPrice);
  refreshCatalogue();
}

function handlePriceInput(changedInput) {
  let minimumValue = Number(catalogueElements.minimumPriceInput.value);
  let maximumValue = Number(catalogueElements.maximumPriceInput.value);
  if (minimumValue > maximumValue - PRICE_SLIDER_STEP) {
    if (changedInput === catalogueElements.minimumPriceInput) minimumValue = maximumValue - PRICE_SLIDER_STEP;
    else maximumValue = minimumValue + PRICE_SLIDER_STEP;
    catalogueElements.minimumPriceInput.value = String(minimumValue);
    catalogueElements.maximumPriceInput.value = String(maximumValue);
  }
  catalogueState.minimumPrice = minimumValue;
  catalogueState.maximumPrice = maximumValue;
  renderPriceRange();
  renderProductGrid();
}

/* Quick-view modal built on the native dialog element. */
function openQuickView(productId) {
  const product = NordikCatalog.getProductById(productId);
  if (!product) return;
  const category = NordikCatalog.getCategoryById(product.category);
  const sizeSelectMarkup = product.sizes.length ? `
    <label class="field-label" for="quick-view-size">Taille</label>
    <select id="quick-view-size" class="select-input" data-quick-view-size>${product.sizes.map((size) => `<option value="${escapeHtml(size.label)}">${escapeHtml(size.label)}${size.priceDelta ? ` (+${formatPrice(size.priceDelta)})` : ""}</option>`).join("")}</select>` : "";
  catalogueElements.quickViewContent.innerHTML = `
    <div class="quick-view__media"><img src="${product.image}" alt="${escapeHtml(product.name)}" width="900" height="1100"></div>
    <div class="quick-view__info">
      <p class="eyebrow">${escapeHtml(category.name)}</p>
      <h2 id="quick-view-title">${escapeHtml(product.name)}</h2>
      <p class="quick-view__rating">${renderRatingStars(product.rating)} <span>${product.reviewCount} avis</span></p>
      <p class="quick-view__price" data-quick-view-price>${renderPriceMarkup(product)}</p>
      <p class="quick-view__description">${escapeHtml(product.description)}</p>
      <fieldset class="swatch-group">
        <legend class="field-label">Coloris : <span data-quick-view-color-name>${escapeHtml(product.colors[0].name)}</span></legend>
        ${product.colors.map((color, colorIndex) => `<label class="swatch" style="--swatch:${color.hex}"><input type="radio" name="quick-view-color" value="${escapeHtml(color.name)}" ${colorIndex === 0 ? "checked" : ""}><span class="visually-hidden">${escapeHtml(color.name)}</span></label>`).join("")}
      </fieldset>
      ${sizeSelectMarkup}
      <div class="quick-view__actions">
        <button type="button" class="button button--primary" data-quick-view-add="${product.id}">Ajouter au panier</button>
        <a class="button button--ghost" href="produit.html?id=${encodeURIComponent(product.id)}">Voir la fiche</a>
      </div>
    </div>`;
  catalogueElements.quickViewDialog.showModal();
}

function initQuickView() {
  catalogueElements.productGrid.addEventListener("click", (clickEvent) => {
    const quickViewButton = clickEvent.target.closest("[data-quick-view]");
    if (quickViewButton) openQuickView(quickViewButton.dataset.quickView);
  });
  catalogueElements.quickViewDialog.addEventListener("click", (clickEvent) => {
    const addButton = clickEvent.target.closest("[data-quick-view-add]");
    if (clickEvent.target === catalogueElements.quickViewDialog || clickEvent.target.closest("[data-close-quick-view]")) catalogueElements.quickViewDialog.close();
    if (!addButton) return;
    const selectedColorInput = catalogueElements.quickViewDialog.querySelector("input[name=quick-view-color]:checked");
    const selectedSizeSelect = catalogueElements.quickViewDialog.querySelector("[data-quick-view-size]");
    catalogueElements.quickViewDialog.close();
    addProductToCart({ productId: addButton.dataset.quickViewAdd, color: selectedColorInput ? selectedColorInput.value : "", size: selectedSizeSelect ? selectedSizeSelect.value : "", quantity: 1 });
  });
  catalogueElements.quickViewDialog.addEventListener("change", (changeEvent) => {
    const product = NordikCatalog.getProductById(catalogueElements.quickViewDialog.querySelector("[data-quick-view-add]").dataset.quickViewAdd);
    if (changeEvent.target.name === "quick-view-color") catalogueElements.quickViewDialog.querySelector("[data-quick-view-color-name]").textContent = changeEvent.target.value;
    if (changeEvent.target.matches("[data-quick-view-size]")) catalogueElements.quickViewDialog.querySelector("[data-quick-view-price]").innerHTML = renderPriceMarkup(product, NordikCatalog.getUnitPrice(product, changeEvent.target.value));
  });
}

function initCatalogueControls() {
  [catalogueElements.minimumPriceInput, catalogueElements.maximumPriceInput].forEach((priceInput) => {
    priceInput.max = String(highestCatalogPrice);
    priceInput.step = String(PRICE_SLIDER_STEP);
    priceInput.addEventListener("input", () => handlePriceInput(priceInput));
  });
  catalogueElements.minimumPriceInput.value = String(catalogueState.minimumPrice);
  catalogueElements.maximumPriceInput.value = String(catalogueState.maximumPrice);
  catalogueElements.sortSelect.value = sortComparators[catalogueState.sortMode] ? catalogueState.sortMode : "featured";
  catalogueElements.searchInput.value = catalogueState.searchQuery;
  catalogueElements.categoryFilterList.addEventListener("click", (clickEvent) => {
    const filterButton = clickEvent.target.closest("[data-category-filter]");
    if (!filterButton) return;
    catalogueState.categoryId = filterButton.dataset.categoryFilter;
    refreshCatalogue();
  });
  catalogueElements.sortSelect.addEventListener("change", () => {
    catalogueState.sortMode = catalogueElements.sortSelect.value;
    renderProductGrid();
  });
  catalogueElements.searchInput.addEventListener("input", () => {
    catalogueState.searchQuery = catalogueElements.searchInput.value;
    renderProductGrid();
  });
  document.addEventListener("click", (clickEvent) => {
    if (clickEvent.target.closest("[data-reset-filters]")) resetCatalogueFilters();
  });
  catalogueElements.filterToggleButton.addEventListener("click", () => {
    const isExpanded = catalogueElements.filterToggleButton.getAttribute("aria-expanded") === "true";
    catalogueElements.filterToggleButton.setAttribute("aria-expanded", String(!isExpanded));
    catalogueElements.filterPanel.classList.toggle("is-open", !isExpanded);
  });
}

initCatalogueControls();
initQuickView();
refreshCatalogue();
