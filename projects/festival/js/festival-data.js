/* ==========================================================================
   Echoes Festival — line-up data, personal planning storage and artist modal
   ========================================================================== */

const PLANNING_STORAGE_KEY = "echoes.planning.v1";
const TIMETABLE_START_HOUR = 16;

const festivalDays = [
  { id: "vendredi", label: "Vendredi", fullLabel: "Vendredi 9 juillet", gatesOpen: "16:00" },
  { id: "samedi", label: "Samedi", fullLabel: "Samedi 10 juillet", gatesOpen: "15:30" },
  { id: "dimanche", label: "Dimanche", fullLabel: "Dimanche 11 juillet", gatesOpen: "15:30" }
];

const festivalStages = [
  { id: "soleil", label: "Scène Soleil", description: "Grande scène · 18 000 places", color: "var(--color-stage-soleil)" },
  { id: "hangar", label: "Le Hangar", description: "Club couvert · électro", color: "var(--color-stage-hangar)" },
  { id: "clairiere", label: "La Clairière", description: "Scène en forêt · indie", color: "var(--color-stage-clairiere)" }
];

const artistGradients = [
  "linear-gradient(150deg, #ffd23f 0%, #ff6a3d 100%)",
  "linear-gradient(150deg, #ff3d8b 0%, #7b3dff 100%)",
  "linear-gradient(150deg, #2de2c4 0%, #7b3dff 100%)",
  "linear-gradient(150deg, #ff6a3d 0%, #ff3d8b 100%)",
  "linear-gradient(150deg, #ffd23f 0%, #ff3d8b 100%)",
  "linear-gradient(150deg, #7b3dff 0%, #2de2c4 100%)"
];

