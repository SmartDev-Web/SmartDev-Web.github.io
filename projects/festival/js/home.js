/* ==========================================================================
   Echoes Festival — home page (countdown, marquee, headliners)
   ========================================================================== */

/* Splits a duration in milliseconds into days, hours, minutes and seconds. */
function getCountdownParts(remainingMilliseconds) {
  const totalSeconds = Math.max(0, Math.floor(remainingMilliseconds / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60
  };
}

/* Starts the live countdown to the festival opening. */
function initializeCountdown() {
  const countdownElement = document.querySelector("[data-countdown]");
  if (!countdownElement) return;
  const targetTimestamp = new Date(countdownElement.dataset.countdownTarget).getTime();
  const unitElements = countdownElement.querySelectorAll("[data-countdown-unit]");
  const renderCountdown = () => {
    const countdownParts = getCountdownParts(targetTimestamp - Date.now());
    unitElements.forEach((unitElement) => {
      const unitName = unitElement.dataset.countdownUnit;
      const formattedValue = String(countdownParts[unitName]).padStart(unitName === "days" ? 3 : 2, "0");
      if (unitElement.textContent === formattedValue) return;
      unitElement.textContent = formattedValue;
      unitElement.classList.remove("is-ticking");
      void unitElement.offsetWidth;
      unitElement.classList.add("is-ticking");
    });
    if (targetTimestamp - Date.now() <= 0) {
      countdownElement.setAttribute("aria-label", "Le festival a commencé");
      window.clearInterval(countdownIntervalId);
    }
  };
  const countdownIntervalId = window.setInterval(renderCountdown, 1000);
  renderCountdown();
}

/* Fills the scrolling marquee with every artist name, duplicated for a seamless loop. */
function initializeMarquee() {
  const marqueeTrackElement = document.querySelector("[data-marquee-track]");
  if (!marqueeTrackElement) return;
  const artistNamesMarkup = festivalArtists.map((artistEntry) => `<span>${artistEntry.name}</span>`).join("");
  marqueeTrackElement.innerHTML = artistNamesMarkup + artistNamesMarkup;
}

/* Renders the headliner cards from the line-up data. */
function renderHeadliners() {
  const headlinerGridElement = document.querySelector("[data-headliner-grid]");
  if (!headlinerGridElement) return;
  const headlinerArtists = festivalArtists.filter((artistEntry) => artistEntry.isHeadliner && artistEntry.stage === "soleil");
  headlinerGridElement.innerHTML = headlinerArtists.map((artistEntry) => {
    const dayEntry = getDayById(artistEntry.day);
    return `<button class="headliner-card" type="button" data-open-artist="${artistEntry.id}" aria-label="Voir la fiche de ${artistEntry.name}">
      ${getArtistArtMarkup(artistEntry)}
      <span class="headliner-day">${dayEntry.fullLabel}</span>
      <span class="headliner-name">${artistEntry.name}</span>
      <span class="headliner-meta">${artistEntry.genre} · ${artistEntry.origin} · ${artistEntry.start}</span>
    </button>`;
  }).join("");
}

/* Builds one day column of the printed-style line-up poster, headliners first. */
function createPosterDayElement(dayEntry) {
  const getPosterRank = (artistEntry) => (artistEntry.isHeadliner ? 1 : 0) + (artistEntry.isHeadliner && artistEntry.stage === "soleil" ? 1 : 0);
  const dayArtists = festivalArtists.filter((artistEntry) => artistEntry.day === dayEntry.id).sort((firstArtist, secondArtist) => getPosterRank(secondArtist) - getPosterRank(firstArtist) || getMinutesFromTimetableStart(secondArtist.start) - getMinutesFromTimetableStart(firstArtist.start));
  const dayColumnElement = document.createElement("div");
  dayColumnElement.className = "poster-day";
  const dayTitleElement = document.createElement("h3");
  dayTitleElement.className = "poster-day-title";
  dayTitleElement.textContent = dayEntry.fullLabel;
  const artistListElement = document.createElement("ul");
  artistListElement.className = "poster-artist-list";
  dayArtists.forEach((artistEntry) => {
    const artistItemElement = document.createElement("li");
    const artistButtonElement = document.createElement("button");
    artistButtonElement.type = "button";
    artistButtonElement.className = artistEntry.isHeadliner ? "poster-artist is-headliner" : "poster-artist";
    artistButtonElement.dataset.openArtist = artistEntry.id;
    artistButtonElement.textContent = artistEntry.name;
    artistItemElement.appendChild(artistButtonElement);
    artistListElement.appendChild(artistItemElement);
  });
  dayColumnElement.append(dayTitleElement, artistListElement);
  return dayColumnElement;
}

/* Renders the full line-up as a festival poster, one column per day. */
function renderLineupPoster() {
  const lineupPosterElement = document.querySelector("[data-lineup-poster]");
  if (!lineupPosterElement) return;
  lineupPosterElement.replaceChildren(...festivalDays.map(createPosterDayElement));
}

document.addEventListener("DOMContentLoaded", () => {
  initializeCountdown();
  initializeMarquee();
  renderHeadliners();
  renderLineupPoster();
});
