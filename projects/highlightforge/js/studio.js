/* ==========================================================================
   HighlightForge — interactive studio (timeline, preview, trim, export queue)
   ========================================================================== */

const STUDIO_STORAGE_KEY = "highlightforge.studio.v1";
const MINIMUM_CLIP_DURATION = 5;
const MAXIMUM_CLIP_DURATION = 180;
const TRIM_CONTEXT_SECONDS = 45;
const MAXIMUM_QUEUE_LENGTH = 40;
const MINIMUM_SENSITIVITY_SCORE = 50;
const MAXIMUM_SENSITIVITY_SCORE = 95;

const highlightTypeCatalog = {
  clutch: { label: "Clutch", color: "#00f0ff" },
  multikill: { label: "Kill multiple", color: "#b6ff3b" },
  chat: { label: "Pic du chat", color: "#ff2bd6" },
  reaction: { label: "Réaction facecam", color: "#ffb547" }
};

const exportFormatCatalog = {
  landscape: "16:9",
  vertical: "9:16",
  square: "1:1"
};

const vodCatalog = [
  {
    id: "vod-valorant",
    title: "Valorant ranked — Road to Radiant, jour 42",
    channel: "twitch.tv/kyrielle",
    recordedOn: "29 septembre 2026",
    durationSeconds: 11520,
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
    highlights: [
      { id: "h1", title: "Ouverture 3k au Vandal sur Ascent", type: "multikill", start: 742, end: 771, score: 74 },
      { id: "h2", title: "Le chat explose sur un bait raté", type: "chat", start: 1910, end: 1942, score: 68 },
      { id: "h3", title: "Defuse au dernier dixième", type: "clutch", start: 3285, end: 3318, score: 88 },
      { id: "h4", title: "Fou rire après un ace adverse", type: "reaction", start: 4420, end: 4447, score: 63 },
      { id: "h5", title: "Clutch 1v4 sur le site B", type: "clutch", start: 6432, end: 6481, score: 97 },
      { id: "h6", title: "Raid de 640 viewers", type: "chat", start: 7810, end: 7836, score: 81 },
      { id: "h7", title: "Ace en 14 secondes", type: "multikill", start: 8468, end: 8490, score: 92 },
      { id: "h8", title: "Promotion Immortel 3 en direct", type: "reaction", start: 10985, end: 11030, score: 86 }
    ]
  },
  {
    id: "vod-lol",
    title: "League of Legends — Clash entre abonnés",
    channel: "twitch.tv/nordwave_tv",
    recordedOn: "26 septembre 2026",
    durationSeconds: 14700,
    imageUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80",
    highlights: [
      { id: "h1", title: "First blood niveau 1 au buisson", type: "multikill", start: 520, end: 548, score: 61 },
      { id: "h2", title: "Vol de Baron au Smite", type: "clutch", start: 2875, end: 2912, score: 94 },
      { id: "h3", title: "Pentakill de l'abonné Mistral", type: "multikill", start: 4630, end: 4672, score: 96 },
      { id: "h4", title: "Débat enflammé sur le patch 26.19", type: "chat", start: 6100, end: 6158, score: 66 },
      { id: "h5", title: "Backdoor surprise en fin de partie", type: "clutch", start: 9022, end: 9065, score: 89 },
      { id: "h6", title: "Réaction au skin légendaire", type: "reaction", start: 11240, end: 11268, score: 72 },
      { id: "h7", title: "Victoire du tournoi et cris de joie", type: "chat", start: 14210, end: 14260, score: 90 }
    ]
  },
  {
    id: "vod-chatting",
    title: "Just Chatting — Réaction aux clips de la commu",
    channel: "youtube.com/@pixelarena",
    recordedOn: "21 septembre 2026",
    durationSeconds: 8400,
    imageUrl: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=1200&q=80",
    highlights: [
      { id: "h1", title: "Le clip du chat qui tombe du bureau", type: "reaction", start: 640, end: 668, score: 84 },
      { id: "h2", title: "Annonce du tournoi caritatif", type: "chat", start: 1820, end: 1880, score: 79 },
      { id: "h3", title: "Imitation ratée d'un caster", type: "reaction", start: 3050, end: 3074, score: 71 },
      { id: "h4", title: "Speedrun Mario en 4 minutes", type: "clutch", start: 4410, end: 4466, score: 83 },
      { id: "h5", title: "Don de 500 € pour l'association", type: "chat", start: 6215, end: 6242, score: 95 },
      { id: "h6", title: "Quiz culture jeu vidéo : sans faute", type: "multikill", start: 7505, end: 7548, score: 58 }
    ]
  }
];

const studioState = {
  selectedVodId: vodCatalog[0].id,
  selectedHighlightId: null,
  activeTypes: Object.keys(highlightTypeCatalog),
  minimumScore: 60,
  exportFormat: "landscape",
  trimOverrides: {},
  exportQueue: [],
  isPreviewPlaying: false,
  previewPositionSeconds: 0,
  previewFrameRequestId: 0,
  isRendering: false
};

const studioElements = {};

