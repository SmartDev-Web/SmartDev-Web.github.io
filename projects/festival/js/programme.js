/* ==========================================================================
   Echoes Festival — timetable per day and personal planning view
   ========================================================================== */

const TIMETABLE_HOUR_COUNT = 12;
const programmeState = { selectedDayId: festivalDays[0].id, activeView: "grid" };

const starIconMarkup = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.8l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 17l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.7z"/></svg>';
const starOutlineIconMarkup = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.8l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 17l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.7z"/></svg>';

/* Formats an "HH:MM" time label in French style (e.g. 23 h 15). */
function formatFrenchTime(timeLabel) {
  const [hourValue, minuteValue] = timeLabel.split(":");
  return `${parseInt(hourValue, 10)} h ${minuteValue === "00" ? "" : minuteValue}`.trim();
}

/* Renders the day selector buttons. */
function renderDayTabs() {
  const dayTabsElement = document.querySelector("[data-day-tabs]");
  dayTabsElement.innerHTML = festivalDays.map((dayEntry) => `
    <button class="pill-button" type="button" role="tab" aria-selected="${dayEntry.id === programmeState.selectedDayId}" tabindex="${dayEntry.id === programmeState.selectedDayId ? 0 : -1}" data-day-tab="${dayEntry.id}">${dayEntry.fullLabel}</button>`).join("");
  dayTabsElement.hidden = programmeState.activeView !== "grid";
}

/* Renders the timetable grid of the selected day. */
function renderTimetable() {
  const timetableElement = document.querySelector("[data-timetable]");
  const planningArtistIds = readPlanning();
  const hourHeight = 96;
  const headMarkup = '<div class="timetable-head" aria-hidden="true"></div>' + festivalStages.map((stageEntry) => `
    <div class="timetable-head"><span class="stage-swatch" style="background:${stageEntry.color}"></span>${stageEntry.label}<small>${stageEntry.description}</small></div>`).join("");
  const hourLabelsMarkup = Array.from({ length: TIMETABLE_HOUR_COUNT }, (unusedValue, hourOffset) => {
    const hourValue = (TIMETABLE_START_HOUR + hourOffset) % 24;
    return `<span class="timetable-hour-label" style="top:${hourOffset * hourHeight}px">${String(hourValue).padStart(2, "0")}:00</span>`;
  }).join("");
  const columnsMarkup = festivalStages.map((stageEntry) => {
    const stageSets = festivalArtists.filter((artistEntry) => artistEntry.day === programmeState.selectedDayId && artistEntry.stage === stageEntry.id);
    const setsMarkup = stageSets.map((artistEntry) => {
      const startMinutes = getMinutesFromTimetableStart(artistEntry.start);
      const endMinutes = getMinutesFromTimetableStart(artistEntry.end);
      const isPlanned = planningArtistIds.includes(artistEntry.id);
      return `<div class="set-block${isPlanned ? " is-favorite" : ""}" style="--stage-color:${stageEntry.color};top:${(startMinutes / 60) * hourHeight}px;height:${((endMinutes - startMinutes) / 60) * hourHeight - 4}px">
        <button class="set-block-open" type="button" data-open-artist="${artistEntry.id}">
          <span class="set-block-name">${artistEntry.name}</span>
          <span class="set-block-time">${artistEntry.start} – ${artistEntry.end} · ${artistEntry.genre}</span>
        </button>
        <button class="favorite-toggle" type="button" aria-pressed="${isPlanned}" aria-label="${isPlanned ? "Retirer" : "Ajouter"} ${artistEntry.name} ${isPlanned ? "de" : "à"} mon planning" data-toggle-favorite="${artistEntry.id}">${isPlanned ? starIconMarkup : starOutlineIconMarkup}</button>
      </div>`;
    }).join("");
    return `<div class="timetable-column" role="group" aria-label="${stageEntry.label}">${setsMarkup}</div>`;
  }).join("");
  timetableElement.style.setProperty("--hour-count", String(TIMETABLE_HOUR_COUNT));
  timetableElement.style.setProperty("--hour-height", hourHeight + "px");
  timetableElement.innerHTML = headMarkup + `<div class="timetable-hours">${hourLabelsMarkup}</div>` + columnsMarkup;
}

/* Returns the planned artists of a day sorted by start time, flagged when they overlap. */
function getPlannedSetsForDay(dayId, planningArtistIds) {
  const plannedSets = festivalArtists.filter((artistEntry) => artistEntry.day === dayId && planningArtistIds.includes(artistEntry.id)).sort((firstArtist, secondArtist) => getMinutesFromTimetableStart(firstArtist.start) - getMinutesFromTimetableStart(secondArtist.start));
  return plannedSets.map((artistEntry) => {
    const conflictingArtists = plannedSets.filter((otherArtist) => otherArtist !== artistEntry && getMinutesFromTimetableStart(otherArtist.start) < getMinutesFromTimetableStart(artistEntry.end) && getMinutesFromTimetableStart(artistEntry.start) < getMinutesFromTimetableStart(otherArtist.end));
    return { artistEntry, conflictingArtists };
  });
}

