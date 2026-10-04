/* ==========================================================================
   IronPulse — weekly class schedule
   Renders the schedule grid, applies filters, handles bookings persisted
   in localStorage and the "Mes réservations" drawer
   ========================================================================== */

const BOOKINGS_STORAGE_KEY = "ironpulse-class-bookings";
const MAXIMUM_SIMULTANEOUS_BOOKINGS = 6;
const WEEK_DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const INTENSITY_LABELS = { 1: "Douce", 2: "Modérée", 3: "Intense" };

const CLASS_TYPE_DEFINITIONS = {
  cross: { label: "Cross-training", color: "#d4ff2e", description: "WOD chronométré mêlant haltérophilie, gymnastique et conditionnement métabolique." },
  hiit: { label: "HIIT", color: "#ff3d3d", description: "Fractionné haute intensité avec cardiofréquencemètre : 40 secondes d'effort, 20 secondes de récupération." },
  boxe: { label: "Boxe", color: "#ffb02e", description: "Technique, travail aux paos et au sac lourd. Gants et bandes disponibles à l'accueil." },
  cycling: { label: "Cycling", color: "#4fc3ff", description: "Ride immersif en musique dans le studio lumière, résistance ajustée à votre niveau." },
  yoga: { label: "Yoga", color: "#b98cff", description: "Postures, respiration et mobilité pour gagner en souplesse et accélérer la récupération." },
  force: { label: "Force", color: "#3ddc84", description: "Musculation guidée en petit groupe : technique des mouvements fondamentaux et progression de charge." }
};

/* Weekly timetable: [day index, start time, duration, type, name, coach, intensity, capacity, places already taken, room] */
const WEEKLY_CLASS_ROWS = [
  [0, "07:00", 45, "hiit", "HIIT Express", "Karim B.", 3, 20, 14, "Studio Rouge"],
  [0, "12:15", 45, "cycling", "Ride 45", "Léa F.", 2, 32, 27, "Studio Lumière"],
  [0, "18:30", 55, "cross", "WOD Performance", "Hugo M.", 3, 14, 13, "La Box"],
  [0, "19:30", 60, "boxe", "Boxe anglaise", "Mehdi A.", 2, 16, 9, "Le Ring"],
  [0, "20:30", 60, "yoga", "Vinyasa Flow", "Inès L.", 1, 22, 12, "Studio Zen"],
  [1, "07:00", 55, "force", "Force Fondamentaux", "Antoine R.", 2, 10, 4, "Plateau"],
  [1, "12:15", 45, "hiit", "Tabata Burn", "Karim B.", 3, 20, 20, "Studio Rouge"],
  [1, "18:00", 60, "yoga", "Yoga Mobilité", "Inès L.", 1, 22, 16, "Studio Zen"],
  [1, "19:00", 45, "cycling", "Rhythm Ride", "Léa F.", 2, 32, 30, "Studio Lumière"],
  [1, "20:00", 55, "cross", "WOD Débutant", "Chloé P.", 2, 14, 7, "La Box"],
  [2, "07:00", 55, "cross", "WOD Morning", "Hugo M.", 3, 14, 8, "La Box"],
  [2, "12:15", 60, "yoga", "Yoga Express", "Manon G.", 1, 22, 10, "Studio Zen"],
  [2, "18:00", 60, "boxe", "Kick-boxing", "Mehdi A.", 3, 16, 15, "Le Ring"],
  [2, "19:00", 45, "hiit", "HIIT Cardio Max", "Sarah K.", 3, 20, 17, "Studio Rouge"],
  [2, "20:00", 55, "force", "Power Lifting", "Antoine R.", 3, 10, 9, "Plateau"],
  [3, "07:00", 45, "cycling", "Sunrise Ride", "Léa F.", 2, 32, 18, "Studio Lumière"],
  [3, "12:15", 55, "cross", "WOD Lunch", "Chloé P.", 3, 14, 11, "La Box"],
  [3, "18:30", 60, "boxe", "Cardio Boxing", "Mehdi A.", 2, 16, 12, "Le Ring"],
  [3, "19:30", 60, "yoga", "Yin Yoga", "Inès L.", 1, 22, 21, "Studio Zen"],
  [3, "20:30", 45, "hiit", "HIIT Abdos", "Karim B.", 2, 20, 6, "Studio Rouge"],
  [4, "07:00", 55, "force", "Force Haut du corps", "Antoine R.", 2, 10, 5, "Plateau"],
  [4, "12:15", 45, "cycling", "Ride 45", "Julien T.", 2, 32, 24, "Studio Lumière"],
  [4, "18:00", 55, "cross", "Friday WOD", "Hugo M.", 3, 14, 14, "La Box"],
  [4, "19:00", 45, "hiit", "HIIT Friday Fever", "Sarah K.", 3, 20, 19, "Studio Rouge"],
  [5, "09:00", 60, "yoga", "Vinyasa Matinal", "Manon G.", 1, 22, 15, "Studio Zen"],
  [5, "10:00", 55, "cross", "Team WOD", "Chloé P.", 3, 14, 10, "La Box"],
  [5, "11:00", 60, "boxe", "Boxe Tous niveaux", "Mehdi A.", 2, 16, 8, "Le Ring"],
  [5, "14:00", 45, "cycling", "Cycling Party", "Julien T.", 2, 32, 22, "Studio Lumière"],
  [6, "10:00", 55, "force", "Force & Technique", "Antoine R.", 2, 10, 3, "Plateau"],
  [6, "11:00", 60, "yoga", "Yoga Récupération", "Inès L.", 1, 22, 18, "Studio Zen"],
  [6, "17:00", 45, "hiit", "Sunday Sweat", "Karim B.", 2, 20, 11, "Studio Rouge"]
];