/* Formats a number of seconds as H:MM:SS or MM:SS. */
function formatTimecode(totalSeconds) {
  const roundedSeconds = Math.max(0, Math.round(totalSeconds));
  const hourCount = Math.floor(roundedSeconds / 3600);
  const minuteCount = Math.floor((roundedSeconds % 3600) / 60);
  const secondCount = roundedSeconds % 60;
  const paddedMinutesAndSeconds = String(minuteCount).padStart(2, "0") + ":" + String(secondCount).padStart(2, "0");
  return hourCount > 0 ? hourCount + ":" + paddedMinutesAndSeconds : paddedMinutesAndSeconds;
}

/* Formats a duration in seconds as a short French label. */
function formatDurationLabel(totalSeconds) {
  const roundedSeconds = Math.round(totalSeconds);
  if (roundedSeconds < 60) return roundedSeconds + " s";
  return Math.floor(roundedSeconds / 60) + " min " + String(roundedSeconds % 60).padStart(2, "0") + " s";
}

/* Returns a deterministic pseudo-random value between 0 and 1 for a seed. */
function getSeededRandom(seedValue) {
  const sineValue = Math.sin(seedValue * 91.3458 + 12.9898) * 47453.5453;
  return sineValue - Math.floor(sineValue);
}

/* Returns the currently selected VOD object. */
function getSelectedVod() {
  return vodCatalog.find((vodEntry) => vodEntry.id === studioState.selectedVodId) || vodCatalog[0];
}

/* Returns the currently selected highlight object, if any. */
function getSelectedHighlight() {
  return getSelectedVod().highlights.find((highlightEntry) => highlightEntry.id === studioState.selectedHighlightId) || null;
}

/* Returns the storage key used for a highlight's trim override. */
function getTrimKey(vodId, highlightId) {
  return vodId + ":" + highlightId;
}

/* Returns the effective start and end of a highlight, including user trims. */
function getHighlightTrim(highlightEntry) {
  const trimOverride = studioState.trimOverrides[getTrimKey(studioState.selectedVodId, highlightEntry.id)];
  return trimOverride ? { start: trimOverride.start, end: trimOverride.end } : { start: highlightEntry.start, end: highlightEntry.end };
}

/* Returns the visible context window around a highlight for the trim track. */
function getTrimWindow(highlightEntry) {
  const vodDuration = getSelectedVod().durationSeconds;
  return { start: Math.max(0, highlightEntry.start - TRIM_CONTEXT_SECONDS), end: Math.min(vodDuration, highlightEntry.end + TRIM_CONTEXT_SECONDS) };
}

/* Returns true when a highlight passes the active type and score filters. */
function isHighlightVisible(highlightEntry) {
  return studioState.activeTypes.includes(highlightEntry.type) && highlightEntry.score >= studioState.minimumScore;
}

/* Saves the persistent part of the studio state to localStorage. */
function persistStudioState() {
  const persistedState = {
    selectedVodId: studioState.selectedVodId,
    minimumScore: studioState.minimumScore,
    exportFormat: studioState.exportFormat,
    trimOverrides: studioState.trimOverrides,
    exportQueue: studioState.exportQueue
  };
  try {
    localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(persistedState));
  } catch (storageError) {
    console.warn("Studio state could not be saved.", storageError);
  }
}

/* Finds a catalog highlight from its VOD and highlight identifiers. */
function findCatalogHighlight(vodId, highlightId) {
  const vodEntry = vodCatalog.find((candidateVod) => candidateVod.id === vodId);
  const highlightEntry = vodEntry ? vodEntry.highlights.find((candidateHighlight) => candidateHighlight.id === highlightId) : null;
  return vodEntry && highlightEntry ? { vodEntry, highlightEntry } : null;
}

/* Returns true when a start/end pair is a valid trim for a catalog highlight. */
function isValidTrimForHighlight(vodEntry, highlightEntry, trimStart, trimEnd) {
  if (!Number.isInteger(trimStart) || !Number.isInteger(trimEnd)) return false;
  const windowStart = Math.max(0, highlightEntry.start - TRIM_CONTEXT_SECONDS);
  const windowEnd = Math.min(vodEntry.durationSeconds, highlightEntry.end + TRIM_CONTEXT_SECONDS);
  const clipLength = trimEnd - trimStart;
  return trimStart >= windowStart && trimEnd <= windowEnd && clipLength >= MINIMUM_CLIP_DURATION && clipLength <= MAXIMUM_CLIP_DURATION;
}

/* Keeps only the stored trims that match a catalog highlight and its limits. */
function sanitizeStoredTrimOverrides(storedTrimOverrides) {
  const sanitizedOverrides = {};
  if (!storedTrimOverrides || typeof storedTrimOverrides !== "object") return sanitizedOverrides;
  Object.entries(storedTrimOverrides).forEach(([trimKey, storedTrim]) => {
    const [vodId, highlightId] = trimKey.split(":");
    const catalogMatch = findCatalogHighlight(vodId, highlightId);
    if (!catalogMatch || !storedTrim || typeof storedTrim !== "object") return;
    if (!isValidTrimForHighlight(catalogMatch.vodEntry, catalogMatch.highlightEntry, storedTrim.start, storedTrim.end)) return;
    sanitizedOverrides[getTrimKey(vodId, highlightId)] = { start: storedTrim.start, end: storedTrim.end };
  });
  return sanitizedOverrides;
}

