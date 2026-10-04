/* ==========================================================================
   Atelier Méca Rivière — appointment booking
   Custom month calendar, available drop-off slots, French licence plate
   validation (AA-123-AA) and appointments persisted in localStorage
   ========================================================================== */

const APPOINTMENTS_STORAGE_KEY = "meca-riviere-appointments";
const LAST_QUOTE_STORAGE_KEY = "meca-riviere-last-quote";
const BOOKING_WINDOW_DAYS = 60;
const CALENDAR_WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const FRENCH_PLATE_PATTERN = /^(?!SS|WW)[A-HJ-NP-TV-Z]{2}-(?!000)\d{3}-(?!SS)[A-HJ-NP-TV-Z]{2}$/;
const FRENCH_MOBILE_PATTERN = /^(?:\+33\s?|0)[67](?:[\s.-]?\d{2}){4}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Public holidays (month-day for recurring dates, full ISO dates for movable ones) */
const RECURRING_PUBLIC_HOLIDAYS = ["01-01", "05-01", "05-08", "07-14", "08-15", "11-01", "11-11", "12-25"];
const MOVABLE_PUBLIC_HOLIDAYS = ["2026-04-06", "2026-05-14", "2026-05-25", "2027-03-29", "2027-05-06", "2027-05-17"];

