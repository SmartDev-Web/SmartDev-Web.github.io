/* Home page: forum statistics, categories, latest threads, live search and community sidebar. */
const homeElements = {
  statsContainer: document.querySelector("[data-forum-stats]"),
  categoryList: document.querySelector("[data-category-list]"),
  threadListHeading: document.querySelector("[data-thread-list-heading]"),
  threadListCaption: document.querySelector("[data-thread-list-caption]"),
  threadList: document.querySelector("[data-thread-list]"),
  searchInput: document.querySelector("#thread-search"),
  searchClearButton: document.querySelector("[data-search-clear]"),
  onlineMemberList: document.querySelector("[data-online-members]"),
  onlineMemberCount: document.querySelector("[data-online-count]"),
  popularTagList: document.querySelector("[data-popular-tags]"),
  topContributorList: document.querySelector("[data-top-contributors]")
};

function renderForumStats() {
  const forumTotals = DevAgoraStore.getForumTotals();
  const statDefinitions = [
    ["Membres", forumTotals.memberCount + 18420],
    ["Sujets", forumTotals.threadCount + 6290],
    ["Messages", forumTotals.postCount + 48712],
    ["En ligne", forumTotals.onlineCount + 312]
  ];
  homeElements.statsContainer.innerHTML = statDefinitions.map(([statLabel, statValue]) => `<div class="hero-stat"><dt>${statLabel}</dt><dd data-count-to="${statValue}">0</dd></div>`).join("");
}

function renderCategoryList() {
  homeElements.categoryList.innerHTML = DevAgoraStore.categories.map((category) => {
    const categoryStats = DevAgoraStore.getCategoryStats(category.id);
    const latestThread = categoryStats.latestThread;
    const latestThreadMarkup = latestThread ? `<a href="sujet.html?id=${encodeURIComponent(latestThread.id)}">${escapeHtml(latestThread.title)}</a><span>${formatRelativeTime(latestThread.lastActivityAt)}</span>` : "<span>Aucun sujet pour le moment</span>";
    return `
      <li class="category-card reveal" style="--category-color:${category.color}">
        <span class="category-card__icon">${renderCategoryIcon(category)}</span>
        <div class="category-card__body">
          <h3><a href="categorie.html?id=${encodeURIComponent(category.id)}">${escapeHtml(category.name)}</a></h3>
          <p>${escapeHtml(category.description)}</p>
        </div>
        <dl class="category-card__stats">
          <div><dt>Sujets</dt><dd>${formatNumber(categoryStats.threadCount)}</dd></div>
          <div><dt>Messages</dt><dd>${formatNumber(categoryStats.postCount)}</dd></div>
        </dl>
        <div class="category-card__latest">${latestThreadMarkup}</div>
      </li>`;
  }).join("");
}

function renderLatestThreads() {
  const latestThreads = DevAgoraStore.getAllThreads().sort((firstThread, secondThread) => secondThread.lastActivityAt - firstThread.lastActivityAt).slice(0, 8);
  homeElements.threadListHeading.textContent = "Dernières discussions";
  homeElements.threadListCaption.textContent = "Les sujets les plus récemment actifs, toutes catégories confondues.";
  homeElements.threadList.innerHTML = latestThreads.map((thread) => renderThreadRow(thread, { showCategory: true })).join("");
  observeRevealElements(homeElements.threadList);
}

function threadMatchesQuery(thread, normalizedQuery) {
  const threadAuthor = DevAgoraStore.getUserById(thread.authorId);
  const threadCategory = DevAgoraStore.getCategoryById(thread.categoryId);
  const threadPostBodies = DevAgoraStore.getPostsForThread(thread.id).map((post) => post.body).join(" ");
  const searchableText = normalizeSearchText([thread.title, thread.tags.join(" "), threadAuthor.displayName, threadCategory ? threadCategory.name : "", threadPostBodies].join(" "));
  return normalizedQuery.split(/\s+/).every((queryWord) => searchableText.includes(queryWord));
}

function renderSearchResults(rawQuery) {
  const normalizedQuery = normalizeSearchText(rawQuery.trim());
  const matchingThreads = DevAgoraStore.getAllThreads().filter((thread) => threadMatchesQuery(thread, normalizedQuery)).sort((firstThread, secondThread) => secondThread.popularity - firstThread.popularity);
  homeElements.threadListHeading.textContent = `Résultats pour « ${rawQuery.trim()} »`;
  homeElements.threadListCaption.textContent = matchingThreads.length ? `${pluralize(matchingThreads.length, "sujet trouvé", "sujets trouvés")}, triés par popularité.` : "Aucun sujet ne correspond à votre recherche.";
  homeElements.threadList.innerHTML = matchingThreads.length
    ? matchingThreads.map((thread) => renderThreadRow(thread, { showCategory: true, highlightQuery: rawQuery })).join("")
    : renderEmptyState("Aucun résultat", "Essayez un autre mot-clé, ou lancez la discussion vous-même.", '<a class="button button--primary" href="nouveau-sujet.html">Créer un sujet</a>');
  observeRevealElements(homeElements.threadList);
}

function handleSearchInput() {
  const rawQuery = homeElements.searchInput.value;
  homeElements.searchClearButton.hidden = rawQuery.length === 0;
  if (rawQuery.trim().length < 2) renderLatestThreads();
  else renderSearchResults(rawQuery);
}

function renderCommunitySidebar() {
  const onlineMembers = DevAgoraStore.users.filter((user) => user.online);
  homeElements.onlineMemberCount.textContent = formatNumber(onlineMembers.length);
  homeElements.onlineMemberList.innerHTML = onlineMembers.map((user) => `<li><a href="membre.html?id=${encodeURIComponent(user.id)}" title="${escapeHtml(user.displayName)}">${renderAvatar(user, "md")}<span>${escapeHtml(user.displayName.split(" ")[0])}</span></a></li>`).join("");
  homeElements.popularTagList.innerHTML = DevAgoraStore.getPopularTags(14).map(({ tagName, tagCount }) => `<li><button type="button" class="tag-button" data-tag-search="${escapeHtml(tagName)}">#${escapeHtml(tagName)} <span>${tagCount}</span></button></li>`).join("");
  homeElements.topContributorList.innerHTML = DevAgoraStore.users.slice().sort((firstUser, secondUser) => secondUser.reputation - firstUser.reputation).slice(0, 5).map((user, rankIndex) => `
    <li>
      <span class="contributor-rank">${rankIndex + 1}</span>
      ${renderAvatar(user, "sm")}
      <a href="membre.html?id=${encodeURIComponent(user.id)}">${escapeHtml(user.displayName)}</a>
      <span class="contributor-rep">${formatNumber(user.reputation)} pts</span>
    </li>`).join("");
}

renderForumStats();
renderCategoryList();
renderLatestThreads();
renderCommunitySidebar();

homeElements.searchInput.addEventListener("input", handleSearchInput);

homeElements.searchClearButton.addEventListener("click", () => {
  homeElements.searchInput.value = "";
  handleSearchInput();
  homeElements.searchInput.focus();
});

homeElements.popularTagList.addEventListener("click", (clickEvent) => {
  const tagButton = clickEvent.target.closest("[data-tag-search]");
  if (!tagButton) return;
  homeElements.searchInput.value = tagButton.dataset.tagSearch;
  handleSearchInput();
  document.querySelector("#discussions").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
});