/* Rebuilds stored queue items from the catalog so that only known clips and values are kept. */
function sanitizeStoredExportQueue(storedExportQueue) {
  if (!Array.isArray(storedExportQueue)) return [];
  const usedQueueIds = new Set();
  return storedExportQueue.slice(0, MAXIMUM_QUEUE_LENGTH).reduce((sanitizedQueue, storedItem) => {
    if (!storedItem || typeof storedItem !== "object") return sanitizedQueue;
    const catalogMatch = findCatalogHighlight(storedItem.vodId, storedItem.highlightId);
    const hasValidId = typeof storedItem.queueId === "string" && /^clip-[a-z0-9]{1,16}$/.test(storedItem.queueId) && !usedQueueIds.has(storedItem.queueId);
    if (!catalogMatch || !hasValidId || !isKnownExportFormat(storedItem.format)) return sanitizedQueue;
    if (!isValidTrimForHighlight(catalogMatch.vodEntry, catalogMatch.highlightEntry, storedItem.start, storedItem.end)) return sanitizedQueue;
    usedQueueIds.add(storedItem.queueId);
    sanitizedQueue.push(createQueueItem(catalogMatch.vodEntry, catalogMatch.highlightEntry, { start: storedItem.start, end: storedItem.end }, storedItem.format, storedItem.queueId, storedItem.status === "ready" ? "ready" : "queued"));
    return sanitizedQueue;
  }, []);
}

/* Builds an export queue item from catalog data. */
function createQueueItem(vodEntry, highlightEntry, clipTrim, exportFormat, queueId, queueStatus) {
  return {
    queueId,
    vodId: vodEntry.id,
    highlightId: highlightEntry.id,
    title: highlightEntry.title,
    type: highlightEntry.type,
    start: clipTrim.start,
    end: clipTrim.end,
    format: exportFormat,
    status: queueStatus,
    progress: queueStatus === "ready" ? 100 : 0
  };
}

/* Returns true when a value is one of the export format keys. */
function isKnownExportFormat(candidateFormat) {
  return typeof candidateFormat === "string" && Object.prototype.hasOwnProperty.call(exportFormatCatalog, candidateFormat);
}

/* Returns true when a value is an allowed position of the sensitivity slider. */
function isValidMinimumScore(candidateScore) {
  return Number.isInteger(candidateScore) && candidateScore >= MINIMUM_SENSITIVITY_SCORE && candidateScore <= MAXIMUM_SENSITIVITY_SCORE && candidateScore % 5 === 0;
}

/* Restores the persistent part of the studio state from localStorage. */
function restoreStudioState() {
  try {
    const storedState = JSON.parse(localStorage.getItem(STUDIO_STORAGE_KEY) || "null");
    if (!storedState || typeof storedState !== "object") return;
    if (vodCatalog.some((vodEntry) => vodEntry.id === storedState.selectedVodId)) studioState.selectedVodId = storedState.selectedVodId;
    if (isValidMinimumScore(storedState.minimumScore)) studioState.minimumScore = storedState.minimumScore;
    if (isKnownExportFormat(storedState.exportFormat)) studioState.exportFormat = storedState.exportFormat;
    studioState.trimOverrides = sanitizeStoredTrimOverrides(storedState.trimOverrides);
    studioState.exportQueue = sanitizeStoredExportQueue(storedState.exportQueue);
  } catch (storageError) {
    console.warn("Studio state could not be restored.", storageError);
  }
}

/* Caches every DOM element the studio interacts with. */
function cacheStudioElements() {
  const selectorMap = {
    vodSelect: "[data-vod-select]",
    vodTitle: "[data-vod-title]",
    vodSummary: "[data-vod-summary]",
    previewScreen: "[data-preview-screen]",
    previewImage: "[data-preview-image]",
    previewTag: "[data-preview-tag]",
    previewTypeLabel: "[data-preview-type-label]",
    previewPlayButton: "[data-preview-play]",
    previewProgress: "[data-preview-progress]",
    previewTime: "[data-preview-time]",
    clipTitle: "[data-clip-title]",
    clipStart: "[data-clip-start]",
    clipEnd: "[data-clip-end]",
    clipDuration: "[data-clip-duration]",
    trimTrack: "[data-trim-track]",
    trimWave: "[data-trim-wave]",
    trimSelection: "[data-trim-selection]",
    trimWindowStart: "[data-trim-window-start]",
    trimWindowEnd: "[data-trim-window-end]",
    resetTrimButton: "[data-reset-trim]",
    addToQueueButton: "[data-add-to-queue]",
    filterChips: "[data-filter-chips]",
    sensitivityInput: "[data-sensitivity-input]",
    sensitivityOutput: "[data-sensitivity-output]",
    visibleCount: "[data-visible-count]",
    vodRuler: "[data-vod-ruler]",
    vodWave: "[data-vod-wave]",
    markerLayer: "[data-marker-layer]",
    highlightList: "[data-highlight-list]",
    exportQueue: "[data-export-queue]",
    exportSummary: "[data-export-summary]",
    queueCount: "[data-queue-count]",
    clearReadyButton: "[data-clear-ready]",
    startRenderButton: "[data-start-render]"
  };
  Object.entries(selectorMap).forEach(([elementName, elementSelector]) => {
    studioElements[elementName] = document.querySelector(elementSelector);
  });
  studioElements.trimHandles = document.querySelectorAll("[data-trim-handle]");
  studioElements.formatInputs = document.querySelectorAll("[data-format-input]");
}