/* Renders the personal planning view grouped by day. */
function renderPlanningView() {
  const planningListElement = document.querySelector("[data-planning-list]");
  const planningSummaryElement = document.querySelector("[data-planning-summary]");
  const planningArtistIds = readPlanning();
  document.querySelector("[data-favorite-count]").textContent = String(planningArtistIds.length);
  document.querySelector("[data-clear-planning]").disabled = planningArtistIds.length === 0;
  document.querySelector("[data-copy-planning]").disabled = planningArtistIds.length === 0;
  if (!planningArtistIds.length) {
    planningSummaryElement.textContent = "";
    planningListElement.innerHTML = '<p class="empty-state">Votre planning est vide pour l\'instant. Passez sur la grille horaire et touchez l\'étoile ☆ des concerts qui vous font envie.</p>';
    return;
  }
  let conflictCount = 0;
  planningListElement.innerHTML = festivalDays.map((dayEntry) => {
    const plannedSets = getPlannedSetsForDay(dayEntry.id, planningArtistIds);
    if (!plannedSets.length) return "";
    const itemsMarkup = plannedSets.map(({ artistEntry, conflictingArtists }) => {
      const stageEntry = getStageById(artistEntry.stage);
      if (conflictingArtists.length) conflictCount += 1;
      return `<li class="planning-item" style="--stage-color:${stageEntry.color}">
        <span class="planning-item-time">${formatFrenchTime(artistEntry.start)} → ${formatFrenchTime(artistEntry.end)}</span>
        <div>
          <span class="planning-item-name">${artistEntry.name}</span>
          <span class="planning-item-stage">${stageEntry.label} · ${artistEntry.genre}</span>
          ${conflictingArtists.length ? `<span class="planning-conflict">⚠ Chevauche ${conflictingArtists.map((otherArtist) => otherArtist.name).join(", ")}</span>` : ""}
        </div>
        <button class="planning-remove" type="button" data-toggle-favorite="${artistEntry.id}" aria-label="Retirer ${artistEntry.name} de mon planning">Retirer</button>
      </li>`;
    }).join("");
    return `<div class="planning-day"><h2>${dayEntry.fullLabel}<small>${plannedSets.length} concert${plannedSets.length > 1 ? "s" : ""}</small></h2><ul class="planning-list">${itemsMarkup}</ul></div>`;
  }).join("");
  planningSummaryElement.textContent = `${planningArtistIds.length} concert${planningArtistIds.length > 1 ? "s" : ""} au programme` + (conflictCount ? ` · ${conflictCount} créneau(x) en conflit` : " · aucun chevauchement");
}

/* Builds a plain-text version of the planning for sharing. */
function getPlanningAsText() {
  const planningArtistIds = readPlanning();
  return "Mon planning Echoes Festival 2027\n" + festivalDays.map((dayEntry) => {
    const plannedSets = getPlannedSetsForDay(dayEntry.id, planningArtistIds);
    if (!plannedSets.length) return "";
    return `\n${dayEntry.fullLabel}\n` + plannedSets.map(({ artistEntry }) => `- ${artistEntry.start} ${artistEntry.name} (${getStageById(artistEntry.stage).label})`).join("\n");
  }).join("");
}

/* Shows the grid or planning view and syncs the URL hash. */
function setProgrammeView(viewName) {
  programmeState.activeView = viewName;
  document.querySelectorAll("[data-view-tab]").forEach((viewTabElement) => {
    const isSelected = viewTabElement.dataset.viewTab === viewName;
    viewTabElement.setAttribute("aria-selected", String(isSelected));
    viewTabElement.tabIndex = isSelected ? 0 : -1;
  });
  document.querySelectorAll("[data-view-panel]").forEach((viewPanelElement) => {
    viewPanelElement.hidden = viewPanelElement.dataset.viewPanel !== viewName;
  });
  document.querySelector("[data-day-tabs]").hidden = viewName !== "grid";
  history.replaceState(null, "", viewName === "planning" ? "#mon-planning" : window.location.pathname);
}

/* Re-renders every planning-dependent part of the page. */
function renderProgramme() {
  renderDayTabs();
  renderTimetable();
  renderPlanningView();
}

/* Registers click and keyboard interactions of the programme page. */
function bindProgrammeEvents() {
  document.addEventListener("click", (clickEvent) => {
    const favoriteToggleElement = clickEvent.target.closest("[data-toggle-favorite]");
    if (favoriteToggleElement) toggleArtistInPlanning(favoriteToggleElement.dataset.toggleFavorite);
    const dayTabElement = clickEvent.target.closest("[data-day-tab]");
    if (dayTabElement) {
      programmeState.selectedDayId = dayTabElement.dataset.dayTab;
      renderDayTabs();
      renderTimetable();
      document.querySelector(`[data-day-tab="${programmeState.selectedDayId}"]`).focus();
    }
    const viewTabElement = clickEvent.target.closest("[data-view-tab]");
    if (viewTabElement) setProgrammeView(viewTabElement.dataset.viewTab);
  });
  document.querySelector("[data-clear-planning]").addEventListener("click", () => {
    writePlanning([]);
    showToastMessage("Votre planning a été vidé");
  });
  document.querySelector("[data-copy-planning]").addEventListener("click", () => {
    if (!navigator.clipboard) {
      showToastMessage("Copie indisponible sur ce navigateur");
      return;
    }
    navigator.clipboard.writeText(getPlanningAsText()).then(() => showToastMessage("Planning copié, prêt à partager !"), () => showToastMessage("Impossible de copier le planning"));
  });
  document.addEventListener("planning:change", () => {
    renderTimetable();
    renderPlanningView();
  });
  window.addEventListener("hashchange", () => setProgrammeView(window.location.hash === "#mon-planning" ? "planning" : "grid"));
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector("[data-timetable]")) return;
  bindProgrammeEvents();
  renderProgramme();
  setProgrammeView(window.location.hash === "#mon-planning" ? "planning" : "grid");
});