const weeklyClasses = WEEKLY_CLASS_ROWS.map((classRow, classIndex) => {
  const [dayIndex, startTime, durationMinutes, classType, className, coachName, intensityLevel, capacity, takenPlaces, roomName] = classRow;
  return { id: `cours-${dayIndex}-${startTime.replace(":", "")}-${classIndex}`, dayIndex, startTime, durationMinutes, classType, className, coachName, intensityLevel, capacity, takenPlaces, roomName };
});

const planningState = { activeTypeFilter: "all", activeIntensityFilter: "all", bookedClassIds: loadBookedClassIds(), selectedClassId: null };

/* Reads the booked class identifiers from localStorage, ignoring unknown entries */
function loadBookedClassIds() {
  try {
    const storedValue = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY) || "[]");
    const knownClassIds = new Set(WEEKLY_CLASS_ROWS.map((classRow, classIndex) => `cours-${classRow[0]}-${classRow[1].replace(":", "")}-${classIndex}`));
    return Array.isArray(storedValue) ? storedValue.filter((classId) => knownClassIds.has(classId)) : [];
  } catch (storageError) {
    return [];
  }
}

/* Persists the booked class identifiers */
function saveBookedClassIds() {
  try {
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(planningState.bookedClassIds));
  } catch (storageError) {
    showToastMessage("Impossible d'enregistrer la réservation sur cet appareil.");
  }
}

function findClassById(classId) {
  return weeklyClasses.find((weeklyClass) => weeklyClass.id === classId);
}

function isClassBooked(classId) {
  return planningState.bookedClassIds.includes(classId);
}

/* Remaining places take the member's own booking into account */
function getRemainingPlaces(weeklyClass) {
  return Math.max(weeklyClass.capacity - weeklyClass.takenPlaces - (isClassBooked(weeklyClass.id) ? 1 : 0), 0);
}

