/* Category page: thread list with sorting modes, pagination and graceful handling of unknown ids. */
const THREADS_PER_PAGE = 5;
const sortModeDefinitions = {
  recent: { label: "Récents", description: "Activité la plus récente en premier" },
  popular: { label: "Populaires", description: "Vues, votes et réponses combinés" },
  unanswered: { label: "Sans réponse", description: "Sujets qui attendent votre aide" }
};

const categoryPageElements = {
  pageRoot: document.querySelector("[data-category-page]"),
  headerContainer: document.querySelector("[data-category-header]"),
  sortTabList: document.querySelector("[data-sort-tabs]"),
  threadList: document.querySelector("[data-category-threads]"),
  paginationNav: document.querySelector("[data-pagination]"),
  otherCategoryList: document.querySelector("[data-other-categories]"),
  breadcrumbCurrent: document.querySelector("[data-breadcrumb-current]")
};

const requestedCategoryId = getQueryParameter("id");
const currentCategory = DevAgoraStore.getCategoryById(requestedCategoryId);
const categoryViewState = {
  sortMode: Object.prototype.hasOwnProperty.call(sortModeDefinitions, getQueryParameter("tri")) ? getQueryParameter("tri") : "recent",
  currentPage: Math.max(1, parseInt(getQueryParameter("page"), 10) || 1)
};

function getSortedCategoryThreads() {
  const categoryThreads = DevAgoraStore.getAllThreads().filter((thread) => thread.categoryId === currentCategory.id);
  if (categoryViewState.sortMode === "popular") return categoryThreads.sort((firstThread, secondThread) => secondThread.popularity - firstThread.popularity);
  if (categoryViewState.sortMode === "unanswered") return categoryThreads.filter((thread) => thread.replyCount === 0).sort((firstThread, secondThread) => secondThread.createdAt - firstThread.createdAt);
  return categoryThreads.sort((firstThread, secondThread) => Number(secondThread.pinned) - Number(firstThread.pinned) || secondThread.lastActivityAt - firstThread.lastActivityAt);
}

function syncCategoryUrl() {
  const urlParameters = new URLSearchParams({ id: currentCategory.id });
  if (categoryViewState.sortMode !== "recent") urlParameters.set("tri", categoryViewState.sortMode);
  if (categoryViewState.currentPage > 1) urlParameters.set("page", String(categoryViewState.currentPage));
  window.history.replaceState(null, "", `?${urlParameters.toString()}`);
}

function renderCategoryHeader() {
  const categoryStats = DevAgoraStore.getCategoryStats(currentCategory.id);
  document.title = `${currentCategory.name} · DevAgora`;
  categoryPageElements.breadcrumbCurrent.textContent = currentCategory.name;
  categoryPageElements.headerContainer.style.setProperty("--category-color", currentCategory.color);
  categoryPageElements.headerContainer.innerHTML = `
    <span class="category-hero__icon">${renderCategoryIcon(currentCategory)}</span>
    <div class="category-hero__text">
      <p class="eyebrow">Catégorie</p>
      <h1>${escapeHtml(currentCategory.name)}</h1>
      <p>${escapeHtml(currentCategory.description)}</p>
      <ul class="category-hero__stats">
        <li><strong data-count-to="${categoryStats.threadCount}">0</strong> sujets</li>
        <li><strong data-count-to="${categoryStats.postCount}">0</strong> messages</li>
      </ul>
    </div>
    <a class="button button--primary" href="nouveau-sujet.html?categorie=${encodeURIComponent(currentCategory.id)}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
      Nouveau sujet
    </a>`;
}

function renderSortTabs() {
  categoryPageElements.sortTabList.innerHTML = Object.entries(sortModeDefinitions).map(([sortModeKey, sortMode]) => `
    <button type="button" class="segmented__option" data-sort-mode="${sortModeKey}" aria-pressed="${sortModeKey === categoryViewState.sortMode}" title="${sortMode.description}">${sortMode.label}</button>`).join("");
}

