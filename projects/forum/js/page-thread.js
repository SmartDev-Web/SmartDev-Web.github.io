/* Thread page: posts with upvotes and quotes, reply editor with preview and persisted drafts. */
const threadPageElements = {
  pageRoot: document.querySelector("[data-thread-page]"),
  headerContainer: document.querySelector("[data-thread-header]"),
  postList: document.querySelector("[data-post-list]"),
  replyForm: document.querySelector("[data-reply-form]"),
  replyError: document.querySelector("[data-reply-error]"),
  replyCharacterCount: document.querySelector("[data-reply-count]"),
  replyAuthor: document.querySelector("[data-reply-author]"),
  sidebarInfo: document.querySelector("[data-thread-info]"),
  participantList: document.querySelector("[data-participants]"),
  similarThreadList: document.querySelector("[data-similar-threads]"),
  breadcrumbCategory: document.querySelector("[data-breadcrumb-category]"),
  breadcrumbCurrent: document.querySelector("[data-breadcrumb-current]")
};

const MINIMUM_REPLY_LENGTH = 10;
const requestedThreadId = getQueryParameter("id");
const currentThreadId = DevAgoraStore.getThreadById(requestedThreadId) ? requestedThreadId : null;
const replyDraftStorageKey = `devagora-draft-${currentThreadId}`;

function readReplyDraft() {
  try {
    return localStorage.getItem(replyDraftStorageKey) || "";
  } catch (storageError) {
    return "";
  }
}

function writeReplyDraft(draftText) {
  try {
    if (draftText.trim()) localStorage.setItem(replyDraftStorageKey, draftText);
    else localStorage.removeItem(replyDraftStorageKey);
  } catch (storageError) {
    console.warn("DevAgora: brouillon non enregistré.", storageError);
  }
}

function renderThreadHeader(thread, threadCategory) {
  document.title = `${thread.title} · DevAgora`;
  threadPageElements.breadcrumbCategory.innerHTML = `<a href="categorie.html?id=${encodeURIComponent(threadCategory.id)}">${escapeHtml(threadCategory.name)}</a>`;
  threadPageElements.breadcrumbCurrent.textContent = thread.title;
  threadPageElements.headerContainer.innerHTML = `
    <div class="thread-hero__badges">${renderCategoryPill(threadCategory)}${renderThreadStatusBadges(thread)}</div>
    <h1>${escapeHtml(thread.title)}</h1>
    <p class="thread-hero__meta">
      Lancé par ${renderUserLink(DevAgoraStore.getUserById(thread.authorId))} ${formatRelativeTime(thread.createdAt)}
      · ${pluralize(thread.replyCount, "réponse", "réponses")} · ${pluralize(thread.views, "vue", "vues")}
    </p>
    <div class="thread-hero__tags">${renderTagChips(thread.tags)}</div>`;
}

function renderPostArticle(post, postIndex, threadAuthorId) {
  const postAuthor = DevAgoraStore.getUserById(post.authorId);
  const isUpvoted = DevAgoraStore.hasUpvoted(post.id);
  const authorBadge = post.authorId === threadAuthorId ? '<span class="status-badge status-badge--author">Auteur</span>' : "";
  return `
    <article class="post reveal" id="message-${escapeHtml(post.id)}" data-post-id="${escapeHtml(post.id)}">
      <aside class="post__author">
        <a href="membre.html?id=${encodeURIComponent(postAuthor.id)}" aria-label="Profil de ${escapeHtml(postAuthor.displayName)}">${renderAvatar(postAuthor, "lg")}</a>
        <div>
          ${renderUserLink(postAuthor)} ${authorBadge}
          <p class="post__author-title">${escapeHtml(postAuthor.title)}</p>
          <p class="post__author-rep">${formatNumber(postAuthor.reputation)} pts</p>
        </div>
      </aside>
      <div class="post__content">
        <header class="post__header">
          <time datetime="${new Date(post.createdAt).toISOString()}" title="${formatLongDate(post.createdAt)}">${formatRelativeTime(post.createdAt)}</time>
          <a class="post__permalink" href="#message-${escapeHtml(post.id)}" aria-label="Lien vers le message ${postIndex + 1}">#${postIndex + 1}</a>
        </header>
        <div class="markdown-body">${renderMarkdown(post.body)}</div>
        <footer class="post__actions">
          <button type="button" class="vote-button" data-upvote="${escapeHtml(post.id)}" aria-pressed="${isUpvoted}" aria-label="Voter pour ce message">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l7 8h-4.5v6h-5v-6H5z" fill="currentColor"/></svg>
            <span data-vote-count>${formatNumber(DevAgoraStore.getPostScore(post))}</span>
          </button>
          <button type="button" class="ghost-button" data-quote="${escapeHtml(post.id)}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" fill="currentColor"/></svg>
            Citer
          </button>
        </footer>
      </div>
    </article>`;
}