const festivalArtists = [
  { id: "lumiere-noire", name: "Lumière Noire", genre: "Électro-pop", origin: "Paris", day: "vendredi", stage: "soleil", start: "23:00", end: "00:30", isHeadliner: true, bio: "Duo phare de l'électro-pop française, Lumière Noire revient avec « Zénith Intérieur », un troisième album tourné vers les synthés analogiques et les refrains taillés pour les foules. Leur show lumière, entièrement repensé pour l'été 2027, illumine la soirée d'ouverture." },
  { id: "les-rives", name: "Les Rives", genre: "Indie rock", origin: "Lyon", day: "vendredi", stage: "soleil", start: "20:30", end: "21:45", isHeadliner: false, bio: "Quatre amis de la Croix-Rousse, des guitares nerveuses et des textes en français qui parlent de trains de nuit et de fins d'été. Les Rives jouent à domicile et promettent quelques invités surprises." },
  { id: "mona-kestrel", name: "Mona Kestrel", genre: "Indie folk", origin: "Bruxelles", day: "vendredi", stage: "soleil", start: "18:30", end: "19:30", isHeadliner: false, bio: "Voix claire, guitare douze cordes et violoncelle : la Bruxelloise ouvre la grande scène avec les chansons lumineuses de son premier album, « Les Oiseaux de Mars »." },
  { id: "koma", name: "KOMA", genre: "Techno", origin: "Berlin", day: "vendredi", stage: "hangar", start: "00:30", end: "02:30", isHeadliner: true, bio: "Résident des clubs berlinois depuis dix ans, KOMA signe des sets hypnotiques et industriels qui montent lentement jusqu'à l'explosion. Deux heures de closing sous la charpente métallique du Hangar." },
  { id: "selva-disco", name: "Selva Disco", genre: "Nu-disco", origin: "Marseille", day: "vendredi", stage: "hangar", start: "22:00", end: "23:30", isHeadliner: false, bio: "Basses rondes, cuivres samplés et percussions tropicales : le collectif marseillais transforme chaque dancefloor en fête de quartier à minuit." },
  { id: "ondine-b", name: "Ondine B.", genre: "House", origin: "Lyon", day: "vendredi", stage: "hangar", start: "19:30", end: "21:00", isHeadliner: false, bio: "Figure montante de la scène lyonnaise et résidente d'un club des bords de Saône, Ondine B. mélange house de Chicago et voix soul pour lancer les nuits du Hangar." },
  { id: "paloma-grey", name: "Paloma Grey", genre: "Dream pop", origin: "Montréal", day: "vendredi", stage: "clairiere", start: "21:00", end: "22:00", isHeadliner: false, bio: "Guitares noyées de réverbération et voix aérienne : la Montréalaise offre un concert taillé pour le crépuscule sous les arbres de la Clairière." },
  { id: "atelier-nuit", name: "Atelier Nuit", genre: "Ambient live", origin: "Grenoble", day: "vendredi", stage: "clairiere", start: "17:30", end: "18:30", isHeadliner: false, bio: "Synthés modulaires et field recordings captés dans le Vercors : une heure de contemplation pour entrer doucement dans le festival." },
  { id: "neon-atlas", name: "Neon Atlas", genre: "Synthwave · électro", origin: "Lille", day: "samedi", stage: "soleil", start: "23:15", end: "00:45", isHeadliner: true, bio: "Avec plus de 400 millions d'écoutes, Neon Atlas a remis les synthés des années 80 au goût du jour. Leur tournée « Horizon » passe par Echoes pour l'unique date en Auvergne-Rhône-Alpes de l'été." },
  { id: "capitaine-echo", name: "Capitaine Écho", genre: "Rap · électro", origin: "Saint-Étienne", day: "samedi", stage: "soleil", start: "21:00", end: "22:15", isHeadliner: false, bio: "Flow rapide, productions électroniques massives et une énergie scénique déjà légendaire : le Stéphanois promet le pogo le plus grand de l'édition." },
  { id: "jeanne-orage", name: "Jeanne Orage", genre: "Indie pop", origin: "Nantes", day: "samedi", stage: "soleil", start: "18:45", end: "19:45", isHeadliner: false, bio: "Révélation de l'année aux Victoires, Jeanne Orage écrit des tubes doux-amers portés par une batterie électronique et des chœurs en cascade." },
  { id: "dalia-vox", name: "Dalia Vox", genre: "Techno mélodique", origin: "Amsterdam", day: "samedi", stage: "hangar", start: "01:00", end: "03:00", isHeadliner: true, bio: "Productrice et violoniste, Dalia Vox construit des sets où les cordes jouées en direct se fondent dans des montées techno vertigineuses. Le closing le plus attendu du samedi." },
  { id: "rouge-minuit", name: "Rouge Minuit", genre: "Électro-house", origin: "Toulouse", day: "samedi", stage: "hangar", start: "22:30", end: "00:00", isHeadliner: false, bio: "Duo toulousain aux remixes devenus viraux, Rouge Minuit joue une house rapide et lumineuse, parfaite pour la tombée de la nuit." },
  { id: "frequence-sud", name: "Fréquence Sud", genre: "Afro-house", origin: "Dakar · Lyon", day: "samedi", stage: "hangar", start: "20:00", end: "21:30", isHeadliner: false, bio: "Percussions live, kora et rythmiques house : le trio franco-sénégalais fait danser le Hangar dès l'ouverture des portes." },
  { id: "garcons-lune", name: "Les Garçons Lune", genre: "Indie folk", origin: "Rennes", day: "samedi", stage: "clairiere", start: "20:15", end: "21:15", isHeadliner: false, bio: "Harmonies vocales à trois, banjo et contrebasse : un concert intimiste et joyeux qui finit toujours en chorale avec le public." },
  { id: "saule", name: "Saule", genre: "Néo-soul", origin: "Bordeaux", day: "samedi", stage: "clairiere", start: "17:45", end: "18:45", isHeadliner: false, bio: "Voix chaude, Rhodes et section cuivres : Saule réinvente la soul des années 70 avec des textes intimes en français et en anglais." },
  { id: "polaris-club", name: "Polaris Club", genre: "Indie électro", origin: "Londres", day: "dimanche", stage: "soleil", start: "22:30", end: "00:00", isHeadliner: true, bio: "Guitares indie, batteries électroniques et refrains à reprendre en chœur : les Londoniens clôturent l'édition 2027 sur la Scène Soleil, avec un feu d'artifice musical en prime." },
  { id: "vague-rose", name: "Vague Rose", genre: "Shoegaze pop", origin: "Paris", day: "dimanche", stage: "soleil", start: "20:15", end: "21:30", isHeadliner: false, bio: "Murs de guitares saturées et mélodies sucrées : Vague Rose joue fort et beau, au moment exact où le soleil se couche sur l'étang." },
  { id: "ilian-sorel", name: "Ilian Sorel", genre: "Chanson électro", origin: "Lyon", day: "dimanche", stage: "soleil", start: "18:00", end: "19:00", isHeadliner: false, bio: "Auteur-compositeur lyonnais, Ilian Sorel mêle textes ciselés et beats minimalistes. Son premier album, « Presqu'île », sort au printemps 2027." },
  { id: "mirage-404", name: "Mirage 404", genre: "Breakbeat", origin: "Bristol", day: "dimanche", stage: "hangar", start: "23:30", end: "01:30", isHeadliner: true, bio: "Breakbeat, jungle et basses UK : Mirage 404 signe le dernier set du festival, réputé pour ses enchaînements imprévisibles et son énergie sans pause." },
  { id: "opaline", name: "Opaline", genre: "Deep house", origin: "Genève", day: "dimanche", stage: "hangar", start: "21:30", end: "23:00", isHeadliner: false, bio: "Grooves profonds et nappes chaleureuses : la DJ genevoise installe une transe douce idéale pour un dimanche soir." },
  { id: "tropique-brut", name: "Tropique Brut", genre: "Cumbia électro", origin: "Bogotá · Paris", day: "dimanche", stage: "hangar", start: "19:00", end: "20:30", isHeadliner: false, bio: "Accordéon, guiro et synthés acides : le collectif mélange cumbia colombienne et électro brute pour une fête sans frontières." },
  { id: "nora-valen", name: "Nora Valen", genre: "Néo-classique", origin: "Oslo", day: "dimanche", stage: "clairiere", start: "21:15", end: "22:15", isHeadliner: false, bio: "Piano préparé, cordes et électronique délicate : la pianiste norvégienne offre l'un des moments les plus suspendus du week-end." },
  { id: "grand-calme", name: "Le Grand Calme", genre: "Post-rock", origin: "Clermont-Ferrand", day: "dimanche", stage: "clairiere", start: "16:30", end: "17:30", isHeadliner: false, bio: "Longues montées instrumentales et explosions de guitares : un concert cathartique pour ouvrir le dernier jour en beauté." }
];