function renderPagination(totalPageCount) {
  if (totalPageCount <= 1) {
    categoryPageElements.paginationNav.innerHTML = "";
    return;
  }
  const activePage = categoryViewState.currentPage;
  const pageButtons = Array.from({ length: totalPageCount }, (unusedValue, pageIndex) => pageIndex + 1).map((pageNumber) => `<button type="button" class="pagination__page" data-page-number="${pageNumber}" ${pageNumber === activePage ? 'aria-current="page"' : ""} aria-label="Page ${pageNumber}">${pageNumber}</button>`).join("");
  categoryPageElements.paginationNav.innerHTML = `
    <button type="button" class="pagination__step" data-page-number="${activePage - 1}" ${activePage === 1 ? "disabled" : ""}>← Précédent</button>
    <div class="pagination__pages">${pageButtons}</div>
    <button type="button" class="pagination__step" data-page-number="${activePage + 1}" ${activePage === totalPageCount ? "disabled" : ""}>Suivant →</button>`;
}

function renderCategoryThreads() {
  const sortedThreads = getSortedCategoryThreads();
  const totalPageCount = Math.max(1, Math.ceil(sortedThreads.length / THREADS_PER_PAGE));
  categoryViewState.currentPage = Math.min(categoryViewState.currentPage, totalPageCount);
  const pageStartIndex = (categoryViewState.currentPage - 1) * THREADS_PER_PAGE;
  const visibleThreads = sortedThreads.slice(pageStartIndex, pageStartIndex + THREADS_PER_PAGE);
  const emptyMessage = categoryViewState.sortMode === "unanswered" ? "Tous les sujets de cette catégorie ont reçu au moins une réponse. Bravo à la communauté !" : "Personne n'a encore lancé de discussion ici. Soyez la première ou le premier !";
  categoryPageElements.threadList.innerHTML = visibleThreads.length
    ? visibleThreads.map((thread) => renderThreadRow(thread)).join("")
    : renderEmptyState("Aucun sujet à afficher", emptyMessage, `<a class="button button--primary" href="nouveau-sujet.html?categorie=${encodeURIComponent(currentCategory.id)}">Créer un sujet</a>`);
  renderPagination(totalPageCount);
  syncCategoryUrl();
  observeRevealElements(categoryPageElements.threadList);
}

function renderOtherCategories() {
  categoryPageElements.otherCategoryList.innerHTML = DevAgoraStore.categories.filter((category) => category.id !== (currentCategory && currentCategory.id)).map((category) => `
    <li><a href="categorie.html?id=${encodeURIComponent(category.id)}" style="--category-color:${category.color}"><span class="dot" aria-hidden="true"></span>${escapeHtml(category.name)}<span class="count">${DevAgoraStore.getCategoryStats(category.id).threadCount}</span></a></li>`).join("");
}

function renderUnknownCategory() {
  document.title = "Catégorie introuvable · DevAgora";
  categoryPageElements.breadcrumbCurrent.textContent = "Catégorie introuvable";
  categoryPageElements.pageRoot.innerHTML = renderEmptyState(
    "Catégorie introuvable",
    requestedCategoryId ? "Cette catégorie n'existe pas ou a été renommée." : "Aucune catégorie n'a été précisée dans l'adresse.",
    '<a class="button button--primary" href="index.html#categories">Voir toutes les catégories</a>',
    "h1"
  );
}

renderOtherCategories();

if (currentCategory) {
  renderCategoryHeader();
  renderSortTabs();
  renderCategoryThreads();
  categoryPageElements.sortTabList.addEventListener("click", (clickEvent) => {
    const sortButton = clickEvent.target.closest("[data-sort-mode]");
    if (!sortButton) return;
    categoryViewState.sortMode = sortButton.dataset.sortMode;
    categoryViewState.currentPage = 1;
    renderSortTabs();
    renderCategoryThreads();
  });
  categoryPageElements.paginationNav.addEventListener("click", (clickEvent) => {
    const pageButton = clickEvent.target.closest("[data-page-number]");
    if (!pageButton || pageButton.disabled) return;
    categoryViewState.currentPage = Number(pageButton.dataset.pageNumber);
    renderCategoryThreads();
    categoryPageElements.sortTabList.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
  });
} else {
  renderUnknownCategory();
}