function renderPostList() {
  const thread = DevAgoraStore.getThreadById(currentThreadId);
  const threadPosts = DevAgoraStore.getPostsForThread(currentThreadId);
  threadPageElements.postList.innerHTML = threadPosts.map((post, postIndex) => renderPostArticle(post, postIndex, thread.authorId)).join("");
  observeRevealElements(threadPageElements.postList);
}

function renderThreadSidebar() {
  const thread = DevAgoraStore.getThreadById(currentThreadId);
  const threadPosts = DevAgoraStore.getPostsForThread(currentThreadId);
  const participantIds = Array.from(new Set(threadPosts.map((post) => post.authorId)));
  threadPageElements.sidebarInfo.innerHTML = `
    <div><dt>Créé</dt><dd>${formatLongDate(thread.createdAt)}</dd></div>
    <div><dt>Dernière activité</dt><dd>${formatRelativeTime(thread.lastActivityAt)}</dd></div>
    <div><dt>Réponses</dt><dd>${formatNumber(thread.replyCount)}</dd></div>
    <div><dt>Votes cumulés</dt><dd>${formatNumber(thread.score)}</dd></div>`;
  threadPageElements.participantList.innerHTML = participantIds.map((participantId) => {
    const participant = DevAgoraStore.getUserById(participantId);
    return `<li><a href="membre.html?id=${encodeURIComponent(participant.id)}" title="${escapeHtml(participant.displayName)}">${renderAvatar(participant, "md")}<span class="visually-hidden">${escapeHtml(participant.displayName)}</span></a></li>`;
  }).join("");
  const similarThreads = DevAgoraStore.getAllThreads().filter((candidateThread) => candidateThread.categoryId === thread.categoryId && candidateThread.id !== thread.id).sort((firstThread, secondThread) => secondThread.popularity - firstThread.popularity).slice(0, 4);
  threadPageElements.similarThreadList.innerHTML = similarThreads.length
    ? similarThreads.map((similarThread) => `<li><a href="sujet.html?id=${encodeURIComponent(similarThread.id)}">${escapeHtml(similarThread.title)}</a><span>${pluralize(similarThread.replyCount, "réponse", "réponses")}</span></li>`).join("")
    : "<li><span>Aucun autre sujet dans cette catégorie.</span></li>";
}

function buildQuoteMarkdown(post) {
  const quotedAuthor = DevAgoraStore.getUserById(post.authorId);
  const quotedText = stripMarkdown(post.body).slice(0, 280);
  return `> **@${quotedAuthor.username}** a écrit :\n> ${quotedText}${stripMarkdown(post.body).length > 280 ? "…" : ""}\n\n`;
}

function updateReplyCharacterCount(replyText) {
  const trimmedLength = replyText.trim().length;
  threadPageElements.replyCharacterCount.textContent = `${formatNumber(trimmedLength)} caractère${trimmedLength > 1 ? "s" : ""}`;
  if (trimmedLength >= MINIMUM_REPLY_LENGTH) threadPageElements.replyError.textContent = "";
}

