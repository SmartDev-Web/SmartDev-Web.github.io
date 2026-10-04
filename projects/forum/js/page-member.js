/* Member profile page: identity card, reputation statistics, badges and recent activity. */
const memberPageElements = {
  pageRoot: document.querySelector("[data-member-page]"),
  profileCard: document.querySelector("[data-profile-card]"),
  statList: document.querySelector("[data-profile-stats]"),
  badgeGrid: document.querySelector("[data-badge-grid]"),
  activityTabs: document.querySelector("[data-activity-tabs]"),
  activityList: document.querySelector("[data-activity-list]"),
  breadcrumbCurrent: document.querySelector("[data-breadcrumb-current]")
};

const requestedMemberId = getQueryParameter("id");
const currentMember = DevAgoraStore.getUserById(requestedMemberId);

function renderProfileCard(member) {
  const isCurrentVisitor = member.id === DevAgoraStore.getCurrentUser().id;
  document.title = `${member.displayName} · DevAgora`;
  memberPageElements.breadcrumbCurrent.textContent = member.displayName;
  memberPageElements.profileCard.style.setProperty("--avatar-color", member.color);
  memberPageElements.profileCard.innerHTML = `
    <div class="profile-card__banner" aria-hidden="true"></div>
    <div class="profile-card__identity">
      ${renderAvatar(member, "xl")}
      <div>
        <h1>${escapeHtml(member.displayName)} ${isCurrentVisitor ? '<span class="status-badge status-badge--mine">Vous</span>' : ""}</h1>
        <p class="profile-card__handle">@${escapeHtml(member.username)} · ${escapeHtml(member.title)}</p>
        <ul class="profile-card__facts">
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9.5" r="2.5" fill="currentColor"/></svg>${escapeHtml(member.location)}</li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 10h16M9 3v4M15 3v4" stroke="currentColor" stroke-width="2"/></svg>Membre depuis le ${formatLongDate(member.joinedAt)}</li>
          <li class="${member.online ? "is-online" : ""}"><span class="presence-dot" aria-hidden="true"></span>${member.online ? "En ligne" : "Hors ligne"}</li>
        </ul>
      </div>
    </div>
    <p class="profile-card__bio">${escapeHtml(member.bio)}</p>
    <ul class="profile-card__skills" aria-label="Compétences">${member.skills.map((skillName) => `<li>${escapeHtml(skillName)}</li>`).join("")}</ul>`;
}

function renderProfileStats(member, memberActivity) {
  const statDefinitions = [
    ["Réputation", member.reputation],
    ["Messages", memberActivity.posts.length],
    ["Sujets lancés", memberActivity.threads.length],
    ["Votes reçus", memberActivity.votesReceived]
  ];
  memberPageElements.statList.innerHTML = statDefinitions.map(([statLabel, statValue]) => `<div class="profile-stat reveal"><dt>${statLabel}</dt><dd data-count-to="${statValue}">0</dd></div>`).join("");
}

function renderBadgeGrid(member) {
  memberPageElements.badgeGrid.innerHTML = member.badges.map((badgeId) => {
    const badgeDefinition = DevAgoraStore.badgeDefinitions[badgeId];
    return `
      <li class="badge-card badge-card--${badgeDefinition.tier} reveal">
        <span class="badge-card__medal" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 2h8l-2 6h-4z" fill="currentColor" opacity=".55"/><circle cx="12" cy="15" r="6.5" fill="currentColor"/><path d="M12 11.5l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z" fill="#fff"/></svg></span>
        <div><strong>${escapeHtml(badgeDefinition.label)}</strong><p>${escapeHtml(badgeDefinition.description)}</p></div>
      </li>`;
  }).join("");
}

function renderActivityList(member, activityMode) {
  const memberActivity = DevAgoraStore.getUserActivity(member.id);
  memberPageElements.activityTabs.querySelectorAll("[data-activity-mode]").forEach((tabButton) => tabButton.setAttribute("aria-pressed", String(tabButton.dataset.activityMode === activityMode)));
  if (activityMode === "threads") {
    memberPageElements.activityList.innerHTML = memberActivity.threads.length
      ? memberActivity.threads.map((thread) => renderThreadRow(thread, { showCategory: true })).join("")
      : renderEmptyState("Aucun sujet lancé", `${escapeHtml(member.displayName)} n'a pas encore ouvert de discussion.`);
  } else {
    memberPageElements.activityList.innerHTML = memberActivity.posts.length
      ? memberActivity.posts.slice(0, 12).map((post) => {
        const parentThread = DevAgoraStore.getThreadById(post.threadId);
        const excerptText = stripMarkdown(post.body);
        return `
          <article class="activity-item reveal">
            <p class="activity-item__context">${post.id.endsWith("-p1") ? "A lancé" : "A répondu à"} <a href="sujet.html?id=${encodeURIComponent(parentThread.id)}#message-${encodeURIComponent(post.id)}">${escapeHtml(parentThread.title)}</a></p>
            <p class="activity-item__excerpt">${escapeHtml(excerptText.slice(0, 180))}${excerptText.length > 180 ? "…" : ""}</p>
            <p class="activity-item__meta">${formatRelativeTime(post.createdAt)} · ${pluralize(DevAgoraStore.getPostScore(post), "vote", "votes")}</p>
          </article>`;
      }).join("")
      : renderEmptyState("Aucun message", `${escapeHtml(member.displayName)} n'a encore rien publié. Ça ne saurait tarder !`, '<a class="button button--primary" href="nouveau-sujet.html">Lancer une discussion</a>');
  }
  observeRevealElements(memberPageElements.activityList);
}

function renderUnknownMember() {
  document.title = "Membre introuvable · DevAgora";
  memberPageElements.breadcrumbCurrent.textContent = "Membre introuvable";
  memberPageElements.pageRoot.innerHTML = renderEmptyState(
    "Membre introuvable",
    requestedMemberId ? "Ce profil n'existe pas ou a été désactivé par son propriétaire." : "Aucun membre n'a été précisé dans l'adresse.",
    `<a class="button button--primary" href="membre.html?id=${encodeURIComponent(DevAgoraStore.getCurrentUser().id)}">Voir mon profil</a><a class="button button--ghost" href="index.html">Retour à l'accueil</a>`,
    "h1"
  );
}

if (currentMember) {
  renderProfileCard(currentMember);
  renderProfileStats(currentMember, DevAgoraStore.getUserActivity(currentMember.id));
  renderBadgeGrid(currentMember);
  renderActivityList(currentMember, "posts");
  memberPageElements.activityTabs.addEventListener("click", (clickEvent) => {
    const tabButton = clickEvent.target.closest("[data-activity-mode]");
    if (tabButton) renderActivityList(currentMember, tabButton.dataset.activityMode);
  });
} else {
  renderUnknownMember();
}