/* Fills the VOD dropdown with the catalog entries. */
function renderVodOptions() {
  studioElements.vodSelect.innerHTML = vodCatalog.map((vodEntry) => `<option value="${escapeHtml(vodEntry.id)}">${escapeHtml(vodEntry.title)}</option>`).join("");
  studioElements.vodSelect.value = studioState.selectedVodId;
}

/* Renders the filter chips for each highlight type. */
function renderFilterChips() {
  studioElements.filterChips.innerHTML = Object.entries(highlightTypeCatalog).map(([typeKey, typeInfo]) => `
    <button class="filter-chip" type="button" style="color:${typeInfo.color}" aria-pressed="${studioState.activeTypes.includes(typeKey)}" data-filter-type="${typeKey}">
      <span class="filter-chip-dot" style="background:${typeInfo.color}"></span><span style="color:var(--color-text)">${escapeHtml(typeInfo.label)}</span>
    </button>`).join("");
}

/* Renders the ruler, waveform and markers of the selected VOD timeline. */
function renderVodTimeline() {
  const selectedVod = getSelectedVod();
  const vodIndex = vodCatalog.indexOf(selectedVod);
  const rulerStepCount = 6;
  studioElements.vodRuler.innerHTML = Array.from({ length: rulerStepCount }, (unusedValue, rulerIndex) => {
    const rulerRatio = rulerIndex / rulerStepCount;
    return `<span style="left:${rulerRatio * 100}%">${formatTimecode(selectedVod.durationSeconds * rulerRatio)}</span>`;
  }).join("");
  const waveBarCount = 160;
  studioElements.vodWave.innerHTML = Array.from({ length: waveBarCount }, (unusedValue, barIndex) => {
    const barTimeSeconds = (barIndex / waveBarCount) * selectedVod.durationSeconds;
    const isNearHighlight = selectedVod.highlights.some((highlightEntry) => Math.abs(barTimeSeconds - (highlightEntry.start + highlightEntry.end) / 2) < selectedVod.durationSeconds / waveBarCount * 1.5);
    const barHeight = 18 + getSeededRandom(barIndex + vodIndex * 500) * 45 + (isNearHighlight ? 30 : 0);
    return `<span style="height:${Math.min(barHeight, 100)}%"></span>`;
  }).join("");
  studioElements.markerLayer.innerHTML = selectedVod.highlights.map((highlightEntry, highlightIndex) => {
    const typeInfo = highlightTypeCatalog[highlightEntry.type];
    const leftPercent = (highlightEntry.start / selectedVod.durationSeconds) * 100;
    const widthPercent = ((highlightEntry.end - highlightEntry.start) / selectedVod.durationSeconds) * 100;
    return `<button class="highlight-marker" type="button" style="--marker-color:${typeInfo.color};left:${leftPercent}%;width:${widthPercent}%" data-marker-index="${highlightIndex + 1}" data-highlight-id="${escapeHtml(highlightEntry.id)}" aria-label="Temps fort ${highlightIndex + 1} : ${escapeHtml(highlightEntry.title)}, ${escapeHtml(typeInfo.label)}, score ${highlightEntry.score}"></button>`;
  }).join("");
  studioElements.highlightList.innerHTML = selectedVod.highlights.map((highlightEntry, highlightIndex) => {
    const typeInfo = highlightTypeCatalog[highlightEntry.type];
    return `<li data-list-item="${escapeHtml(highlightEntry.id)}"><button class="highlight-list-button" type="button" style="--marker-color:${typeInfo.color}" data-highlight-id="${escapeHtml(highlightEntry.id)}">
      <span class="list-index">${highlightIndex + 1}</span>
      <span>${escapeHtml(highlightEntry.title)}<small>${formatTimecode(highlightEntry.start)} · ${escapeHtml(typeInfo.label)}</small></span>
      <span class="list-score">${highlightEntry.score}</span>
    </button></li>`;
  }).join("");
  studioElements.vodTitle.textContent = selectedVod.title;
  studioElements.vodSummary.textContent = `${selectedVod.channel} · diffusé le ${selectedVod.recordedOn} · durée ${formatTimecode(selectedVod.durationSeconds)} · ${selectedVod.highlights.length} temps forts détectés`;
  studioElements.previewImage.src = selectedVod.imageUrl;
}