function computeEndTime(startTime, durationMinutes) {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const totalMinutes = startHours * 60 + startMinutes + durationMinutes;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

function formatTimeLabel(timeValue) {
  return timeValue.replace(":", "h");
}

function buildIntensityMeterMarkup(intensityLevel) {
  const meterBars = [1, 2, 3].map((barLevel) => `<span class="intensity-meter__bar${barLevel <= intensityLevel ? " is-active" : ""}"></span>`).join("");
  return `<span class="intensity-meter" aria-label="Intensité ${INTENSITY_LABELS[intensityLevel].toLowerCase()}">${meterBars}</span>`;
}

function describeRemainingPlaces(remainingPlaces) {
  if (remainingPlaces === 0) return { text: "Complet", modifier: "none" };
  if (remainingPlaces <= 3) return { text: `${remainingPlaces} place${remainingPlaces > 1 ? "s" : ""} !`, modifier: "low" };
  return { text: `${remainingPlaces} places`, modifier: "" };
}

function matchesActiveFilters(weeklyClass) {
  const matchesType = planningState.activeTypeFilter === "all" || weeklyClass.classType === planningState.activeTypeFilter;
  const matchesIntensity = planningState.activeIntensityFilter === "all" || String(weeklyClass.intensityLevel) === planningState.activeIntensityFilter;
  return matchesType && matchesIntensity;
}

/* Returns the Monday-based index of the current day */
function getTodayDayIndex() {
  return (new Date().getDay() + 6) % 7;
}

/* Writes the current week date range into the toolbar title */
function renderWeekLabel() {
  const weekLabelElement = document.querySelector("[data-week-label]");
  const todayDate = new Date();
  const mondayDate = new Date(todayDate);
  mondayDate.setDate(todayDate.getDate() - getTodayDayIndex());
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(mondayDate.getDate() + 6);
  const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
  weekLabelElement.textContent = `Semaine du ${dateFormatter.format(mondayDate)} au ${dateFormatter.format(sundayDate)}`;
}

/* Renders the full schedule grid from the current state */
function renderScheduleGrid() {
  const scheduleGridElement = document.querySelector("[data-schedule-grid]");
  const todayDayIndex = getTodayDayIndex();
  let visibleClassCount = 0;
  scheduleGridElement.innerHTML = WEEK_DAY_NAMES.map((dayName, dayIndex) => {
    const dayClasses = weeklyClasses.filter((weeklyClass) => weeklyClass.dayIndex === dayIndex && matchesActiveFilters(weeklyClass));
    visibleClassCount += dayClasses.length;
    const classSlotsMarkup = dayClasses.map((weeklyClass, slotPosition) => {
      const remainingPlaces = getRemainingPlaces(weeklyClass);
      const placesDescription = describeRemainingPlaces(remainingPlaces);
      const typeDefinition = CLASS_TYPE_DEFINITIONS[weeklyClass.classType];
      const isBooked = isClassBooked(weeklyClass.id);
      const slotClassNames = ["class-slot", isBooked ? "is-booked" : "", remainingPlaces === 0 && !isBooked ? "is-full" : ""].join(" ").trim();
      const bookedBadgeMarkup = isBooked ? `<span class="class-slot__badge" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></span>` : "";
      return `<button type="button" class="${slotClassNames}" style="--slot-color:${typeDefinition.color};animation-delay:${slotPosition * 60}ms" data-class-id="${weeklyClass.id}" aria-label="${weeklyClass.className}, ${dayName} ${formatTimeLabel(weeklyClass.startTime)}, ${placesDescription.text}${isBooked ? ", réservé" : ""}">
        ${bookedBadgeMarkup}
        <span class="class-slot__time">${formatTimeLabel(weeklyClass.startTime)} – ${formatTimeLabel(computeEndTime(weeklyClass.startTime, weeklyClass.durationMinutes))}</span>
        <span class="class-slot__name">${weeklyClass.className}</span>
        <span class="class-slot__coach">${weeklyClass.coachName}</span>
        <span class="class-slot__footer">${buildIntensityMeterMarkup(weeklyClass.intensityLevel)}<span class="class-slot__spots${placesDescription.modifier ? ` class-slot__spots--${placesDescription.modifier}` : ""}">${isBooked ? "Réservé" : placesDescription.text}</span></span>
      </button>`;
    }).join("");
    return `<div class="schedule-day">
      <div class="schedule-day__header${dayIndex === todayDayIndex ? " is-today" : ""}">${dayName}</div>
      ${classSlotsMarkup || '<div class="schedule-day__empty">Aucun cours</div>'}
    </div>`;
  }).join("");
  document.querySelector("[data-visible-count]").textContent = `${visibleClassCount} cours affiché${visibleClassCount > 1 ? "s" : ""}`;
}

/* Fills the class detail dialog for the selected class */
function renderClassDialog() {
  const selectedClass = findClassById(planningState.selectedClassId);
  if (!selectedClass) return;
  const classDialogElement = document.querySelector("[data-class-dialog]");
  const typeDefinition = CLASS_TYPE_DEFINITIONS[selectedClass.classType];
  const remainingPlaces = getRemainingPlaces(selectedClass);
  const isBooked = isClassBooked(selectedClass.id);
  const dialogActionButton = classDialogElement.querySelector("[data-dialog-action]");
  classDialogElement.querySelector("[data-dialog-type]").textContent = `${typeDefinition.label} · ${INTENSITY_LABELS[selectedClass.intensityLevel]}`;
  classDialogElement.querySelector("[data-dialog-title]").textContent = selectedClass.className;
  classDialogElement.querySelector("[data-dialog-description]").textContent = typeDefinition.description;
  classDialogElement.querySelector("[data-dialog-day]").textContent = WEEK_DAY_NAMES[selectedClass.dayIndex];
  classDialogElement.querySelector("[data-dialog-time]").textContent = `${formatTimeLabel(selectedClass.startTime)} · ${selectedClass.durationMinutes} min`;
  classDialogElement.querySelector("[data-dialog-coach]").textContent = selectedClass.coachName;
  classDialogElement.querySelector("[data-dialog-room]").textContent = selectedClass.roomName;
  classDialogElement.querySelector("[data-dialog-spots]").textContent = `${remainingPlaces} / ${selectedClass.capacity}`;
  classDialogElement.querySelector("[data-dialog-progress]").style.width = `${((selectedClass.capacity - remainingPlaces) / selectedClass.capacity) * 100}%`;
  dialogActionButton.disabled = !isBooked && remainingPlaces === 0;
  dialogActionButton.classList.toggle("button--danger", isBooked);
  dialogActionButton.textContent = isBooked ? "Annuler ma réservation" : remainingPlaces === 0 ? "Cours complet" : "Réserver ma place";
}

/* Renders the list inside the bookings drawer and the header counter */
function renderBookingsPanel() {
  const bookingListElement = document.querySelector("[data-booking-list]");
  const bookedClasses = planningState.bookedClassIds.map(findClassById).filter(Boolean).sort((firstClass, secondClass) => firstClass.dayIndex - secondClass.dayIndex || firstClass.startTime.localeCompare(secondClass.startTime));
  document.querySelector("[data-booking-count]").textContent = bookedClasses.length;
  if (!bookedClasses.length) {
    bookingListElement.innerHTML = `<li class="booking-empty">Aucune réservation pour le moment.<br>Choisissez un cours dans le planning pour réserver votre place.</li>`;
    return;
  }
  bookingListElement.innerHTML = bookedClasses.map((bookedClass) => `<li class="booking-item" style="--slot-color:${CLASS_TYPE_DEFINITIONS[bookedClass.classType].color}">
    <div>
      <span class="booking-item__name">${bookedClass.className}</span>
      <span class="booking-item__meta">${WEEK_DAY_NAMES[bookedClass.dayIndex]} · ${formatTimeLabel(bookedClass.startTime)} · ${bookedClass.coachName}</span>
    </div>
    <button class="button button--ghost button--small" type="button" data-cancel-booking="${bookedClass.id}" aria-label="Annuler ${bookedClass.className} du ${WEEK_DAY_NAMES[bookedClass.dayIndex]}">Annuler</button>
  </li>`).join("");
}

/* Single entry point that refreshes every view depending on bookings */
function renderPlanningViews() {
  renderScheduleGrid();
  renderBookingsPanel();
  renderClassDialog();
}

/* Books or cancels a class, persists the change and refreshes the views */
function toggleClassBooking(classId) {
  const targetClass = findClassById(classId);
  if (!targetClass) return;
  if (isClassBooked(classId)) {
    planningState.bookedClassIds = planningState.bookedClassIds.filter((bookedClassId) => bookedClassId !== classId);
    showToastMessage(`Réservation annulée : ${targetClass.className}`);
  } else if (getRemainingPlaces(targetClass) === 0) {
    showToastMessage("Ce cours est complet.");
    return;
  } else if (planningState.bookedClassIds.length >= MAXIMUM_SIMULTANEOUS_BOOKINGS) {
    showToastMessage(`Limite de ${MAXIMUM_SIMULTANEOUS_BOOKINGS} réservations simultanées atteinte.`);
    return;
  } else {
    planningState.bookedClassIds = [...planningState.bookedClassIds, classId];
    showToastMessage(`Place réservée : ${targetClass.className}, ${WEEK_DAY_NAMES[targetClass.dayIndex].toLowerCase()} à ${formatTimeLabel(targetClass.startTime)}`);
  }
  saveBookedClassIds();
  renderPlanningViews();
}

/* Updates pressed states of the type chips */
function updateTypeFilterButtons() {
  document.querySelectorAll("[data-type-filter]").forEach((filterButtonElement) => {
    filterButtonElement.setAttribute("aria-pressed", String(filterButtonElement.dataset.typeFilter === planningState.activeTypeFilter));
  });
}

/* Connects filters, slots, dialogs and cancellation buttons */
function initializePlanningInteractions() {
  const classDialogElement = document.querySelector("[data-class-dialog]");
  const bookingsDialogElement = document.querySelector("[data-bookings-dialog]");
  document.querySelector("[data-type-filter-group]").addEventListener("click", (clickEvent) => {
    const filterButtonElement = clickEvent.target.closest("[data-type-filter]");
    if (!filterButtonElement) return;
    planningState.activeTypeFilter = filterButtonElement.dataset.typeFilter;
    updateTypeFilterButtons();
    renderScheduleGrid();
  });
  document.querySelector("[data-intensity-filter]").addEventListener("change", (changeEvent) => {
    planningState.activeIntensityFilter = changeEvent.target.value;
    renderScheduleGrid();
  });
  document.querySelector("[data-schedule-grid]").addEventListener("click", (clickEvent) => {
    const classSlotElement = clickEvent.target.closest("[data-class-id]");
    if (!classSlotElement) return;
    planningState.selectedClassId = classSlotElement.dataset.classId;
    renderClassDialog();
    classDialogElement.showModal();
  });
  classDialogElement.querySelector("[data-dialog-action]").addEventListener("click", () => toggleClassBooking(planningState.selectedClassId));
  document.querySelector("[data-open-bookings]").addEventListener("click", () => bookingsDialogElement.showModal());
  document.querySelector("[data-booking-list]").addEventListener("click", (clickEvent) => {
    const cancelButtonElement = clickEvent.target.closest("[data-cancel-booking]");
    if (cancelButtonElement) toggleClassBooking(cancelButtonElement.dataset.cancelBooking);
  });
  [classDialogElement, bookingsDialogElement].forEach((dialogElement) => {
    dialogElement.querySelector("[data-close-dialog]").addEventListener("click", () => dialogElement.close());
    dialogElement.addEventListener("click", (clickEvent) => {
      if (clickEvent.target === dialogElement) dialogElement.close();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderWeekLabel();
  renderPlanningViews();
  initializePlanningInteractions();
});
