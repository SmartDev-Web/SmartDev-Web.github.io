/* Thread creation page: category select, tag chips input, markdown editor, live card preview and validation. */
const MAXIMUM_TAG_COUNT = FORUM_LIMITS.maximumTagCount;
const MAXIMUM_TAG_LENGTH = FORUM_LIMITS.maximumTagLength;
const MINIMUM_TITLE_LENGTH = FORUM_LIMITS.titleMinimumLength;
const MAXIMUM_TITLE_LENGTH = FORUM_LIMITS.titleMaximumLength;
const MINIMUM_BODY_LENGTH = 30;

const newThreadElements = {
  form: document.querySelector("[data-new-thread-form]"),
  categorySelect: document.querySelector("#thread-category"),
  titleInput: document.querySelector("#thread-title"),
  titleCounter: document.querySelector("[data-title-counter]"),
  tagField: document.querySelector("[data-tag-field]"),
  tagChipList: document.querySelector("[data-tag-chips]"),
  tagInput: document.querySelector("#thread-tags"),
  tagSuggestionList: document.querySelector("[data-tag-suggestions]"),
  cardPreview: document.querySelector("[data-card-preview]"),
  formStatus: document.querySelector("[data-form-status]")
};

const newThreadState = { tags: [] };

function normalizeTagName(rawTagName) {
  return normalizeSearchText(rawTagName).trim().replace(/^#/, "").replace(/[^a-z0-9.+-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, MAXIMUM_TAG_LENGTH);
}

function setFieldError(fieldName, errorMessage) {
  const errorElement = document.querySelector(`[data-error-for="${fieldName}"]`);
  const fieldElement = newThreadElements.form.querySelector(`[name="${fieldName}"]`);
  errorElement.textContent = errorMessage;
  if (fieldElement) fieldElement.setAttribute("aria-invalid", String(Boolean(errorMessage)));
}

function renderTagChipList() {
  newThreadElements.tagChipList.innerHTML = newThreadState.tags.map((tagName) => `<li class="tag-chip tag-chip--removable">#${escapeHtml(tagName)}<button type="button" data-remove-tag="${escapeHtml(tagName)}" aria-label="Retirer le tag ${escapeHtml(tagName)}">×</button></li>`).join("");
  newThreadElements.tagInput.placeholder = newThreadState.tags.length >= MAXIMUM_TAG_COUNT ? "Maximum atteint" : "Ajouter un tag puis Entrée";
  newThreadElements.tagInput.disabled = newThreadState.tags.length >= MAXIMUM_TAG_COUNT;
  const suggestedTags = DevAgoraStore.getPopularTags(20).map(({ tagName }) => tagName).filter((tagName) => !newThreadState.tags.includes(tagName)).slice(0, 8);
  newThreadElements.tagSuggestionList.innerHTML = suggestedTags.map((tagName) => `<li><button type="button" class="tag-button" data-suggest-tag="${escapeHtml(tagName)}">+ ${escapeHtml(tagName)}</button></li>`).join("");
  renderCardPreview();
}

function addTag(rawTagName) {
  const tagName = normalizeTagName(rawTagName);
  if (!tagName) return;
  if (newThreadState.tags.includes(tagName)) {
    setFieldError("tags", `Le tag « ${tagName} » est déjà ajouté.`);
    return;
  }
  if (newThreadState.tags.length >= MAXIMUM_TAG_COUNT) {
    setFieldError("tags", `${MAXIMUM_TAG_COUNT} tags maximum.`);
    return;
  }
  newThreadState.tags.push(tagName);
  setFieldError("tags", "");
  renderTagChipList();
}

function removeTag(tagName) {
  newThreadState.tags = newThreadState.tags.filter((existingTag) => existingTag !== tagName);
  setFieldError("tags", "");
  renderTagChipList();
  newThreadElements.tagInput.focus();
}

function renderCardPreview() {
  const selectedCategory = DevAgoraStore.getCategoryById(newThreadElements.categorySelect.value) || DevAgoraStore.categories[0];
  const previewThread = {
    id: "apercu",
    categoryId: selectedCategory.id,
    title: newThreadElements.titleInput.value.trim() || "Le titre de votre sujet apparaîtra ici",
    tags: newThreadState.tags,
    views: 0,
    pinned: false,
    solved: false,
    isUserCreated: true,
    authorId: DevAgoraStore.getCurrentUser().id,
    createdAt: Date.now(),
    replyCount: 0,
    score: 0,
    lastActivityAt: Date.now(),
    lastPost: null
  };
  newThreadElements.cardPreview.innerHTML = renderThreadRow(previewThread, { showCategory: true }).replace("thread-row reveal", "thread-row is-visible");
}

function validateNewThreadForm(bodyText) {
  const titleText = newThreadElements.titleInput.value.trim();
  const fieldErrors = {
    category: DevAgoraStore.getCategoryById(newThreadElements.categorySelect.value) ? "" : "Choisissez une catégorie.",
    title: titleText.length < MINIMUM_TITLE_LENGTH ? `Le titre doit contenir au moins ${MINIMUM_TITLE_LENGTH} caractères.` : titleText.length > MAXIMUM_TITLE_LENGTH ? `Le titre ne doit pas dépasser ${MAXIMUM_TITLE_LENGTH} caractères.` : "",
    tags: newThreadState.tags.length === 0 ? "Ajoutez au moins un tag pour faciliter la recherche." : "",
    body: bodyText.trim().length < MINIMUM_BODY_LENGTH ? `Détaillez votre message (au moins ${MINIMUM_BODY_LENGTH} caractères).` : ""
  };
  Object.entries(fieldErrors).forEach(([fieldName, errorMessage]) => setFieldError(fieldName, errorMessage));
  return Object.keys(fieldErrors).find((fieldName) => fieldErrors[fieldName]) || null;
}

function initNewThreadPage() {
  const requestedCategoryId = getQueryParameter("categorie");
  newThreadElements.categorySelect.innerHTML = '<option value="">Sélectionnez une catégorie</option>' + DevAgoraStore.categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`).join("");
  if (DevAgoraStore.getCategoryById(requestedCategoryId)) newThreadElements.categorySelect.value = requestedCategoryId;
  const bodyEditor = initMarkdownEditor(document.querySelector("[data-markdown-editor]"), (bodyText) => {
    if (bodyText.trim().length >= MINIMUM_BODY_LENGTH) setFieldError("body", "");
  });
  newThreadElements.titleInput.addEventListener("input", () => {
    const titleLength = newThreadElements.titleInput.value.length;
    newThreadElements.titleCounter.textContent = `${titleLength} / ${MAXIMUM_TITLE_LENGTH}`;
    newThreadElements.titleCounter.classList.toggle("is-over", titleLength > MAXIMUM_TITLE_LENGTH);
    if (newThreadElements.titleInput.value.trim().length >= MINIMUM_TITLE_LENGTH) setFieldError("title", "");
    renderCardPreview();
  });
  newThreadElements.categorySelect.addEventListener("change", () => {
    setFieldError("category", "");
    renderCardPreview();
  });
  newThreadElements.tagInput.addEventListener("keydown", (keyboardEvent) => {
    if (keyboardEvent.key === "Enter" || keyboardEvent.key === ",") {
      keyboardEvent.preventDefault();
      addTag(newThreadElements.tagInput.value);
      newThreadElements.tagInput.value = "";
    } else if (keyboardEvent.key === "Backspace" && newThreadElements.tagInput.value === "" && newThreadState.tags.length) {
      removeTag(newThreadState.tags[newThreadState.tags.length - 1]);
    }
  });
  newThreadElements.tagInput.addEventListener("blur", () => {
    if (!newThreadElements.tagInput.value.trim()) return;
    addTag(newThreadElements.tagInput.value);
    newThreadElements.tagInput.value = "";
  });
  newThreadElements.tagField.addEventListener("click", (clickEvent) => {
    const removeButton = clickEvent.target.closest("[data-remove-tag]");
    if (removeButton) removeTag(removeButton.dataset.removeTag);
    else if (clickEvent.target === newThreadElements.tagField || clickEvent.target === newThreadElements.tagChipList) newThreadElements.tagInput.focus();
  });
  newThreadElements.tagSuggestionList.addEventListener("click", (clickEvent) => {
    const suggestionButton = clickEvent.target.closest("[data-suggest-tag]");
    if (suggestionButton) addTag(suggestionButton.dataset.suggestTag);
  });
  newThreadElements.form.addEventListener("reset", () => {
    newThreadState.tags = [];
    bodyEditor.showWriteTab();
    ["category", "title", "tags", "body"].forEach((fieldName) => setFieldError(fieldName, ""));
    newThreadElements.titleCounter.textContent = `0 / ${MAXIMUM_TITLE_LENGTH}`;
    requestAnimationFrame(renderTagChipList);
  });
  newThreadElements.form.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    const firstInvalidField = validateNewThreadForm(bodyEditor.textareaElement.value);
    if (firstInvalidField) {
      newThreadElements.formStatus.textContent = "Merci de corriger les champs signalés.";
      newThreadElements.formStatus.className = "form-status form-status--error";
      const fieldToFocus = firstInvalidField === "tags" ? newThreadElements.tagInput : newThreadElements.form.querySelector(`[name="${firstInvalidField}"]`);
      if (firstInvalidField === "body") bodyEditor.showWriteTab();
      fieldToFocus.focus();
      return;
    }
    const createdThreadId = DevAgoraStore.createThread({
      categoryId: newThreadElements.categorySelect.value,
      title: newThreadElements.titleInput.value.trim(),
      tags: newThreadState.tags.slice(),
      body: bodyEditor.textareaElement.value.trim()
    });
    if (!createdThreadId) {
      newThreadElements.formStatus.textContent = "Impossible d'enregistrer ce sujet. Vérifiez sa longueur puis réessayez.";
      newThreadElements.formStatus.className = "form-status form-status--error";
      return;
    }
    newThreadElements.formStatus.textContent = "Sujet publié ! Redirection vers votre discussion…";
    newThreadElements.formStatus.className = "form-status form-status--success";
    newThreadElements.form.querySelector("[type=submit]").disabled = true;
    navigateWithTransition(`sujet.html?id=${encodeURIComponent(createdThreadId)}`);
  });
  renderTagChipList();
}

initNewThreadPage();