/* Applies the type and score filters to markers and list items. */
function applyHighlightFilters() {
  const selectedVod = getSelectedVod();
  let visibleHighlightCount = 0;
  selectedVod.highlights.forEach((highlightEntry) => {
    const isVisible = isHighlightVisible(highlightEntry);
    if (isVisible) visibleHighlightCount += 1;
    const markerElement = studioElements.markerLayer.querySelector(`[data-highlight-id="${highlightEntry.id}"]`);
    markerElement.classList.toggle("is-hidden", !isVisible);
    markerElement.disabled = !isVisible;
    studioElements.highlightList.querySelector(`[data-list-item="${highlightEntry.id}"]`).hidden = !isVisible;
  });
  studioElements.visibleCount.textContent = `${visibleHighlightCount} / ${selectedVod.highlights.length} affichés`;
  studioElements.sensitivityOutput.textContent = String(studioState.minimumScore);
  studioElements.sensitivityInput.value = String(studioState.minimumScore);
  studioElements.filterChips.querySelectorAll("[data-filter-type]").forEach((chipElement) => {
    chipElement.setAttribute("aria-pressed", String(studioState.activeTypes.includes(chipElement.dataset.filterType)));
  });
}

/* Highlights the selected marker and list item. */
function renderSelectionState() {
  document.querySelectorAll("[data-highlight-id]").forEach((highlightElement) => {
    highlightElement.classList.toggle("is-selected", highlightElement.dataset.highlightId === studioState.selectedHighlightId);
  });
}

/* Positions the trim selection and updates every clip timing label. */
function renderTrimState() {
  const selectedHighlight = getSelectedHighlight();
  const hasSelection = Boolean(selectedHighlight);
  studioElements.trimSelection.hidden = !hasSelection;
  studioElements.addToQueueButton.disabled = !hasSelection;
  studioElements.resetTrimButton.disabled = !hasSelection;
  studioElements.previewPlayButton.disabled = !hasSelection;
  if (!hasSelection) return;
  const clipTrim = getHighlightTrim(selectedHighlight);
  const trimWindow = getTrimWindow(selectedHighlight);
  const windowLength = trimWindow.end - trimWindow.start;
  studioElements.trimSelection.style.left = ((clipTrim.start - trimWindow.start) / windowLength) * 100 + "%";
  studioElements.trimSelection.style.width = ((clipTrim.end - clipTrim.start) / windowLength) * 100 + "%";
  studioElements.trimWindowStart.textContent = formatTimecode(trimWindow.start);
  studioElements.trimWindowEnd.textContent = formatTimecode(trimWindow.end);
  studioElements.clipStart.textContent = formatTimecode(clipTrim.start);
  studioElements.clipEnd.textContent = formatTimecode(clipTrim.end);
  studioElements.clipDuration.textContent = formatDurationLabel(clipTrim.end - clipTrim.start);
  studioElements.trimHandles.forEach((trimHandleElement) => {
    const handleValue = trimHandleElement.dataset.trimHandle === "start" ? clipTrim.start : clipTrim.end;
    trimHandleElement.setAttribute("aria-valuemin", String(Math.round(trimWindow.start)));
    trimHandleElement.setAttribute("aria-valuemax", String(Math.round(trimWindow.end)));
    trimHandleElement.setAttribute("aria-valuenow", String(Math.round(handleValue)));
    trimHandleElement.setAttribute("aria-valuetext", formatTimecode(handleValue));
  });
  renderPreviewProgress();
}

/* Updates the preview progress bar and time label. */
function renderPreviewProgress() {
  const selectedHighlight = getSelectedHighlight();
  if (!selectedHighlight) {
    studioElements.previewProgress.style.width = "0%";
    studioElements.previewTime.textContent = "00:00 / 00:00";
    return;
  }
  const clipTrim = getHighlightTrim(selectedHighlight);
  const clipLength = clipTrim.end - clipTrim.start;
  const clampedPosition = Math.min(studioState.previewPositionSeconds, clipLength);
  studioElements.previewProgress.style.width = (clampedPosition / clipLength) * 100 + "%";
  studioElements.previewTime.textContent = formatTimecode(clampedPosition) + " / " + formatTimecode(clipLength);
}

/* Updates the preview panel for the selected highlight. */
function renderPreviewPanel() {
  const selectedHighlight = getSelectedHighlight();
  studioElements.previewScreen.dataset.format = studioState.exportFormat;
  studioElements.previewScreen.classList.toggle("is-empty", !selectedHighlight);
  studioElements.formatInputs.forEach((formatInputElement) => {
    formatInputElement.checked = formatInputElement.value === studioState.exportFormat;
  });
  if (!selectedHighlight) {
    studioElements.clipTitle.textContent = "Aucun temps fort sélectionné";
    studioElements.previewTag.textContent = "Sélectionnez un temps fort";
    studioElements.previewTag.style.background = "";
    studioElements.previewTypeLabel.textContent = "—";
    ["clipStart", "clipEnd", "clipDuration"].forEach((elementName) => { studioElements[elementName].textContent = "—"; });
    studioElements.trimWave.innerHTML = "";
    renderTrimState();
    renderPreviewProgress();
    return;
  }
  const typeInfo = highlightTypeCatalog[selectedHighlight.type];
  const highlightIndex = getSelectedVod().highlights.indexOf(selectedHighlight);
  studioElements.clipTitle.textContent = selectedHighlight.title;
  studioElements.previewTag.textContent = `${typeInfo.label} · score ${selectedHighlight.score}`;
  studioElements.previewTag.style.background = typeInfo.color;
  studioElements.previewTypeLabel.textContent = `#${highlightIndex + 1} · ${formatTimecode(selectedHighlight.start)}`;
  studioElements.previewImage.style.objectPosition = `${20 + (highlightIndex * 23) % 60}% ${30 + (highlightIndex * 17) % 40}%`;
  studioElements.previewImage.style.transform = `scale(${1.05 + (highlightIndex % 3) * 0.08})`;
  studioElements.trimWave.innerHTML = Array.from({ length: 56 }, (unusedValue, barIndex) => {
    return `<span style="height:${20 + getSeededRandom(barIndex + highlightIndex * 77) * 60}%"></span>`;
  }).join("");
  renderTrimState();
}

