/* DevAgora shared module: data store, formatting helpers, markdown rendering and common UI behaviours. */

/* Data store merging seed data with content created by the visitor (persisted in localStorage). */
const DevAgoraStore = (() => {
  const USER_STATE_STORAGE_KEY = "devagora-user-state-v1";
  const seedData = window.DevAgoraData;
  function createEmptyUserState() {
    return { threads: [], posts: [], upvotedPostIds: [] };
  }
  function readUserState() {
    try {
      const storedState = JSON.parse(localStorage.getItem(USER_STATE_STORAGE_KEY));
      if (!storedState) return createEmptyUserState();
      return {
        threads: Array.isArray(storedState.threads) ? storedState.threads : [],
        posts: Array.isArray(storedState.posts) ? storedState.posts : [],
        upvotedPostIds: Array.isArray(storedState.upvotedPostIds) ? storedState.upvotedPostIds : []
      };
    } catch (storageError) {
      return createEmptyUserState();
    }
  }
  let userState = readUserState();
  function persistUserState() {
    try {
      localStorage.setItem(USER_STATE_STORAGE_KEY, JSON.stringify(userState));
    } catch (storageError) {
      console.warn("DevAgora: stockage local indisponible.", storageError);
    }
  }
  window.addEventListener("storage", (storageEvent) => {
    if (storageEvent.key === USER_STATE_STORAGE_KEY) userState = readUserState();
  });
  function getAllPosts() {
    return seedData.posts.concat(userState.posts);
  }
  function getAllRawThreads() {
    return seedData.threads.concat(userState.threads);
  }
  function hasUpvoted(postId) {
    return userState.upvotedPostIds.includes(postId);
  }
  function getPostScore(post) {
    return post.votes + (hasUpvoted(post.id) ? 1 : 0);
  }
  function getPostsForThread(threadId) {
    return getAllPosts().filter((post) => post.threadId === threadId).sort((firstPost, secondPost) => firstPost.createdAt - secondPost.createdAt);
  }
  function buildThreadSummary(thread) {
    const threadPosts = getPostsForThread(thread.id);
    const lastPost = threadPosts[threadPosts.length - 1];
    const totalScore = threadPosts.reduce((scoreSum, post) => scoreSum + getPostScore(post), 0);
    const replyCount = Math.max(threadPosts.length - 1, 0);
    return {
      ...thread,
      isUserCreated: userState.threads.some((userThread) => userThread.id === thread.id),
      postCount: threadPosts.length,
      replyCount,
      lastPost,
      lastActivityAt: lastPost ? lastPost.createdAt : thread.createdAt,
      score: totalScore,
      popularity: thread.views + totalScore * 25 + replyCount * 60
    };
  }
  function getAllThreads() {
    return getAllRawThreads().map(buildThreadSummary);
  }
  function getThreadById(threadId) {
    const rawThread = getAllRawThreads().find((thread) => thread.id === threadId);
    return rawThread ? buildThreadSummary(rawThread) : null;
  }
  function getCategoryById(categoryId) {
    return seedData.categories.find((category) => category.id === categoryId) || null;
  }
  function getUserById(userId) {
    return seedData.users.find((user) => user.id === userId) || null;
  }
  function getCurrentUser() {
    return getUserById(seedData.currentUserId);
  }
  function getCategoryStats(categoryId) {
    const categoryThreads = getAllThreads().filter((thread) => thread.categoryId === categoryId);
    const latestThread = categoryThreads.slice().sort((firstThread, secondThread) => secondThread.lastActivityAt - firstThread.lastActivityAt)[0] || null;
    return {
      threadCount: categoryThreads.length,
      postCount: categoryThreads.reduce((postSum, thread) => postSum + thread.postCount, 0),
      latestThread
    };
  }
  function getUserActivity(userId) {
    const userPosts = getAllPosts().filter((post) => post.authorId === userId).sort((firstPost, secondPost) => secondPost.createdAt - firstPost.createdAt);
    const userThreads = getAllThreads().filter((thread) => thread.authorId === userId).sort((firstThread, secondThread) => secondThread.createdAt - firstThread.createdAt);
    const votesReceived = userPosts.reduce((scoreSum, post) => scoreSum + getPostScore(post), 0);
    return { posts: userPosts, threads: userThreads, votesReceived };
  }
  function getForumTotals() {
    return {
      memberCount: seedData.users.length,
      threadCount: getAllRawThreads().length,
      postCount: getAllPosts().length,
      onlineCount: seedData.users.filter((user) => user.online).length
    };
  }
  function getPopularTags(maximumTagCount) {
    const tagCounts = new Map();
    getAllRawThreads().forEach((thread) => thread.tags.forEach((tagName) => tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1)));
    return Array.from(tagCounts.entries()).sort((firstEntry, secondEntry) => secondEntry[1] - firstEntry[1] || firstEntry[0].localeCompare(secondEntry[0])).slice(0, maximumTagCount).map(([tagName, tagCount]) => ({ tagName, tagCount }));
  }
  function togglePostUpvote(postId) {
    if (hasUpvoted(postId)) {
      userState.upvotedPostIds = userState.upvotedPostIds.filter((upvotedId) => upvotedId !== postId);
    } else {
      userState.upvotedPostIds.push(postId);
    }
    persistUserState();
    const votedPost = getAllPosts().find((post) => post.id === postId);
    return { upvoted: hasUpvoted(postId), score: votedPost ? getPostScore(votedPost) : 0 };
  }
  function createThread(threadInput) {
    const creationTimestamp = Date.now();
    const threadId = `n${creationTimestamp.toString(36)}`;
    userState.threads.push({
      id: threadId,
      categoryId: threadInput.categoryId,
      title: threadInput.title,
      tags: threadInput.tags,
      views: 1,
      pinned: false,
      solved: false,
      authorId: seedData.currentUserId,
      createdAt: creationTimestamp
    });
    userState.posts.push({ id: `${threadId}-p1`, threadId, authorId: seedData.currentUserId, createdAt: creationTimestamp, body: threadInput.body, votes: 0 });
    persistUserState();
    return threadId;
  }
  function createReply(threadId, replyBody) {
    const creationTimestamp = Date.now();
    const replyPost = { id: `${threadId}-r${creationTimestamp.toString(36)}`, threadId, authorId: seedData.currentUserId, createdAt: creationTimestamp, body: replyBody, votes: 0 };
    userState.posts.push(replyPost);
    persistUserState();
    return replyPost;
  }
  return {
    categories: seedData.categories,
    users: seedData.users,
    badgeDefinitions: seedData.badgeDefinitions,
    getAllThreads,
    getThreadById,
    getPostsForThread,
    getCategoryById,
    getUserById,
    getCurrentUser,
    getCategoryStats,
    getUserActivity,
    getForumTotals,
    getPopularTags,
    getPostScore,
    hasUpvoted,
    togglePostUpvote,
    createThread,
    createReply
  };
})();