function initReplyForm() {
  const currentUser = DevAgoraStore.getCurrentUser();
  threadPageElements.replyAuthor.innerHTML = `${renderAvatar(currentUser, "sm")} Vous répondez en tant que <strong>${escapeHtml(currentUser.displayName)}</strong>`;
  const replyEditor = initMarkdownEditor(threadPageElements.replyForm.querySelector("[data-markdown-editor]"), (replyText) => {
    updateReplyCharacterCount(replyText);
    writeReplyDraft(replyText);
  });
  replyEditor.setValue(readReplyDraft());
  threadPageElements.postList.addEventListener("click", (clickEvent) => {
    const upvoteButton = clickEvent.target.closest("[data-upvote]");
    const quoteButton = clickEvent.target.closest("[data-quote]");
    if (upvoteButton) {
      const voteResult = DevAgoraStore.togglePostUpvote(upvoteButton.dataset.upvote);
      upvoteButton.setAttribute("aria-pressed", String(voteResult.upvoted));
      upvoteButton.querySelector("[data-vote-count]").textContent = formatNumber(voteResult.score);
      upvoteButton.classList.remove("is-bumped");
      requestAnimationFrame(() => upvoteButton.classList.add("is-bumped"));
      renderThreadSidebar();
    }
    if (quoteButton) {
      const quotedPost = DevAgoraStore.getPostsForThread(currentThreadId).find((post) => post.id === quoteButton.dataset.quote);
      replyEditor.showWriteTab();
      replyEditor.setValue(replyEditor.textareaElement.value + buildQuoteMarkdown(quotedPost));
      threadPageElements.replyForm.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
      replyEditor.textareaElement.focus({ preventScroll: true });
      replyEditor.textareaElement.setSelectionRange(replyEditor.textareaElement.value.length, replyEditor.textareaElement.value.length);
    }
  });
  threadPageElements.postList.addEventListener("animationend", (animationEvent) => {
    if (animationEvent.animationName === "vote-bump") animationEvent.target.classList.remove("is-bumped");
  });
  threadPageElements.replyForm.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    const replyText = replyEditor.textareaElement.value.trim();
    if (replyText.length < MINIMUM_REPLY_LENGTH) {
      threadPageElements.replyError.textContent = `Votre réponse doit contenir au moins ${MINIMUM_REPLY_LENGTH} caractères.`;
      replyEditor.showWriteTab();
      replyEditor.textareaElement.focus();
      return;
    }
    const createdReply = DevAgoraStore.createReply(currentThreadId, replyText);
    replyEditor.setValue("");
    replyEditor.showWriteTab();
    renderThreadHeader(DevAgoraStore.getThreadById(currentThreadId), DevAgoraStore.getCategoryById(DevAgoraStore.getThreadById(currentThreadId).categoryId));
    renderPostList();
    renderThreadSidebar();
    showToast("Votre réponse a été publiée.");
    const createdPostElement = document.getElementById(`message-${createdReply.id}`);
    createdPostElement.classList.add("post--fresh");
    createdPostElement.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
  });
}

function renderUnknownThread() {
  document.title = "Sujet introuvable · DevAgora";
  threadPageElements.breadcrumbCategory.remove();
  threadPageElements.breadcrumbCurrent.textContent = "Sujet introuvable";
  threadPageElements.pageRoot.innerHTML = renderEmptyState(
    "Ce sujet est introuvable",
    requestedThreadId ? "Il a peut-être été supprimé, déplacé, ou le lien est incomplet." : "Aucun sujet n'a été précisé dans l'adresse.",
    '<a class="button button--primary" href="index.html#discussions">Voir les dernières discussions</a><a class="button button--ghost" href="nouveau-sujet.html">Créer un sujet</a>'
  );
}

if (currentThreadId) {
  const currentThread = DevAgoraStore.getThreadById(currentThreadId);
  renderThreadHeader(currentThread, DevAgoraStore.getCategoryById(currentThread.categoryId) || DevAgoraStore.categories[0]);
  renderPostList();
  renderThreadSidebar();
  initReplyForm();
} else {
  renderUnknownThread();
}