/* Drop-off slots by weekday (0 = Sunday) */
const DROP_OFF_SLOTS_BY_WEEKDAY = {
  0: { morning: [], afternoon: [] },
  1: { morning: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"], afternoon: ["13:30", "14:00", "14:30", "15:00", "16:00", "17:00"] },
  2: { morning: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"], afternoon: ["13:30", "14:00", "14:30", "15:00", "16:00", "17:00"] },
  3: { morning: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"], afternoon: ["13:30", "14:00", "14:30", "15:00", "16:00", "17:00"] },
  4: { morning: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"], afternoon: ["13:30", "14:00", "14:30", "15:00", "16:00", "17:00"] },
  5: { morning: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"], afternoon: ["13:30", "14:00", "14:30", "15:00", "16:00"] },
  6: { morning: ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00"], afternoon: [] }
};

const todayAtMidnight = new Date(new Date().setHours(0, 0, 0, 0));
const bookingState = {
  displayedMonthDate: new Date(todayAtMidnight.getFullYear(), todayAtMidnight.getMonth(), 1),
  selectedDateKey: null,
  selectedSlotTime: null,
  savedAppointments: loadSavedAppointments()
};

function loadSavedAppointments() {
  try {
    const storedAppointments = JSON.parse(localStorage.getItem(APPOINTMENTS_STORAGE_KEY) || "[]");
    return Array.isArray(storedAppointments) ? storedAppointments : [];
  } catch (storageError) {
    return [];
  }
}

function persistSavedAppointments() {
  try {
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(bookingState.savedAppointments));
  } catch (storageError) {
    showToastMessage("Impossible d'enregistrer le rendez-vous sur cet appareil.");
  }
}

function loadLastQuote() {
  try {
    return JSON.parse(localStorage.getItem(LAST_QUOTE_STORAGE_KEY) || "null");
  } catch (storageError) {
    return null;
  }
}

function toDateKey(dateValue) {
  return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}-${String(dateValue.getDate()).padStart(2, "0")}`;
}

function fromDateKey(dateKey) {
  const [yearValue, monthValue, dayValue] = dateKey.split("-").map(Number);
  return new Date(yearValue, monthValue - 1, dayValue);
}

function formatLongDate(dateKey) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(fromDateKey(dateKey));
}

function formatSlotTime(slotTime) {
  return slotTime.replace(":", "h");
}

function isPublicHoliday(dateValue) {
  const dateKey = toDateKey(dateValue);
  return RECURRING_PUBLIC_HOLIDAYS.includes(dateKey.slice(5)) || MOVABLE_PUBLIC_HOLIDAYS.includes(dateKey);
}

/* Deterministic pseudo-random occupancy so the planning looks realistic and stable */
function isSlotTakenByWorkshop(dateKey, slotTime) {
  let hashValue = 0;
  for (const characterValue of `${dateKey}|${slotTime}`) hashValue = (hashValue * 31 + characterValue.charCodeAt(0)) >>> 0;
  return hashValue % 100 < 38;
}

function isSlotBookedByUser(dateKey, slotTime) {
  return bookingState.savedAppointments.some((savedAppointment) => savedAppointment.dateKey === dateKey && savedAppointment.slotTime === slotTime);
}

/* Returns every slot of a day with its availability */
function getDaySlots(dateKey) {
  const daySchedule = DROP_OFF_SLOTS_BY_WEEKDAY[fromDateKey(dateKey).getDay()];
  const describeSlot = (slotTime) => ({ slotTime, isAvailable: !isSlotTakenByWorkshop(dateKey, slotTime) && !isSlotBookedByUser(dateKey, slotTime) });
  return { morning: daySchedule.morning.map(describeSlot), afternoon: daySchedule.afternoon.map(describeSlot) };
}

function countAvailableSlots(dateKey) {
  const daySlots = getDaySlots(dateKey);
  return [...daySlots.morning, ...daySlots.afternoon].filter((daySlot) => daySlot.isAvailable).length;
}

/* A day is bookable from tomorrow, within the booking window, when open and not full */
function isDateBookable(dateValue) {
  const latestBookableDate = new Date(todayAtMidnight);
  latestBookableDate.setDate(latestBookableDate.getDate() + BOOKING_WINDOW_DAYS);
  if (dateValue <= todayAtMidnight || dateValue > latestBookableDate) return false;
  if (dateValue.getDay() === 0 || isPublicHoliday(dateValue)) return false;
  return countAvailableSlots(toDateKey(dateValue)) > 0;
}

/* Renders the month grid of the custom calendar */
function renderCalendar() {
  const displayedMonthDate = bookingState.displayedMonthDate;
  const calendarGridElement = document.querySelector("[data-calendar-grid]");
  const daysInMonth = new Date(displayedMonthDate.getFullYear(), displayedMonthDate.getMonth() + 1, 0).getDate();
  const leadingPlaceholderCount = (displayedMonthDate.getDay() + 6) % 7;
  const calendarCellsMarkup = CALENDAR_WEEKDAY_LABELS.map((weekdayLabel) => `<div class="calendar__weekday" aria-hidden="true">${weekdayLabel}</div>`);
  for (let placeholderIndex = 0; placeholderIndex < leadingPlaceholderCount; placeholderIndex += 1) calendarCellsMarkup.push('<div class="calendar__placeholder" aria-hidden="true"></div>');
  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const cellDate = new Date(displayedMonthDate.getFullYear(), displayedMonthDate.getMonth(), dayNumber);
    const cellDateKey = toDateKey(cellDate);
    const isBookable = isDateBookable(cellDate);
    const availableSlotCount = isBookable ? countAvailableSlots(cellDateKey) : 0;
    const indicatorMarkup = isBookable ? `<span class="calendar__day-indicator${availableSlotCount <= 3 ? " calendar__day-indicator--low" : ""}" aria-hidden="true"></span>` : "";
    const accessibleLabel = `${formatLongDate(cellDateKey)}${isBookable ? `, ${availableSlotCount} créneau${availableSlotCount > 1 ? "x" : ""} disponible${availableSlotCount > 1 ? "s" : ""}` : ", indisponible"}`;
    calendarCellsMarkup.push(`<button type="button" class="calendar__day${cellDateKey === toDateKey(todayAtMidnight) ? " is-today" : ""}" data-date-key="${cellDateKey}" aria-pressed="${cellDateKey === bookingState.selectedDateKey}" aria-label="${accessibleLabel}"${isBookable ? "" : " disabled"}>${dayNumber}${indicatorMarkup}</button>`);
  }
  calendarGridElement.innerHTML = calendarCellsMarkup.join("");
  document.querySelector("[data-calendar-month]").textContent = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(displayedMonthDate);
  const firstDisplayableMonth = new Date(todayAtMidnight.getFullYear(), todayAtMidnight.getMonth(), 1);
  const lastBookableDate = new Date(todayAtMidnight);
  lastBookableDate.setDate(lastBookableDate.getDate() + BOOKING_WINDOW_DAYS);
  document.querySelector("[data-calendar-previous]").disabled = displayedMonthDate <= firstDisplayableMonth;
  document.querySelector("[data-calendar-next]").disabled = new Date(displayedMonthDate.getFullYear(), displayedMonthDate.getMonth() + 1, 1) > lastBookableDate;
}

/* Renders morning and afternoon slots for the selected day */
function renderSlots() {
  const slotContainerElement = document.querySelector("[data-slot-container]");
  if (!bookingState.selectedDateKey) {
    slotContainerElement.innerHTML = '<p class="empty-state">Sélectionnez d\'abord une date dans le calendrier.</p>';
    return;
  }
  const daySlots = getDaySlots(bookingState.selectedDateKey);
  const buildSlotGroupMarkup = (groupTitle, groupSlots) => {
    if (!groupSlots.length) return "";
    const slotButtonsMarkup = groupSlots.map((daySlot, slotIndex) => `<button type="button" class="slot-button" style="animation-delay:${slotIndex * 30}ms" data-slot-time="${daySlot.slotTime}" aria-pressed="${daySlot.slotTime === bookingState.selectedSlotTime}"${daySlot.isAvailable ? "" : " disabled"} aria-label="${formatSlotTime(daySlot.slotTime)}${daySlot.isAvailable ? "" : ", complet"}">${formatSlotTime(daySlot.slotTime)}</button>`).join("");
    return `<p class="slot-group-title">${groupTitle}</p><div class="slot-grid">${slotButtonsMarkup}</div>`;
  };
  slotContainerElement.innerHTML = `<p class="note" style="margin:0">${formatLongDate(bookingState.selectedDateKey)}</p>${buildSlotGroupMarkup("Matin", daySlots.morning)}${buildSlotGroupMarkup("Après-midi", daySlots.afternoon)}`;
}

/* Shows the chosen date and time above the form */
function renderSelectionRecap() {
  const selectionRecapElement = document.querySelector("[data-selection-recap]");
  if (!bookingState.selectedDateKey) {
    selectionRecapElement.innerHTML = '<span class="chip">Aucune date choisie</span>';
    return;
  }
  const dateChipMarkup = `<span class="chip chip--accent">${formatLongDate(bookingState.selectedDateKey)}</span>`;
  const timeChipMarkup = bookingState.selectedSlotTime ? `<span class="chip chip--accent">Dépôt à ${formatSlotTime(bookingState.selectedSlotTime)}</span>` : '<span class="chip">Choisissez un horaire</span>';
  selectionRecapElement.innerHTML = dateChipMarkup + timeChipMarkup;
}

/* Lists stored appointments with a cancel action */
function renderAppointmentList() {
  const appointmentListElement = document.querySelector("[data-appointment-list]");
  const upcomingAppointments = bookingState.savedAppointments.filter((savedAppointment) => fromDateKey(savedAppointment.dateKey) >= todayAtMidnight).sort((firstAppointment, secondAppointment) => `${firstAppointment.dateKey}${firstAppointment.slotTime}`.localeCompare(`${secondAppointment.dateKey}${secondAppointment.slotTime}`));
  if (!upcomingAppointments.length) {
    appointmentListElement.innerHTML = '<li class="empty-state">Aucun rendez-vous à venir. Réservez votre premier créneau ci-dessus.</li>';
    return;
  }
  appointmentListElement.innerHTML = upcomingAppointments.map((savedAppointment) => `<li class="appointment-item">
    <div>
      <span class="appointment-item__date">${formatLongDate(savedAppointment.dateKey)} · ${formatSlotTime(savedAppointment.slotTime)}</span>
      <span class="appointment-item__meta"><span class="mini-plate">${savedAppointment.licensePlate}</span> · ${savedAppointment.appointmentReason}${savedAppointment.quoteRange ? ` · devis ${savedAppointment.quoteRange}` : ""}</span>
    </div>
    <button class="button button--ghost button--small" type="button" data-cancel-appointment="${savedAppointment.id}">Annuler</button>
  </li>`).join("");
}

/* Single refresh point for every view depending on booking state */
function renderBookingViews() {
  renderCalendar();
  renderSlots();
  renderSelectionRecap();
  renderAppointmentList();
}

/* Normalises plate input to the AA-123-AA layout while typing */
function formatLicensePlateInput(rawPlateValue) {
  const compactValue = rawPlateValue.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  const plateParts = [compactValue.slice(0, 2), compactValue.slice(2, 5), compactValue.slice(5, 7)].filter(Boolean);
  return plateParts.join("-");
}

function getLicensePlateError(plateValue) {
  if (!plateValue) return "Indiquez votre immatriculation.";
  if (!/^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(plateValue)) return "Format attendu : AA-123-AA.";
  if (!FRENCH_PLATE_PATTERN.test(plateValue)) return "Immatriculation invalide (lettres I, O, U ou séries SS/WW, 000 interdites).";
  return "";
}

/* Validates the whole appointment form and returns the first invalid element */
function validateAppointmentForm(appointmentFormElement) {
  const formFields = appointmentFormElement.elements;
  const fieldChecks = [
    [formFields.licensePlate, getLicensePlateError(formFields.licensePlate.value)],
    [formFields.appointmentReason, formFields.appointmentReason.value ? "" : "Choisissez un motif."],
    [formFields.customerName, formFields.customerName.value.trim().length >= 3 ? "" : "Indiquez votre nom complet."],
    [formFields.customerPhone, FRENCH_MOBILE_PATTERN.test(formFields.customerPhone.value.trim()) ? "" : "Numéro mobile attendu (06 ou 07)."],
    [formFields.customerEmail, EMAIL_PATTERN.test(formFields.customerEmail.value.trim()) ? "" : "Adresse e-mail invalide."]
  ];
  fieldChecks.forEach(([fieldElement, errorMessage]) => setFieldErrorState(fieldElement, errorMessage));
  const plateFieldElement = formFields.licensePlate.closest(".form-field");
  plateFieldElement.classList.toggle("is-valid", !fieldChecks[0][1]);
  const firstInvalidCheck = fieldChecks.find(([, errorMessage]) => errorMessage);
  return firstInvalidCheck ? firstInvalidCheck[0] : null;
}

/* Shows the last online quote as an optional attachment */
function renderQuoteAttachment() {
  const lastQuote = loadLastQuote();
  const quoteAttachmentElement = document.querySelector("[data-quote-attachment]");
  if (!lastQuote) return;
  quoteAttachmentElement.hidden = false;
  document.querySelector("[data-quote-attachment-label]").textContent = `Joindre mon devis en ligne : ${lastQuote.vehicleDescription} — ${lastQuote.serviceLabels.join(", ")} (${lastQuote.totalMinimum.toLocaleString("fr-FR")} – ${lastQuote.totalMaximum.toLocaleString("fr-FR")} €)`;
}

function initializeAppointmentForm() {
  const appointmentFormElement = document.querySelector("[data-appointment-form]");
  const appointmentSuccessElement = document.querySelector("[data-appointment-success]");
  const licensePlateInputElement = appointmentFormElement.elements.licensePlate;
  licensePlateInputElement.addEventListener("input", () => {
    licensePlateInputElement.value = formatLicensePlateInput(licensePlateInputElement.value);
    const plateFieldElement = licensePlateInputElement.closest(".form-field");
    const isCompletePlate = licensePlateInputElement.value.length === 9;
    const plateErrorMessage = isCompletePlate ? getLicensePlateError(licensePlateInputElement.value) : "";
    setFieldErrorState(licensePlateInputElement, plateErrorMessage);
    plateFieldElement.classList.toggle("is-valid", isCompletePlate && !plateErrorMessage);
  });
  appointmentFormElement.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    if (!bookingState.selectedDateKey || !bookingState.selectedSlotTime) {
      showToastMessage("Choisissez d'abord une date et un horaire de dépôt.");
      document.querySelector("[data-calendar]").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
      return;
    }
    const firstInvalidElement = validateAppointmentForm(appointmentFormElement);
    if (firstInvalidElement) {
      firstInvalidElement.focus();
      return;
    }
    const formFields = appointmentFormElement.elements;
    const lastQuote = loadLastQuote();
    const attachedQuoteRange = lastQuote && formFields.attachQuote.checked && !document.querySelector("[data-quote-attachment]").hidden ? `${lastQuote.totalMinimum.toLocaleString("fr-FR")} – ${lastQuote.totalMaximum.toLocaleString("fr-FR")} €` : "";
    const newAppointment = {
      id: `rdv-${Date.now()}`,
      dateKey: bookingState.selectedDateKey,
      slotTime: bookingState.selectedSlotTime,
      licensePlate: formFields.licensePlate.value,
      appointmentReason: formFields.appointmentReason.value,
      customerName: formFields.customerName.value.trim(),
      loanVehicle: formFields.loanVehicle.checked,
      quoteRange: attachedQuoteRange
    };
    bookingState.savedAppointments = [...bookingState.savedAppointments, newAppointment];
    persistSavedAppointments();
    document.querySelector("[data-appointment-summary]").textContent = `Merci ${newAppointment.customerName}. Nous vous attendons le ${formatLongDate(newAppointment.dateKey)} à ${formatSlotTime(newAppointment.slotTime)} pour votre véhicule ${newAppointment.licensePlate} (${newAppointment.appointmentReason.toLowerCase()}).${newAppointment.loanVehicle ? " Un véhicule de prêt vous sera réservé si disponible." : ""} Un SMS de rappel vous sera envoyé la veille.`;
    bookingState.selectedSlotTime = null;
    renderBookingViews();
    appointmentFormElement.hidden = true;
    appointmentSuccessElement.hidden = false;
    appointmentSuccessElement.focus();
  });
  document.querySelector("[data-appointment-new]").addEventListener("click", () => {
    appointmentFormElement.reset();
    appointmentFormElement.querySelectorAll(".is-valid").forEach((validFieldElement) => validFieldElement.classList.remove("is-valid"));
    bookingState.selectedDateKey = null;
    renderBookingViews();
    appointmentSuccessElement.hidden = true;
    appointmentFormElement.hidden = false;
  });
}

function initializeCalendarInteractions() {
  const shiftDisplayedMonth = (monthOffset) => {
    const displayedMonthDate = bookingState.displayedMonthDate;
    bookingState.displayedMonthDate = new Date(displayedMonthDate.getFullYear(), displayedMonthDate.getMonth() + monthOffset, 1);
    renderCalendar();
  };
  document.querySelector("[data-calendar-previous]").addEventListener("click", () => shiftDisplayedMonth(-1));
  document.querySelector("[data-calendar-next]").addEventListener("click", () => shiftDisplayedMonth(1));
  document.querySelector("[data-calendar-grid]").addEventListener("click", (clickEvent) => {
    const dayButtonElement = clickEvent.target.closest("[data-date-key]");
    if (!dayButtonElement || dayButtonElement.disabled) return;
    bookingState.selectedDateKey = dayButtonElement.dataset.dateKey;
    bookingState.selectedSlotTime = null;
    renderBookingViews();
  });
  document.querySelector("[data-slot-container]").addEventListener("click", (clickEvent) => {
    const slotButtonElement = clickEvent.target.closest("[data-slot-time]");
    if (!slotButtonElement || slotButtonElement.disabled) return;
    bookingState.selectedSlotTime = slotButtonElement.dataset.slotTime;
    document.querySelectorAll("[data-slot-time]").forEach((otherSlotElement) => otherSlotElement.setAttribute("aria-pressed", String(otherSlotElement === slotButtonElement)));
    renderSelectionRecap();
  });
  document.querySelector("[data-appointment-list]").addEventListener("click", (clickEvent) => {
    const cancelButtonElement = clickEvent.target.closest("[data-cancel-appointment]");
    if (!cancelButtonElement) return;
    bookingState.savedAppointments = bookingState.savedAppointments.filter((savedAppointment) => savedAppointment.id !== cancelButtonElement.dataset.cancelAppointment);
    persistSavedAppointments();
    renderBookingViews();
    showToastMessage("Rendez-vous annulé, le créneau est de nouveau disponible.");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderBookingViews();
  renderQuoteAttachment();
  initializeCalendarInteractions();
  initializeAppointmentForm();
});