/* Converts an "HH:MM" set time into minutes after the timetable start. */
function getMinutesFromTimetableStart(timeLabel) {
  const [hourValue, minuteValue] = timeLabel.split(":").map(Number);
  const normalizedHour = hourValue < 12 ? hourValue + 24 : hourValue;
  return (normalizedHour - TIMETABLE_START_HOUR) * 60 + minuteValue;
}

/* Returns the artist object for an identifier. */
function getArtistById(artistId) {
  return festivalArtists.find((artistEntry) => artistEntry.id === artistId);
}

/* Returns the stage object for an identifier. */
function getStageById(stageId) {
  return festivalStages.find((stageEntry) => stageEntry.id === stageId);
}

/* Returns the day object for an identifier. */
function getDayById(dayId) {
  return festivalDays.find((dayEntry) => dayEntry.id === dayId);
}

/* Returns the initials displayed on generated artist artwork. */
function getArtistInitials(artistName) {
  return artistName.replace(/^(Les|Le|La)\s+/i, "").split(/\s+/).map((wordValue) => wordValue.charAt(0)).join("").slice(0, 2).toUpperCase();
}

/* Returns the inline style giving an artist its poster gradient. */
function getArtistArtStyle(artistEntry) {
  const artistIndex = festivalArtists.indexOf(artistEntry);
  return `--artist-gradient:${artistGradients[artistIndex % artistGradients.length]};--artist-orbit-top:${-40 + (artistIndex * 13) % 50}%`;
}

/* Returns the HTML of the generated poster artwork for an artist. */
function getArtistArtMarkup(artistEntry) {
  return `<span class="artist-art" style="${getArtistArtStyle(artistEntry)}" data-initials="${getArtistInitials(artistEntry.name)}" aria-hidden="true"></span>`;
}

