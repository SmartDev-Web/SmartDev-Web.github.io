/* ==========================================================================
   Maison Ambre — reservation page: day-dependent time slots, party size
   stepper, live summary, validation and confirmation card.
   ========================================================================== */

const reservationStorageKey = 'maisonAmbreLastReservation';
const minimumPartySize = 1;
const maximumPartySize = 8;
const bookingWindowDays = 90;

/* Opening services per weekday (0 = Sunday). Each service lists its seating times. */
const servicesByWeekday = {
  0: [{ label: 'Déjeuner', times: ['12:00', '12:30', '13:00', '13:30', '14:00'] }],
  1: [],
  2: [{ label: 'Déjeuner', times: ['12:00', '12:30', '13:00', '13:30'] }, { label: 'Dîner', times: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30'] }],
  3: [{ label: 'Déjeuner', times: ['12:00', '12:30', '13:00', '13:30'] }, { label: 'Dîner', times: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30'] }],
  4: [{ label: 'Déjeuner', times: ['12:00', '12:30', '13:00', '13:30'] }, { label: 'Dîner', times: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30'] }],
  5: [{ label: 'Déjeuner', times: ['12:00', '12:30', '13:00', '13:30'] }, { label: 'Dîner', times: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'] }],
  6: [{ label: 'Déjeuner', times: ['12:00', '12:30', '13:00', '13:30'] }, { label: 'Dîner', times: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'] }],
};

const reservationFormElement = document.getElementById('formulaire-reservation');
const reservationDateInputElement = document.getElementById('reservation-date');
const timeSlotsContainerElement = document.querySelector('[data-time-slots]');
const timeSlotErrorElement = document.querySelector('[data-error-for="reservation-time"]');
const partySizeOutputElement = document.getElementById('party-size-output');
const partyDecreaseButtonElement = document.querySelector('[data-party-decrease]');
const partyIncreaseButtonElement = document.querySelector('[data-party-increase]');
const reservationLayoutElement = document.querySelector('[data-reservation-layout]');
const confirmationCardElement = document.querySelector('[data-confirmation]');
const previousBookingElement = document.querySelector('[data-previous-booking]');

const reservationState = {
  selectedDate: null,
  selectedTime: null,
  selectedService: null,
  partySize: 2,
};

/* Formats a Date as the yyyy-mm-dd value expected by date inputs */
function formatDateForInput(dateValue) {
  const monthPart = String(dateValue.getMonth() + 1).padStart(2, '0');
  const dayPart = String(dateValue.getDate()).padStart(2, '0');
  return `${dateValue.getFullYear()}-${monthPart}-${dayPart}`;
}

/* Parses a yyyy-mm-dd string as a local date */
function parseInputDate(dateString) {
  const [yearPart, monthPart, dayPart] = dateString.split('-').map(Number);
  return new Date(yearPart, monthPart - 1, dayPart);
}

/* Formats a date in long French form, e.g. « samedi 10 octobre 2026 » */
function formatLongFrenchDate(dateValue) {
  return dateValue.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatPartySize(partySize) {
  return `${partySize} ${partySize > 1 ? 'personnes' : 'personne'}`;
}

/* Deterministic pseudo-random availability so a given slot always shows the same state */
function isTimeSlotFullyBooked(dateString, timeLabel) {
  const seedText = `${dateString}-${timeLabel}`;
  const hashValue = Array.from(seedText).reduce((accumulatedHash, character) => (accumulatedHash * 31 + character.charCodeAt(0)) % 9973, 7);
  const weekdayIndex = parseInputDate(dateString).getDay();
  const occupancyThreshold = weekdayIndex === 5 || weekdayIndex === 6 ? 35 : 18;
  return hashValue % 100 < occupancyThreshold;
}

/* Returns true when the slot time is already past for today's date */
function isTimeSlotInPast(dateString, timeLabel) {
  const [hourPart, minutePart] = timeLabel.split(':').map(Number);
  const slotDateTime = parseInputDate(dateString);
  slotDateTime.setHours(hourPart, minutePart, 0, 0);
  return slotDateTime.getTime() < Date.now() + 60 * 60 * 1000;
}

/* Creates the informative paragraph displayed in place of the slot grid */
function createTimeSlotsMessage(messageText) {
  const messageElement = document.createElement('p');
  messageElement.className = 'time-slots__message';
  messageElement.textContent = messageText;
  return messageElement;
}

/* Creates one selectable time slot: a visually hidden radio input and its printed label */
function createTimeSlotElement(serviceLabel, timeLabel, isUnavailable, slotRenderIndex) {
  const slotLabelElement = document.createElement('label');
  const slotRadioElement = document.createElement('input');
  const slotTextElement = document.createElement('span');
  slotLabelElement.className = 'time-slot';
  slotRadioElement.type = 'radio';
  slotRadioElement.name = 'time';
  slotRadioElement.value = timeLabel;
  slotRadioElement.dataset.service = serviceLabel;
  slotRadioElement.disabled = isUnavailable;
  slotRadioElement.checked = reservationState.selectedTime === timeLabel && !isUnavailable;
  slotTextElement.style.setProperty('--item-index', String(slotRenderIndex));
  slotTextElement.textContent = timeLabel.replace(':', 'h');
  slotLabelElement.append(slotRadioElement, slotTextElement);
  return slotLabelElement;
}

/* Renders the available time slots for the selected date */
function renderTimeSlots() {
  timeSlotsContainerElement.replaceChildren();
  if (!reservationState.selectedDate) {
    timeSlotsContainerElement.appendChild(createTimeSlotsMessage('Sélectionnez une date pour afficher les créneaux disponibles.'));
    return;
  }
  const dayServices = servicesByWeekday[parseInputDate(reservationState.selectedDate).getDay()];
  if (!dayServices.length) {
    timeSlotsContainerElement.appendChild(createTimeSlotsMessage('Le restaurant est fermé le lundi. Choisissez un autre jour : nous serons ravis de vous accueillir.'));
    return;
  }
  let slotRenderIndex = 0;
  let availableSlotCount = 0;
  dayServices.forEach((dayService) => {
    const serviceWrapperElement = document.createElement('div');
    const serviceTitleElement = document.createElement('p');
    const slotGridElement = document.createElement('div');
    serviceTitleElement.className = 'time-slots__service-title';
    serviceTitleElement.textContent = dayService.label;
    slotGridElement.className = 'time-slots__grid';
    slotGridElement.setAttribute('role', 'radiogroup');
    slotGridElement.setAttribute('aria-label', `Créneaux du ${dayService.label.toLowerCase()}`);
    dayService.times.forEach((timeLabel) => {
      const isPastSlot = isTimeSlotInPast(reservationState.selectedDate, timeLabel);
      const isUnavailable = isPastSlot || isTimeSlotFullyBooked(reservationState.selectedDate, timeLabel);
      const slotLabelElement = createTimeSlotElement(dayService.label, timeLabel, isUnavailable, slotRenderIndex);
      if (isUnavailable) slotLabelElement.title = isPastSlot ? 'Créneau trop proche ou passé' : 'Complet';
      else availableSlotCount += 1;
      slotRenderIndex += 1;
      slotGridElement.appendChild(slotLabelElement);
    });
    serviceWrapperElement.append(serviceTitleElement, slotGridElement);
    timeSlotsContainerElement.appendChild(serviceWrapperElement);
  });
  if (!availableSlotCount) {
    timeSlotsContainerElement.appendChild(createTimeSlotsMessage('Tous les créneaux de cette journée sont complets. Essayez une autre date ou appelez-nous pour la liste d’attente.'));
  }
}

/* Updates the side summary and stepper state from the reservation state */
function renderReservationSummary() {
  const selectedDateLabel = reservationState.selectedDate ? formatLongFrenchDate(parseInputDate(reservationState.selectedDate)) : '—';
  document.querySelector('[data-summary-date]').textContent = selectedDateLabel;
  document.querySelector('[data-summary-service]').textContent = reservationState.selectedService || '—';
  document.querySelector('[data-summary-time]').textContent = reservationState.selectedTime ? reservationState.selectedTime.replace(':', 'h') : '—';
  document.querySelector('[data-summary-party]').textContent = formatPartySize(reservationState.partySize);
  partySizeOutputElement.textContent = formatPartySize(reservationState.partySize);
  partyDecreaseButtonElement.disabled = reservationState.partySize <= minimumPartySize;
  partyIncreaseButtonElement.disabled = reservationState.partySize >= maximumPartySize;
}

/* Validates that a time slot is selected and shows an inline message otherwise */
function validateSelectedTimeSlot() {
  const errorMessage = reservationState.selectedTime ? '' : 'Merci de choisir un créneau horaire.';
  timeSlotErrorElement.textContent = errorMessage;
  return !errorMessage;
}

/* Returns true when a restored record has the exact shape written by persistReservation */
function isValidStoredReservation(storedReservation) {
  if (!storedReservation || typeof storedReservation !== 'object') return false;
  const hasValidReference = typeof storedReservation.reference === 'string' && /^MA-[A-Z0-9]{5}$/.test(storedReservation.reference);
  const hasValidDate = typeof storedReservation.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(storedReservation.date) && !Number.isNaN(parseInputDate(storedReservation.date).getTime());
  const hasValidTime = typeof storedReservation.time === 'string' && /^\d{2}:\d{2}$/.test(storedReservation.time);
  const hasValidPartySize = Number.isInteger(storedReservation.partySize) && storedReservation.partySize >= minimumPartySize && storedReservation.partySize <= maximumPartySize;
  return hasValidReference && hasValidDate && hasValidTime && hasValidPartySize;
}

/* Reads the persisted reservation, if any, discarding malformed data */
function loadStoredReservation() {
  try {
    const storedReservation = JSON.parse(localStorage.getItem(reservationStorageKey));
    return isValidStoredReservation(storedReservation) ? storedReservation : null;
  } catch (storageError) {
    return null;
  }
}

/* Stores the booking reminder (no personal details) and refreshes the reminder banner */
function persistReservation(reservationRecord) {
  try {
    if (reservationRecord) localStorage.setItem(reservationStorageKey, JSON.stringify(reservationRecord));
    else localStorage.removeItem(reservationStorageKey);
  } catch (storageError) {
    previousBookingElement.dataset.storageUnavailable = 'true';
  }
  renderPreviousBookingBanner();
}

/* Shows a reminder of the last upcoming reservation made on this device */
function renderPreviousBookingBanner() {
  const storedReservation = loadStoredReservation();
  const isUpcoming = storedReservation && parseInputDate(storedReservation.date) >= parseInputDate(formatDateForInput(new Date()));
  previousBookingElement.hidden = !isUpcoming;
  if (!isUpcoming) return;
  document.querySelector('[data-previous-booking-text]').textContent = `Votre dernière réservation : ${formatLongFrenchDate(parseInputDate(storedReservation.date))} à ${storedReservation.time.replace(':', 'h')}, ${formatPartySize(storedReservation.partySize)} (réf. ${storedReservation.reference}).`;
}

/* Generates a short booking reference such as MA-7K3P9 */
function createBookingReference() {
  const referenceAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomValues = crypto.getRandomValues(new Uint32Array(5));
  return `MA-${Array.from(randomValues, (randomValue) => referenceAlphabet[randomValue % referenceAlphabet.length]).join('')}`;
}

/* Fills and reveals the confirmation card */
function showReservationConfirmation(reservationRecord) {
  document.querySelector('[data-confirmation-name]').textContent = reservationRecord.name.split(' ')[0];
  document.querySelector('[data-confirmation-reference]').textContent = `Réf. ${reservationRecord.reference}`;
  document.querySelector('[data-confirmation-date]').textContent = formatLongFrenchDate(parseInputDate(reservationRecord.date));
  document.querySelector('[data-confirmation-time]').textContent = reservationRecord.time.replace(':', 'h');
  document.querySelector('[data-confirmation-party]').textContent = formatPartySize(reservationRecord.partySize);
  document.querySelector('[data-confirmation-occasion]').textContent = reservationRecord.occasion || '—';
  document.querySelector('[data-confirmation-email]').textContent = reservationRecord.email;
  reservationLayoutElement.hidden = true;
  confirmationCardElement.hidden = false;
  confirmationCardElement.focus();
  confirmationCardElement.scrollIntoView({ behavior: prefersReducedMotionQuery.matches ? 'auto' : 'smooth', block: 'center' });
}

/* Resets the form and state for a further booking */
function resetReservationForm() {
  reservationFormElement.reset();
  reservationFormElement.querySelectorAll('[aria-invalid]').forEach((fieldElement) => fieldElement.removeAttribute('aria-invalid'));
  reservationFormElement.querySelectorAll('.form-error').forEach((errorElement) => { errorElement.textContent = ''; });
  Object.assign(reservationState, { selectedDate: null, selectedTime: null, selectedService: null, partySize: 2 });
  renderTimeSlots();
  renderReservationSummary();
  confirmationCardElement.hidden = true;
  reservationLayoutElement.hidden = false;
  reservationDateInputElement.focus();
}

reservationDateInputElement.min = formatDateForInput(new Date());
reservationDateInputElement.max = formatDateForInput(new Date(Date.now() + bookingWindowDays * 24 * 60 * 60 * 1000));

reservationDateInputElement.addEventListener('change', () => {
  const isDateValid = updateFieldErrorState(reservationDateInputElement);
  reservationState.selectedDate = isDateValid ? reservationDateInputElement.value : null;
  reservationState.selectedTime = null;
  reservationState.selectedService = null;
  renderTimeSlots();
  renderReservationSummary();
});

timeSlotsContainerElement.addEventListener('change', (changeEvent) => {
  if (changeEvent.target.name !== 'time') return;
  reservationState.selectedTime = changeEvent.target.value;
  reservationState.selectedService = changeEvent.target.dataset.service;
  validateSelectedTimeSlot();
  renderReservationSummary();
});

partyDecreaseButtonElement.addEventListener('click', () => {
  reservationState.partySize = Math.max(minimumPartySize, reservationState.partySize - 1);
  renderReservationSummary();
});

partyIncreaseButtonElement.addEventListener('click', () => {
  reservationState.partySize = Math.min(maximumPartySize, reservationState.partySize + 1);
  renderReservationSummary();
});

reservationFormElement.addEventListener('submit', (submitEvent) => {
  submitEvent.preventDefault();
  const areFieldsValid = validateFormFields(reservationFormElement);
  const isSlotValid = reservationState.selectedDate ? validateSelectedTimeSlot() : true;
  if (areFieldsValid && !isSlotValid) {
    const firstAvailableSlotElement = timeSlotsContainerElement.querySelector('input:not(:disabled)');
    if (firstAvailableSlotElement) firstAvailableSlotElement.focus();
  }
  if (!areFieldsValid || !isSlotValid || !reservationState.selectedDate) return;
  const reservationFormData = new FormData(reservationFormElement);
  const reservationRecord = {
    reference: createBookingReference(),
    date: reservationState.selectedDate,
    time: reservationState.selectedTime,
    partySize: reservationState.partySize,
    name: reservationFormData.get('name').trim(),
    email: reservationFormData.get('email').trim(),
    occasion: reservationFormData.get('occasion'),
  };
  persistReservation({ reference: reservationRecord.reference, date: reservationRecord.date, time: reservationRecord.time, partySize: reservationRecord.partySize });
  showReservationConfirmation(reservationRecord);
});

document.querySelector('[data-new-reservation]').addEventListener('click', resetReservationForm);
document.querySelector('[data-forget-booking]').addEventListener('click', () => persistReservation(null));

renderTimeSlots();
renderReservationSummary();
renderPreviousBookingBanner();