/* Selects a highlight, stops playback and refreshes the preview. */
function selectHighlight(highlightId) {
  stopPreviewPlayback();
  studioState.selectedHighlightId = highlightId;
  studioState.previewPositionSeconds = 0;
  renderSelectionState();
  renderPreviewPanel();
}

/* Updates the trim of the selected highlight while respecting duration limits. */
function updateSelectedTrim(handleName, requestedSeconds) {
  const selectedHighlight = getSelectedHighlight();
  if (!selectedHighlight) return;
  const clipTrim = getHighlightTrim(selectedHighlight);
  const trimWindow = getTrimWindow(selectedHighlight);
  if (handleName === "start") {
    const lowerBound = Math.max(trimWindow.start, clipTrim.end - MAXIMUM_CLIP_DURATION);
    clipTrim.start = Math.round(Math.min(Math.max(requestedSeconds, lowerBound), clipTrim.end - MINIMUM_CLIP_DURATION));
  } else {
    const upperBound = Math.min(trimWindow.end, clipTrim.start + MAXIMUM_CLIP_DURATION);
    clipTrim.end = Math.round(Math.max(Math.min(requestedSeconds, upperBound), clipTrim.start + MINIMUM_CLIP_DURATION));
  }
  studioState.trimOverrides[getTrimKey(studioState.selectedVodId, selectedHighlight.id)] = clipTrim;
  studioState.previewPositionSeconds = 0;
  renderTrimState();
}

/* Converts a pointer x coordinate on the trim track into VOD seconds. */
function getSecondsFromTrimPointer(pointerClientX) {
  const selectedHighlight = getSelectedHighlight();
  const trimWindow = getTrimWindow(selectedHighlight);
  const trackRectangle = studioElements.trimTrack.getBoundingClientRect();
  const pointerRatio = Math.min(Math.max((pointerClientX - trackRectangle.left) / trackRectangle.width, 0), 1);
  return trimWindow.start + pointerRatio * (trimWindow.end - trimWindow.start);
}

/* Wires pointer dragging and keyboard control on both trim handles. */
function initializeTrimHandles() {
  studioElements.trimHandles.forEach((trimHandleElement) => {
    const handleName = trimHandleElement.dataset.trimHandle;
    trimHandleElement.addEventListener("pointerdown", (pointerEvent) => {
      pointerEvent.preventDefault();
      stopPreviewPlayback();
      trimHandleElement.setPointerCapture(pointerEvent.pointerId);
      trimHandleElement.focus();
    });
    trimHandleElement.addEventListener("pointermove", (pointerEvent) => {
      if (!trimHandleElement.hasPointerCapture(pointerEvent.pointerId)) return;
      updateSelectedTrim(handleName, getSecondsFromTrimPointer(pointerEvent.clientX));
    });
    trimHandleElement.addEventListener("pointerup", (pointerEvent) => {
      if (trimHandleElement.hasPointerCapture(pointerEvent.pointerId)) trimHandleElement.releasePointerCapture(pointerEvent.pointerId);
      persistStudioState();
    });
    trimHandleElement.addEventListener("keydown", (keyboardEvent) => {
      if (keyboardEvent.key !== "ArrowLeft" && keyboardEvent.key !== "ArrowRight") return;
      keyboardEvent.preventDefault();
      const selectedHighlight = getSelectedHighlight();
      if (!selectedHighlight) return;
      const clipTrim = getHighlightTrim(selectedHighlight);
      const stepSeconds = (keyboardEvent.shiftKey ? 5 : 1) * (keyboardEvent.key === "ArrowLeft" ? -1 : 1);
      updateSelectedTrim(handleName, clipTrim[handleName] + stepSeconds);
      persistStudioState();
    });
  });
}

/* Updates the play button icon and label for the playback state. */
function renderPlayButton() {
  studioElements.previewPlayButton.setAttribute("aria-label", studioState.isPreviewPlaying ? "Mettre l'aperçu en pause" : "Lire l'aperçu");
  studioElements.previewPlayButton.innerHTML = studioState.isPreviewPlaying
    ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>';
}

/* Stops the simulated preview playback and invalidates its pending animation frame. */
function stopPreviewPlayback() {
  studioState.isPreviewPlaying = false;
  cancelAnimationFrame(studioState.previewFrameRequestId);
  renderPlayButton();
}