/* Reads the saved favorite artist identifiers from localStorage. */
function readPlanning() {
  try {
    const storedPlanning = JSON.parse(localStorage.getItem(PLANNING_STORAGE_KEY) || "[]");
    return Array.isArray(storedPlanning) ? storedPlanning.filter((artistId) => getArtistById(artistId)) : [];
  } catch (storageError) {
    return [];
  }
}

/* Saves favorite artist identifiers and notifies listeners on the page. */
function writePlanning(planningArtistIds) {
  try {
    localStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(planningArtistIds));
  } catch (storageError) {
    console.warn("Planning could not be saved.", storageError);
  }
  document.dispatchEvent(new CustomEvent("planning:change", { detail: { planningArtistIds } }));
}

/* Returns true when an artist is part of the personal planning. */
function isArtistInPlanning(artistId) {
  return readPlanning().includes(artistId);
}

/* Adds or removes an artist from the personal planning. */
function toggleArtistInPlanning(artistId) {
  const planningArtistIds = readPlanning();
  const isAlreadyPlanned = planningArtistIds.includes(artistId);
  const updatedPlanning = isAlreadyPlanned ? planningArtistIds.filter((plannedId) => plannedId !== artistId) : [...planningArtistIds, artistId];
  writePlanning(updatedPlanning);
  const artistEntry = getArtistById(artistId);
  showToastMessage(isAlreadyPlanned ? `${artistEntry.name} retiré de votre planning` : `${artistEntry.name} ajouté à votre planning ★`);
  return !isAlreadyPlanned;
}

/* Fills and opens the shared artist modal. */
function openArtistModal(artistId) {
  const modalElement = document.querySelector("[data-artist-modal]");
  const artistEntry = getArtistById(artistId);
  if (!modalElement || !artistEntry) return;
  const stageEntry = getStageById(artistEntry.stage);
  const dayEntry = getDayById(artistEntry.day);
  modalElement.querySelector("[data-modal-art]").innerHTML = getArtistArtMarkup(artistEntry);
  modalElement.querySelector("[data-modal-name]").textContent = artistEntry.name;
  modalElement.querySelector("[data-modal-genre]").textContent = `${artistEntry.genre} · ${artistEntry.origin}`;
  modalElement.querySelector("[data-modal-bio]").textContent = artistEntry.bio;
  modalElement.querySelector("[data-modal-facts]").innerHTML = `
    <span class="modal-fact">${dayEntry.fullLabel}</span>
    <span class="modal-fact"><span class="pill-dot" style="background:${stageEntry.color}"></span>${stageEntry.label}</span>
    <span class="modal-fact">${artistEntry.start} – ${artistEntry.end}</span>`;
  const planningButtonElement = modalElement.querySelector("[data-modal-planning]");
  planningButtonElement.dataset.artistId = artistEntry.id;
  renderModalPlanningButton(planningButtonElement);
  openModal(modalElement);
}

/* Updates the label of the modal planning button for its artist. */
function renderModalPlanningButton(planningButtonElement) {
  const isPlanned = isArtistInPlanning(planningButtonElement.dataset.artistId);
  planningButtonElement.setAttribute("aria-pressed", String(isPlanned));
  planningButtonElement.textContent = isPlanned ? "★ Dans mon planning — retirer" : "☆ Ajouter à mon planning";
}

/* Wires the planning button inside the shared artist modal. */
function initializeArtistModal() {
  const planningButtonElement = document.querySelector("[data-modal-planning]");
  if (!planningButtonElement) return;
  planningButtonElement.addEventListener("click", () => {
    toggleArtistInPlanning(planningButtonElement.dataset.artistId);
    renderModalPlanningButton(planningButtonElement);
  });
  document.addEventListener("click", (clickEvent) => {
    const artistTriggerElement = clickEvent.target.closest("[data-open-artist]");
    if (artistTriggerElement) openArtistModal(artistTriggerElement.dataset.openArtist);
  });
}

document.addEventListener("DOMContentLoaded", initializeArtistModal);
