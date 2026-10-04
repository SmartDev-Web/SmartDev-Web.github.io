/* ==========================================================================
   Echoes Festival — filterable artist grid
   ========================================================================== */

const lineupFilterState = { day: "all", stage: "all" };

/* Returns the artists matching the active day and stage filters. */
function getFilteredArtists() {
  return festivalArtists.filter((artistEntry) => {
    const matchesDay = lineupFilterState.day === "all" || artistEntry.day === lineupFilterState.day;
    const matchesStage = lineupFilterState.stage === "all" || artistEntry.stage === lineupFilterState.stage;
    return matchesDay && matchesStage;
  }).sort((firstArtist, secondArtist) => Number(secondArtist.isHeadliner) - Number(firstArtist.isHeadliner));
}

/* Renders the artist grid and the result counter. */
function renderArtistGrid() {
  const artistGridElement = document.querySelector("[data-artist-grid]");
  const resultCountElement = document.querySelector("[data-result-count]");
  const filteredArtists = getFilteredArtists();
  const planningArtistIds = readPlanning();
  resultCountElement.textContent = filteredArtists.length + (filteredArtists.length > 1 ? " artistes" : " artiste");
  if (!filteredArtists.length) {
    artistGridElement.innerHTML = '<p class="empty-state">Aucun artiste ne correspond à ces filtres.</p>';
    return;
  }
  artistGridElement.innerHTML = filteredArtists.map((artistEntry, artistIndex) => {
    const dayEntry = getDayById(artistEntry.day);
    const stageEntry = getStageById(artistEntry.stage);
    const isPlanned = planningArtistIds.includes(artistEntry.id);
    return `<button class="artist-card" type="button" style="animation-delay:${artistIndex * 40}ms" data-open-artist="${artistEntry.id}" aria-label="${artistEntry.name}, ${artistEntry.genre}, ${dayEntry.label} sur ${stageEntry.label}${isPlanned ? ", dans votre planning" : ""}">
      ${getArtistArtMarkup(artistEntry)}
      ${artistEntry.isHeadliner ? '<span class="artist-card-badge">Tête d\'affiche</span>' : ""}
      ${isPlanned ? '<span class="artist-card-star" aria-hidden="true">★</span>' : ""}
      <span class="artist-card-name">${artistEntry.name}</span>
      <span class="artist-card-meta">${artistEntry.genre}<br>${dayEntry.label} · ${stageEntry.label}</span>
    </button>`;
  }).join("");
}

/* Wires the day and stage filter buttons. */
function initializeLineupFilters() {
  document.querySelectorAll("[data-filter-group]").forEach((filterGroupElement) => {
    const filterName = filterGroupElement.dataset.filterGroup;
    filterGroupElement.addEventListener("click", (clickEvent) => {
      const filterButtonElement = clickEvent.target.closest("[data-filter-value]");
      if (!filterButtonElement) return;
      lineupFilterState[filterName] = filterButtonElement.dataset.filterValue;
      filterGroupElement.querySelectorAll("[data-filter-value]").forEach((buttonElement) => {
        buttonElement.setAttribute("aria-pressed", String(buttonElement === filterButtonElement));
      });
      renderArtistGrid();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector("[data-artist-grid]")) return;
  initializeLineupFilters();
  renderArtistGrid();
  document.addEventListener("planning:change", renderArtistGrid);
});