/* Formatting helpers shared by every page. */
const relativeTimeFormatter = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
const numberFormatter = new Intl.NumberFormat("fr-FR");
const longDateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

function escapeHtml(rawText) {
  return String(rawText).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatRelativeTime(timestamp) {
  const elapsedSeconds = Math.round((timestamp - Date.now()) / 1000);
  const timeUnits = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  const matchingUnit = timeUnits.find(([, unitSeconds]) => Math.abs(elapsedSeconds) >= unitSeconds);
  if (!matchingUnit) return "à l'instant";
  return relativeTimeFormatter.format(Math.round(elapsedSeconds / matchingUnit[1]), matchingUnit[0]);
}

function formatNumber(numericValue) {
  return numberFormatter.format(numericValue);
}

function formatLongDate(timestamp) {
  return longDateFormatter.format(new Date(timestamp));
}

function pluralize(count, singularWord, pluralWord) {
  return `${formatNumber(count)} ${count > 1 ? pluralWord : singularWord}`;
}

function normalizeSearchText(rawText) {
  return String(rawText).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function getQueryParameter(parameterName) {
  return new URLSearchParams(window.location.search).get(parameterName);
}

/* Lightweight markdown renderer: fenced code, inline code, bold, italic, links, quotes and lists. */
function renderInlineMarkdown(escapedText) {
  const inlineCodeFragments = [];
  return escapedText
    .replace(/`([^`\n]+)`/g, (fullMatch, codeContent) => {
      inlineCodeFragments.push(codeContent);
      return `\u0001${inlineCodeFragments.length - 1}\u0001`;
    })
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\u0001(\d+)\u0001/g, (fullMatch, fragmentIndex) => `<code>${inlineCodeFragments[Number(fragmentIndex)]}</code>`);
}

function renderMarkdownBlock(blockText) {
  const lineGroups = [];
  blockText.split("\n").forEach((lineText) => {
    const lineType = /^&gt; ?/.test(lineText) ? "quote" : /^[-*] /.test(lineText) ? "list" : "text";
    const previousGroup = lineGroups[lineGroups.length - 1];
    if (previousGroup && previousGroup.type === lineType) previousGroup.lines.push(lineText);
    else lineGroups.push({ type: lineType, lines: [lineText] });
  });
  return lineGroups.map((lineGroup) => {
    if (lineGroup.type === "quote") return `<blockquote>${renderInlineMarkdown(lineGroup.lines.map((lineText) => lineText.replace(/^&gt; ?/, "")).join("<br>"))}</blockquote>`;
    if (lineGroup.type === "list") return `<ul>${lineGroup.lines.map((lineText) => `<li>${renderInlineMarkdown(lineText.slice(2))}</li>`).join("")}</ul>`;
    return `<p>${renderInlineMarkdown(lineGroup.lines.join("<br>"))}</p>`;
  }).join("");
}

function renderMarkdown(sourceText) {
  const codeBlockFragments = [];
  const textWithPlaceholders = escapeHtml(sourceText.replace(/\r\n/g, "\n")).replace(/```([\w-]*)\n([\s\S]*?)```/g, (fullMatch, languageName, codeContent) => {
    const languageLabel = languageName ? `<span class="code-block__lang">${languageName}</span>` : "";
    codeBlockFragments.push(`<pre class="code-block">${languageLabel}<code>${codeContent.replace(/\n$/, "")}</code></pre>`);
    return `\n\n\u0000${codeBlockFragments.length - 1}\u0000\n\n`;
  });
  return textWithPlaceholders.split(/\n{2,}/).map((blockText) => blockText.trim()).filter(Boolean).map((blockText) => {
    const placeholderMatch = blockText.match(/^\u0000(\d+)\u0000$/);
    return placeholderMatch ? codeBlockFragments[Number(placeholderMatch[1])] : renderMarkdownBlock(blockText);
  }).join("");
}

function stripMarkdown(sourceText) {
  return sourceText.replace(/```[\s\S]*?```/g, " [code] ").replace(/\[([^\]]+)\]\(https?:[^)]+\)/g, "$1").replace(/^>\s?/gm, "").replace(/[`*#]/g, "").replace(/\s+/g, " ").trim();
}

/* Shared HTML snippets. */
function getUserInitials(user) {
  return user.displayName.split(" ").map((namePart) => namePart[0]).join("").slice(0, 2).toUpperCase();
}

function renderAvatar(user, avatarSize) {
  const onlineIndicator = user.online ? '<span class="avatar__status" aria-hidden="true"></span>' : "";
  return `<span class="avatar avatar--${avatarSize}" style="--avatar-color:${user.color}" aria-hidden="true">${getUserInitials(user)}${onlineIndicator}</span>`;
}

function renderUserLink(user) {
  return `<a class="user-link" href="membre.html?id=${encodeURIComponent(user.id)}">${escapeHtml(user.displayName)}</a>`;
}

function renderTagChips(tagNames) {
  return tagNames.map((tagName) => `<span class="tag-chip">#${escapeHtml(tagName)}</span>`).join("");
}

function renderCategoryPill(category) {
  return `<a class="category-pill" style="--category-color:${category.color}" href="categorie.html?id=${encodeURIComponent(category.id)}">${escapeHtml(category.name)}</a>`;
}

function renderThreadStatusBadges(thread) {
  const statusBadges = [];
  if (thread.pinned) statusBadges.push('<span class="status-badge status-badge--pinned">Épinglé</span>');
  if (thread.solved) statusBadges.push('<span class="status-badge status-badge--solved">Résolu</span>');
  if (thread.isUserCreated) statusBadges.push('<span class="status-badge status-badge--mine">Votre sujet</span>');
  if (thread.replyCount === 0) statusBadges.push('<span class="status-badge status-badge--open">Sans réponse</span>');
  return statusBadges.join("");
}

function renderThreadRow(thread, rowOptions = {}) {
  const threadAuthor = DevAgoraStore.getUserById(thread.authorId);
  const threadCategory = DevAgoraStore.getCategoryById(thread.categoryId);
  const lastPostAuthor = thread.lastPost ? DevAgoraStore.getUserById(thread.lastPost.authorId) : threadAuthor;
  const titleMarkup = rowOptions.highlightQuery ? highlightText(thread.title, rowOptions.highlightQuery) : escapeHtml(thread.title);
  const categoryMarkup = rowOptions.showCategory && threadCategory ? renderCategoryPill(threadCategory) : "";
  return `
    <article class="thread-row reveal${thread.pinned ? " thread-row--pinned" : ""}">
      <a class="thread-row__avatar" href="membre.html?id=${encodeURIComponent(threadAuthor.id)}" aria-label="Profil de ${escapeHtml(threadAuthor.displayName)}">${renderAvatar(threadAuthor, "md")}</a>
      <div class="thread-row__main">
        <div class="thread-row__badges">${categoryMarkup}${renderThreadStatusBadges(thread)}</div>
        <h3 class="thread-row__title"><a href="sujet.html?id=${encodeURIComponent(thread.id)}">${titleMarkup}</a></h3>
        <p class="thread-row__meta">par ${renderUserLink(threadAuthor)} · ${formatRelativeTime(thread.createdAt)} <span class="thread-row__tags">${renderTagChips(thread.tags)}</span></p>
      </div>
      <dl class="thread-row__stats">
        <div><dt>Réponses</dt><dd>${formatNumber(thread.replyCount)}</dd></div>
        <div><dt>Vues</dt><dd>${formatNumber(thread.views)}</dd></div>
        <div><dt>Votes</dt><dd>${formatNumber(thread.score)}</dd></div>
      </dl>
      <div class="thread-row__last">
        ${renderAvatar(lastPostAuthor, "sm")}
        <span><span class="thread-row__last-name">${escapeHtml(lastPostAuthor.displayName)}</span><span class="thread-row__last-time">${formatRelativeTime(thread.lastActivityAt)}</span></span>
      </div>
    </article>`;
}

function highlightText(rawText, searchQuery) {
  const normalizedText = rawText.split("").map((character) => normalizeSearchText(character).charAt(0) || character).join("");
  const normalizedQuery = normalizeSearchText(searchQuery.trim());
  const matchIndex = normalizedQuery ? normalizedText.indexOf(normalizedQuery) : -1;
  if (matchIndex === -1) return escapeHtml(rawText);
  return `${escapeHtml(rawText.slice(0, matchIndex))}<mark>${escapeHtml(rawText.slice(matchIndex, matchIndex + normalizedQuery.length))}</mark>${escapeHtml(rawText.slice(matchIndex + normalizedQuery.length))}`;
}

function renderEmptyState(titleText, messageText, actionsMarkup = "") {
  return `
    <div class="empty-state reveal">
      <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="28" cy="28" r="18" fill="none" stroke="currentColor" stroke-width="4"/><path d="M41 41l13 13" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M21 28h14" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>
      <h2>${titleText}</h2>
      <p>${messageText}</p>
      <div class="empty-state__actions">${actionsMarkup}</div>
    </div>`;
}

/* Inline SVG icon paths for categories. */
const categoryIconPaths = {
  js: '<path d="M4 4h16v16H4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9v6a2 2 0 01-3 1.5M14 15.5a2 2 0 003 .5c1-.8.5-2-1-2.5s-2-1.5-1-2.5a2 2 0 013 .5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  server: '<rect x="4" y="4" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="4" y="14" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="7" r="1" fill="currentColor"/><circle cx="8" cy="17" r="1" fill="currentColor"/>',
  cloud: '<path d="M7 18h10a4 4 0 00.5-8 6 6 0 00-11.3 1.5A3.3 3.3 0 007 18z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  mobile: '<rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 18h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  data: '<ellipse cx="12" cy="6" rx="7" ry="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" fill="none" stroke="currentColor" stroke-width="2"/>',
  a11y: '<circle cx="12" cy="4.5" r="2" fill="currentColor"/><path d="M5 8l7 1.5L19 8M12 9.5V14l-3 6M12 14l3 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  career: '<rect x="3" y="7" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M3 13h18" fill="none" stroke="currentColor" stroke-width="2"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 10h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
};

function renderCategoryIcon(category) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${categoryIconPaths[category.icon] || categoryIconPaths.chat}</svg>`;
}

/* Toast notification removed once its exit animation ends. */
function showToast(messageText) {
  let toastRegion = document.querySelector(".toast-region");
  if (!toastRegion) {
    toastRegion = document.createElement("div");
    toastRegion.className = "toast-region";
    toastRegion.setAttribute("role", "status");
    toastRegion.setAttribute("aria-live", "polite");
    document.body.appendChild(toastRegion);
  }
  const toastElement = document.createElement("div");
  toastElement.className = "toast";
  toastElement.textContent = messageText;
  toastElement.addEventListener("animationend", (animationEvent) => {
    if (animationEvent.animationName === "toast-out") toastElement.remove();
  });
  toastRegion.appendChild(toastElement);
}

/* Markdown editor with write/preview tabs and formatting toolbar. */
function initMarkdownEditor(editorRootElement, onContentChange) {
  const textareaElement = editorRootElement.querySelector("textarea");
  const previewElement = editorRootElement.querySelector(".md-editor__preview");
  const tabButtons = editorRootElement.querySelectorAll("[data-editor-tab]");
  function showEditorTab(tabName) {
    tabButtons.forEach((tabButton) => tabButton.setAttribute("aria-selected", String(tabButton.dataset.editorTab === tabName)));
    const isPreview = tabName === "preview";
    if (isPreview) previewElement.innerHTML = textareaElement.value.trim() ? renderMarkdown(textareaElement.value) : '<p class="md-editor__empty">Rien à prévisualiser pour le moment.</p>';
    previewElement.hidden = !isPreview;
    textareaElement.hidden = isPreview;
    editorRootElement.classList.toggle("is-previewing", isPreview);
  }
  function applyFormatting(formatName) {
    const selectionStart = textareaElement.selectionStart;
    const selectionEnd = textareaElement.selectionEnd;
    const selectedText = textareaElement.value.slice(selectionStart, selectionEnd);
    const inlineWrappers = { bold: ["**", "**", "texte en gras"], italic: ["*", "*", "texte en italique"], code: ["`", "`", "code"], codeblock: ["```js\n", "\n```", "// votre code"], link: ["[", "](https://)", "libellé du lien"] };
    let replacementText;
    if (formatName === "quote" || formatName === "list") {
      const linePrefix = formatName === "quote" ? "> " : "- ";
      replacementText = (selectedText || "élément").split("\n").map((lineText) => linePrefix + lineText).join("\n");
    } else {
      const [openingMarker, closingMarker, placeholderText] = inlineWrappers[formatName];
      replacementText = openingMarker + (selectedText || placeholderText) + closingMarker;
    }
    textareaElement.setRangeText(replacementText, selectionStart, selectionEnd, "select");
    textareaElement.focus();
    textareaElement.dispatchEvent(new Event("input", { bubbles: true }));
  }
  tabButtons.forEach((tabButton) => tabButton.addEventListener("click", () => showEditorTab(tabButton.dataset.editorTab)));
  editorRootElement.querySelectorAll("[data-editor-format]").forEach((formatButton) => {
    formatButton.addEventListener("click", () => {
      showEditorTab("write");
      applyFormatting(formatButton.dataset.editorFormat);
    });
  });
  textareaElement.addEventListener("input", () => {
    if (typeof onContentChange === "function") onContentChange(textareaElement.value);
  });
  return {
    textareaElement,
    showWriteTab: () => showEditorTab("write"),
    setValue(newValue) {
      textareaElement.value = newValue;
      textareaElement.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };
}

/* Theme toggle persisted in localStorage. */
function initThemeToggle() {
  document.querySelectorAll("[data-theme-toggle]").forEach((toggleButton) => {
    toggleButton.addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = nextTheme;
      toggleButton.setAttribute("aria-label", nextTheme === "dark" ? "Activer le thème clair" : "Activer le thème sombre");
      try {
        localStorage.setItem("devagora-theme", nextTheme);
      } catch (storageError) {
        console.warn("DevAgora: préférence de thème non enregistrée.", storageError);
      }
    });
  });
}

/* Responsive burger navigation. */
function initBurgerMenu() {
  const navigationToggleButton = document.querySelector(".nav-toggle");
  const siteNavigationElement = document.querySelector(".site-nav");
  if (!navigationToggleButton || !siteNavigationElement) return;
  navigationToggleButton.addEventListener("click", () => {
    const isOpen = navigationToggleButton.getAttribute("aria-expanded") === "true";
    navigationToggleButton.setAttribute("aria-expanded", String(!isOpen));
    siteNavigationElement.classList.toggle("is-open", !isOpen);
  });
  siteNavigationElement.addEventListener("click", (clickEvent) => {
    if (!clickEvent.target.closest("a")) return;
    navigationToggleButton.setAttribute("aria-expanded", "false");
    siteNavigationElement.classList.remove("is-open");
  });
  document.addEventListener("keydown", (keyboardEvent) => {
    if (keyboardEvent.key !== "Escape" || !siteNavigationElement.classList.contains("is-open")) return;
    navigationToggleButton.setAttribute("aria-expanded", "false");
    siteNavigationElement.classList.remove("is-open");
    navigationToggleButton.focus();
  });
}

/* Header style change once the top sentinel leaves the viewport. */
function initStickyHeader() {
  const headerElement = document.querySelector(".site-header");
  const scrollSentinelElement = document.querySelector(".scroll-sentinel");
  if (!headerElement || !scrollSentinelElement) return;
  const headerObserver = new IntersectionObserver(([sentinelEntry]) => headerElement.classList.toggle("is-scrolled", !sentinelEntry.isIntersecting));
  headerObserver.observe(scrollSentinelElement);
}

/* Highlight of the navigation link matching the current page. */
function initActiveNavigationLink() {
  const currentPageName = document.body.dataset.page;
  document.querySelectorAll(".site-nav [data-nav]").forEach((navigationLink) => {
    if (navigationLink.dataset.nav === currentPageName) navigationLink.setAttribute("aria-current", "page");
  });
}

/* Scroll reveal for static and dynamically rendered elements. */
const revealObserver = "IntersectionObserver" in window ? new IntersectionObserver((revealEntries) => {
  revealEntries.forEach((revealEntry) => {
    if (!revealEntry.isIntersecting) return;
    revealEntry.target.classList.add("is-visible");
    revealObserver.unobserve(revealEntry.target);
  });
}, { rootMargin: "0px 0px -40px 0px", threshold: 0.05 }) : null;

function observeRevealElements(rootElement = document) {
  rootElement.querySelectorAll(".reveal:not(.is-visible)").forEach((revealElement) => {
    if (revealObserver) revealObserver.observe(revealElement);
    else revealElement.classList.add("is-visible");
  });
}

/* Animated counters driven by requestAnimationFrame. */
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function animateCounter(counterElement) {
  const targetValue = Number(counterElement.dataset.countTo);
  const animationDuration = 1200;
  if (prefersReducedMotion) {
    counterElement.textContent = formatNumber(targetValue);
    return;
  }
  let animationStartTime = null;
  function renderCounterFrame(frameTime) {
    if (animationStartTime === null) animationStartTime = frameTime;
    const progressRatio = Math.min((frameTime - animationStartTime) / animationDuration, 1);
    const easedProgress = 1 - Math.pow(1 - progressRatio, 3);
    counterElement.textContent = formatNumber(Math.round(targetValue * easedProgress));
    if (progressRatio < 1) requestAnimationFrame(renderCounterFrame);
  }
  requestAnimationFrame(renderCounterFrame);
}

const counterObserver = "IntersectionObserver" in window ? new IntersectionObserver((counterEntries) => {
  counterEntries.forEach((counterEntry) => {
    if (!counterEntry.isIntersecting) return;
    animateCounter(counterEntry.target);
    counterObserver.unobserve(counterEntry.target);
  });
}, { threshold: 0.4 }) : null;

function initAnimatedCounters(rootElement = document) {
  rootElement.querySelectorAll("[data-count-to]").forEach((counterElement) => {
    if (counterObserver) counterObserver.observe(counterElement);
    else animateCounter(counterElement);
  });
}

/* Fade-out page transition: navigation happens on transitionend. */
function navigateWithTransition(destinationHref) {
  const bodyElement = document.body;
  if (prefersReducedMotion || bodyElement.classList.contains("is-leaving")) {
    window.location.href = destinationHref;
    return;
  }
  bodyElement.addEventListener("transitionend", function handleLeaveTransition(transitionEvent) {
    if (transitionEvent.target !== bodyElement || transitionEvent.propertyName !== "opacity") return;
    bodyElement.removeEventListener("transitionend", handleLeaveTransition);
    window.location.href = destinationHref;
  });
  bodyElement.classList.add("is-leaving");
}

function initPageTransitions() {
  document.addEventListener("click", (clickEvent) => {
    const linkElement = clickEvent.target.closest("a[href]");
    if (!linkElement || clickEvent.defaultPrevented || clickEvent.button !== 0 || clickEvent.metaKey || clickEvent.ctrlKey || clickEvent.shiftKey || clickEvent.altKey) return;
    if (linkElement.target === "_blank" || linkElement.hasAttribute("download")) return;
    const destinationUrl = new URL(linkElement.href, window.location.href);
    const isSamePageAnchor = destinationUrl.pathname === window.location.pathname && destinationUrl.search === window.location.search && destinationUrl.hash !== "";
    if (destinationUrl.origin !== window.location.origin || isSamePageAnchor || !/\.html$/.test(destinationUrl.pathname)) return;
    clickEvent.preventDefault();
    navigateWithTransition(destinationUrl.href);
  });
  window.addEventListener("pageshow", () => document.body.classList.remove("is-leaving"));
}

/* Footer category links rendered from the data module. */
function renderFooterCategories() {
  const footerCategoryList = document.querySelector("[data-footer-categories]");
  if (!footerCategoryList) return;
  footerCategoryList.innerHTML = DevAgoraStore.categories.slice(0, 5).map((category) => `<li><a href="categorie.html?id=${encodeURIComponent(category.id)}">${escapeHtml(category.name)}</a></li>`).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initBurgerMenu();
  initStickyHeader();
  initActiveNavigationLink();
  initPageTransitions();
  renderFooterCategories();
  observeRevealElements();
  initAnimatedCounters();
});