/* Starts the simulated preview playback driven by requestAnimationFrame. */
function startPreviewPlayback() {
  if (!getSelectedHighlight()) return;
  const getSelectedClipLength = () => {
    const clipTrim = getHighlightTrim(getSelectedHighlight());
    return clipTrim.end - clipTrim.start;
  };
  if (studioState.previewPositionSeconds >= getSelectedClipLength()) studioState.previewPositionSeconds = 0;
  stopPreviewPlayback();
  studioState.isPreviewPlaying = true;
  renderPlayButton();
  let previousFrameTime = performance.now();
  const advancePlayback = (frameTime) => {
    if (!studioState.isPreviewPlaying || !getSelectedHighlight()) return;
    const clipLength = getSelectedClipLength();
    studioState.previewPositionSeconds += Math.max(frameTime - previousFrameTime, 0) / 1000;
    previousFrameTime = frameTime;
    if (studioState.previewPositionSeconds >= clipLength) {
      studioState.previewPositionSeconds = clipLength;
      stopPreviewPlayback();
    }
    renderPreviewProgress();
    if (studioState.isPreviewPlaying) studioState.previewFrameRequestId = requestAnimationFrame(advancePlayback);
  };
  studioState.previewFrameRequestId = requestAnimationFrame(advancePlayback);
}

/* Adds the selected highlight with its current trim and format to the queue. */
function addSelectedHighlightToQueue() {
  const selectedHighlight = getSelectedHighlight();
  if (!selectedHighlight) return;
  const selectedVod = getSelectedVod();
  const clipTrim = getHighlightTrim(selectedHighlight);
  const isDuplicate = studioState.exportQueue.some((queueItem) => queueItem.vodId === selectedVod.id && queueItem.highlightId === selectedHighlight.id && queueItem.start === clipTrim.start && queueItem.end === clipTrim.end && queueItem.format === studioState.exportFormat);
  if (isDuplicate) {
    showToastMessage("Ce clip est déjà dans la file avec ces réglages.");
    return;
  }
  if (studioState.exportQueue.length >= MAXIMUM_QUEUE_LENGTH) {
    showToastMessage(`La file d'export est limitée à ${MAXIMUM_QUEUE_LENGTH} clips.`);
    return;
  }
  studioState.exportQueue.push(createQueueItem(selectedVod, selectedHighlight, clipTrim, studioState.exportFormat, "clip-" + Date.now().toString(36), "queued"));
  persistStudioState();
  renderExportQueue();
  showToastMessage(`« ${selectedHighlight.title} » ajouté à la file d'export.`);
}

/* Returns the French status label of an export queue item. */
function getQueueStatusLabel(queueItem) {
  if (queueItem.status === "ready") return '<span class="status-ready">Prêt ✔</span>';
  if (queueItem.status === "rendering") return `<span class="status-rendering">Rendu ${Math.round(queueItem.progress)} %</span>`;
  return "En attente";
}

/* Renders the export queue list, counters and action buttons. */
function renderExportQueue() {
  const queueItems = studioState.exportQueue;
  studioElements.queueCount.textContent = queueItems.length + (queueItems.length > 1 ? " clips" : " clip");
  if (!queueItems.length) {
    studioElements.exportQueue.innerHTML = '<li class="export-empty">Votre file est vide. Sélectionnez un temps fort puis cliquez sur « Ajouter à la file d\'export ».</li>';
  } else {
    studioElements.exportQueue.innerHTML = queueItems.map((queueItem) => {
      const typeInfo = highlightTypeCatalog[queueItem.type];
      return `<li class="export-item" style="border-left:3px solid ${typeInfo.color}">
        <span class="export-item-title">${escapeHtml(queueItem.title)}</span>
        <span class="export-item-meta">${formatTimecode(queueItem.start)} → ${formatTimecode(queueItem.end)} · ${exportFormatCatalog[queueItem.format]} · <span data-queue-status="${escapeHtml(queueItem.queueId)}">${getQueueStatusLabel(queueItem)}</span></span>
        <button class="export-item-remove" type="button" aria-label="Retirer ${escapeHtml(queueItem.title)} de la file" data-remove-queue-item="${escapeHtml(queueItem.queueId)}" ${queueItem.status === "rendering" ? "disabled" : ""}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
        <div class="export-item-progress" aria-hidden="true"><span data-queue-progress="${escapeHtml(queueItem.queueId)}" style="width:${queueItem.status === "ready" ? 100 : queueItem.progress}%"></span></div>
      </li>`;
    }).join("");
  }
  const totalSeconds = queueItems.reduce((secondsSum, queueItem) => secondsSum + (queueItem.end - queueItem.start), 0);
  const readyCount = queueItems.filter((queueItem) => queueItem.status === "ready").length;
  studioElements.exportSummary.textContent = queueItems.length ? `Durée totale : ${formatDurationLabel(totalSeconds)} · ${readyCount} prêt(s) sur ${queueItems.length}` : "";
  studioElements.clearReadyButton.disabled = readyCount === 0 || studioState.isRendering;
  studioElements.startRenderButton.disabled = studioState.isRendering || !queueItems.some((queueItem) => queueItem.status === "queued");
  studioElements.startRenderButton.textContent = studioState.isRendering ? "Rendu en cours…" : "Lancer le rendu";
}

/* Updates only the progress bar and status of the item being rendered. */
function renderQueueItemProgress(queueItem) {
  const progressElement = studioElements.exportQueue.querySelector(`[data-queue-progress="${queueItem.queueId}"]`);
  const statusElement = studioElements.exportQueue.querySelector(`[data-queue-status="${queueItem.queueId}"]`);
  if (progressElement) progressElement.style.width = queueItem.progress + "%";
  if (statusElement) statusElement.innerHTML = getQueueStatusLabel(queueItem);
}

/* Renders queued clips one after the other with a simulated progress. */
function renderNextQueuedClip() {
  const nextQueueItem = studioState.exportQueue.find((queueItem) => queueItem.status === "queued");
  if (!nextQueueItem) {
    studioState.isRendering = false;
    renderExportQueue();
    showToastMessage("Tous les clips de la file sont prêts.");
    return;
  }
  studioState.isRendering = true;
  nextQueueItem.status = "rendering";
  nextQueueItem.progress = 0;
  renderExportQueue();
  const renderDurationMilliseconds = Math.max(1400, (nextQueueItem.end - nextQueueItem.start) * 60);
  const renderStartTime = performance.now();
  const advanceRender = (frameTime) => {
    nextQueueItem.progress = Math.min(((frameTime - renderStartTime) / renderDurationMilliseconds) * 100, 100);
    renderQueueItemProgress(nextQueueItem);
    if (nextQueueItem.progress < 100) {
      requestAnimationFrame(advanceRender);
      return;
    }
    nextQueueItem.status = "ready";
    persistStudioState();
    renderNextQueuedClip();
  };
  requestAnimationFrame(advanceRender);
}

/* Switches the studio to another VOD. */
function selectVod(vodId) {
  stopPreviewPlayback();
  studioState.selectedVodId = vodId;
  studioState.selectedHighlightId = null;
  renderVodTimeline();
  applyHighlightFilters();
  const firstVisibleHighlight = getSelectedVod().highlights.filter(isHighlightVisible).sort((firstEntry, secondEntry) => secondEntry.score - firstEntry.score)[0];
  selectHighlight(firstVisibleHighlight ? firstVisibleHighlight.id : null);
  persistStudioState();
}

/* Registers every studio event listener. */
function bindStudioEvents() {
  studioElements.vodSelect.addEventListener("change", () => selectVod(studioElements.vodSelect.value));
  document.addEventListener("click", (clickEvent) => {
    const highlightTrigger = clickEvent.target.closest("[data-highlight-id]");
    if (highlightTrigger) selectHighlight(highlightTrigger.dataset.highlightId);
    const removeTrigger = clickEvent.target.closest("[data-remove-queue-item]");
    if (removeTrigger) {
      studioState.exportQueue = studioState.exportQueue.filter((queueItem) => queueItem.queueId !== removeTrigger.dataset.removeQueueItem);
      persistStudioState();
      renderExportQueue();
    }
  });
  studioElements.filterChips.addEventListener("click", (clickEvent) => {
    const chipElement = clickEvent.target.closest("[data-filter-type]");
    if (!chipElement) return;
    const typeKey = chipElement.dataset.filterType;
    studioState.activeTypes = studioState.activeTypes.includes(typeKey) ? studioState.activeTypes.filter((activeType) => activeType !== typeKey) : [...studioState.activeTypes, typeKey];
    applyHighlightFilters();
  });
  studioElements.sensitivityInput.addEventListener("input", () => {
    const requestedScore = parseInt(studioElements.sensitivityInput.value, 10);
    if (!isValidMinimumScore(requestedScore)) return;
    studioState.minimumScore = requestedScore;
    applyHighlightFilters();
    persistStudioState();
  });
  studioElements.formatInputs.forEach((formatInputElement) => {
    formatInputElement.addEventListener("change", () => {
      if (!isKnownExportFormat(formatInputElement.value)) return;
      studioState.exportFormat = formatInputElement.value;
      studioElements.previewScreen.dataset.format = studioState.exportFormat;
      persistStudioState();
    });
  });
  studioElements.previewPlayButton.addEventListener("click", () => {
    if (studioState.isPreviewPlaying) stopPreviewPlayback();
    else startPreviewPlayback();
  });
  studioElements.resetTrimButton.addEventListener("click", () => {
    const selectedHighlight = getSelectedHighlight();
    if (!selectedHighlight) return;
    delete studioState.trimOverrides[getTrimKey(studioState.selectedVodId, selectedHighlight.id)];
    studioState.previewPositionSeconds = 0;
    renderTrimState();
    persistStudioState();
  });
  studioElements.addToQueueButton.addEventListener("click", addSelectedHighlightToQueue);
  studioElements.clearReadyButton.addEventListener("click", () => {
    studioState.exportQueue = studioState.exportQueue.filter((queueItem) => queueItem.status !== "ready");
    persistStudioState();
    renderExportQueue();
  });
  studioElements.startRenderButton.addEventListener("click", () => {
    if (!studioState.isRendering) renderNextQueuedClip();
  });
}

/* Boots the studio: restores state, renders the interface and binds events. */
function initializeStudio() {
  if (!document.querySelector("[data-vod-timeline]")) return;
  cacheStudioElements();
  restoreStudioState();
  renderVodOptions();
  renderFilterChips();
  bindStudioEvents();
  initializeTrimHandles();
  renderExportQueue();
  selectVod(studioState.selectedVodId);
}

document.addEventListener("DOMContentLoaded", initializeStudio);
