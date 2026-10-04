/* ==========================================================================
   Azur Hôtel & Spa — booking page: dates with night count, guest steppers,
   room choice, options and a live price summary including taxes.
   ========================================================================== */

const maximumStayNights = 21;
const weekendSurchargeRate = 0.2;
const touristTaxPerAdultPerNight = 2.53;
const vatRate = 0.1;
const guestLimits = { adults: { minimum: 1, maximum: 4 }, children: { minimum: 0, maximum: 3 } };

/* Optional extras; pricing functions receive the current stay context */
const stayExtraOptions = [
  { id: 'breakfast', label: 'Petit-déjeuner buffet', detail: '26 € / adulte, 13 € / enfant, par nuit', includedFlag: 'breakfastIncluded', computePrice: (stayContext) => stayContext.nights * (stayContext.adults * 26 + stayContext.children * 13) },
  { id: 'spa', label: 'Accès spa marin', detail: '35 € / adulte pour le séjour', includedFlag: 'spaIncluded', computePrice: (stayContext) => stayContext.adults * 35 },
  { id: 'parking', label: 'Parking privé couvert', detail: '20 € / nuit', computePrice: (stayContext) => stayContext.nights * 20 },
  { id: 'lateCheckout', label: 'Départ tardif à 16 h', detail: '45 € forfait', computePrice: () => 45 },
  { id: 'welcome', label: 'Coffret bienvenue', detail: 'Crémant, gâteau basque et fleurs : 39 €', computePrice: () => 39 },
];

const stayBookingFormElement = document.getElementById('stay-booking-form');
const arrivalInputElement = document.getElementById('stay-arrival');
const departureInputElement = document.getElementById('stay-departure');
const nightsTextElement = document.querySelector('[data-nights-text]');
const roomOptionsContainerElement = document.querySelector('[data-room-options]');
const roomErrorElement = document.querySelector('[data-error-for="stay-room"]');
const extraOptionsContainerElement = document.querySelector('[data-extra-options]');
const priceLinesElement = document.querySelector('[data-price-lines]');
const priceTotalElement = document.querySelector('[data-price-total]');
const summaryRoomElement = document.querySelector('[data-summary-room]');
const bookingLayoutElement = document.querySelector('[data-booking-layout]');
const stayConfirmationElement = document.querySelector('[data-stay-confirmation]');

const stayState = {
  arrival: '',
  departure: '',
  adults: 2,
  children: 0,
  roomId: null,
  selectedExtras: new Set(),
};

/* Formats a Date as yyyy-mm-dd */
function formatStayInputDate(dateValue) {
  return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;
}

/* Parses yyyy-mm-dd as a local date */
function parseStayInputDate(dateString) {
  const [yearPart, monthPart, dayPart] = dateString.split('-').map(Number);
  return new Date(yearPart, monthPart - 1, dayPart);
}

/* Returns the yyyy-mm-dd string shifted by a number of days */
function shiftStayDate(dateString, numberOfDays) {
  const shiftedDate = parseStayInputDate(dateString);
  shiftedDate.setDate(shiftedDate.getDate() + numberOfDays);
  return formatStayInputDate(shiftedDate);
}

function formatLongStayDate(dateString) {
  return parseStayInputDate(dateString).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

function pluralize(count, singularWord, pluralWord) {
  return `${count} ${count > 1 ? pluralWord : singularWord}`;
}

function buildRoomImageUrl(imageId, imageWidth) {
  return `https://images.unsplash.com/photo-${imageId}?auto=format&fit=crop&w=${imageWidth}&q=80`;
}

/* Lists every night of the stay with its weekend flag (Friday and Saturday nights) */
function getStayNights() {
  const hasValidDates = stayState.arrival && stayState.departure && stayState.departure > stayState.arrival;
  if (!hasValidDates) return [];
  const stayNights = [];
  for (let nightDate = stayState.arrival; nightDate < stayState.departure; nightDate = shiftStayDate(nightDate, 1)) {
    const weekdayIndex = parseStayInputDate(nightDate).getDay();
    stayNights.push({ date: nightDate, isWeekend: weekdayIndex === 5 || weekdayIndex === 6 });
  }
  return stayNights;
}

/* True when the stay qualifies for the autumn offer (3 nights or more, arrival from October 1st to December 15th) */
function isAutumnOfferApplicable(nightCount) {
  if (!stayState.arrival || nightCount < 3) return false;
  const arrivalDate = parseStayInputDate(stayState.arrival);
  const offerStart = new Date(arrivalDate.getFullYear(), 9, 1);
  const offerEnd = new Date(arrivalDate.getFullYear(), 11, 15);
  return arrivalDate >= offerStart && arrivalDate <= offerEnd;
}

/* Computes every price line and the total for the current state */
function computeStayQuote() {
  const selectedRoom = findHotelRoomById(stayState.roomId);
  const stayNights = getStayNights();
  const stayContext = { nights: stayNights.length, adults: stayState.adults, children: stayState.children };
  const quoteLines = [];
  if (!selectedRoom || !stayNights.length) return { quoteLines, total: 0, stayContext };
  const weekNightCount = stayNights.filter((stayNight) => !stayNight.isWeekend).length;
  const weekendNightCount = stayNights.length - weekNightCount;
  const weekendNightlyRate = Math.round(selectedRoom.nightlyRate * (1 + weekendSurchargeRate));
  if (weekNightCount) quoteLines.push({ label: `${pluralize(weekNightCount, 'nuit', 'nuits')} en semaine × ${formatEuroAmount(selectedRoom.nightlyRate)}`, amount: weekNightCount * selectedRoom.nightlyRate });
  if (weekendNightCount) quoteLines.push({ label: `${pluralize(weekendNightCount, 'nuit', 'nuits')} le week-end × ${formatEuroAmount(weekendNightlyRate)}`, amount: weekendNightCount * weekendNightlyRate });
  const isAutumnOffer = isAutumnOfferApplicable(stayNights.length);
  stayExtraOptions.forEach((extraOption) => {
    const isIncludedWithRoom = Boolean(extraOption.includedFlag && selectedRoom[extraOption.includedFlag]);
    const isOfferedByAutumnDeal = extraOption.id === 'spa' && isAutumnOffer;
    if (isIncludedWithRoom || isOfferedByAutumnDeal) {
      quoteLines.push({ label: `${extraOption.label} (${isIncludedWithRoom ? 'inclus' : 'offre d’automne'})`, amount: 0 });
      return;
    }
    if (stayState.selectedExtras.has(extraOption.id)) quoteLines.push({ label: extraOption.label, amount: extraOption.computePrice(stayContext) });
  });
  const amountIncludingVat = quoteLines.reduce((runningTotal, quoteLine) => runningTotal + quoteLine.amount, 0);
  const touristTaxAmount = stayState.adults * stayNights.length * touristTaxPerAdultPerNight;
  quoteLines.push({ label: `Taxe de séjour (${pluralize(stayState.adults, 'adulte', 'adultes')} × ${pluralize(stayNights.length, 'nuit', 'nuits')})`, amount: touristTaxAmount, fractionDigits: 2 });
  quoteLines.push({ label: 'dont TVA 10 %', amount: amountIncludingVat - amountIncludingVat / (1 + vatRate), fractionDigits: 2, isInformational: true });
  return { quoteLines, total: amountIncludingVat + touristTaxAmount, stayContext };
}

/* Renders the room choices according to guest count */
function renderRoomOptions() {
  const totalGuests = stayState.adults + stayState.children;
  const selectedRoom = findHotelRoomById(stayState.roomId);
  if (selectedRoom && selectedRoom.capacity < totalGuests) {
    stayState.roomId = null;
    roomErrorElement.textContent = `La ${selectedRoom.name} accueille ${selectedRoom.capacity} personnes maximum : choisissez une chambre plus grande.`;
  }
  roomOptionsContainerElement.innerHTML = hotelRoomCatalog.map((hotelRoom) => {
    const isTooSmall = hotelRoom.capacity < totalGuests;
    return `<label class="room-option">
      <input type="radio" name="room" value="${escapeHtml(hotelRoom.id)}"${hotelRoom.id === stayState.roomId ? ' checked' : ''}${isTooSmall ? ' disabled' : ''}>
      <span class="room-option__card">
        <img src="${escapeHtml(buildRoomImageUrl(hotelRoom.imageId, 240))}" alt="" width="240" height="180" loading="lazy">
        <span><span class="room-option__name">${escapeHtml(hotelRoom.name)}</span><span class="room-option__info">${hotelRoom.surface} m² · ${escapeHtml(isTooSmall ? `max. ${hotelRoom.capacity} personnes` : hotelRoom.view)}</span></span>
        <span class="room-option__price">dès<strong>${formatEuroAmount(hotelRoom.nightlyRate)}</strong>/ nuit</span>
      </span>
    </label>`;
  }).join('');
}

/* Renders the extras, marking those included with the chosen room */
function renderExtraOptions() {
  const selectedRoom = findHotelRoomById(stayState.roomId);
  const isAutumnOffer = isAutumnOfferApplicable(getStayNights().length);
  extraOptionsContainerElement.innerHTML = stayExtraOptions.map((extraOption) => {
    const isIncluded = Boolean(selectedRoom && extraOption.includedFlag && selectedRoom[extraOption.includedFlag]) || (extraOption.id === 'spa' && isAutumnOffer);
    const isChecked = isIncluded || stayState.selectedExtras.has(extraOption.id);
    return `<label class="extra-option">
      <input type="checkbox" value="${escapeHtml(extraOption.id)}" data-extra-option${isChecked ? ' checked' : ''}${isIncluded ? ' disabled' : ''}>
      <span><strong>${escapeHtml(extraOption.label)}</strong><small>${escapeHtml(isIncluded ? 'Inclus dans votre séjour' : extraOption.detail)}</small></span>
    </label>`;
  }).join('');
}

/* Renders night count, guest steppers and the price summary */
function renderStaySummary() {
  const stayNights = getStayNights();
  const selectedRoom = findHotelRoomById(stayState.roomId);
  const stayQuote = computeStayQuote();
  nightsTextElement.textContent = stayNights.length ? `${pluralize(stayNights.length, 'nuit', 'nuits')} · du ${formatLongStayDate(stayState.arrival)} au ${formatLongStayDate(stayState.departure)}` : 'Sélectionnez vos dates';
  Object.keys(guestLimits).forEach((guestType) => {
    document.querySelector(`[data-stepper-value="${guestType}"]`).textContent = String(stayState[guestType]);
    document.querySelector(`[data-stepper="${guestType}"][data-step="-1"]`).disabled = stayState[guestType] <= guestLimits[guestType].minimum;
    document.querySelector(`[data-stepper="${guestType}"][data-step="1"]`).disabled = stayState[guestType] >= guestLimits[guestType].maximum;
  });
  const guestSummary = `${pluralize(stayState.adults, 'adulte', 'adultes')}${stayState.children ? `, ${pluralize(stayState.children, 'enfant', 'enfants')}` : ''}`;
  summaryRoomElement.innerHTML = selectedRoom ? `<img src="${escapeHtml(buildRoomImageUrl(selectedRoom.imageId, 200))}" alt="" width="200" height="140"><span><strong>${escapeHtml(selectedRoom.name)}</strong>${escapeHtml(guestSummary)}</span>` : `<span><strong>Aucune chambre choisie</strong>${escapeHtml(guestSummary)}</span>`;
  if (!stayQuote.quoteLines.length) {
    priceLinesElement.innerHTML = `<li><span>${stayNights.length ? 'Choisissez une chambre pour voir le tarif.' : 'Choisissez vos dates pour voir le tarif.'}</span><span></span></li>`;
    priceTotalElement.textContent = '—';
    return;
  }
  priceLinesElement.innerHTML = stayQuote.quoteLines.map((quoteLine) => `<li${quoteLine.isInformational ? ' class="price-lines__info"' : ''}><span>${escapeHtml(quoteLine.label)}</span><span>${quoteLine.amount === 0 ? 'Offert' : formatEuroAmount(quoteLine.amount, quoteLine.fractionDigits || 0)}</span></li>`).join('');
  priceTotalElement.textContent = formatEuroAmount(stayQuote.total, 2);
}

/* Re-renders every dynamic block from the state */
function renderBookingInterface() {
  renderRoomOptions();
  renderExtraOptions();
  renderStaySummary();
}

/* Updates the departure bounds from the arrival date and keeps the stay coherent */
function synchronizeDepartureBounds() {
  if (!stayState.arrival) return;
  departureInputElement.min = shiftStayDate(stayState.arrival, 1);
  departureInputElement.max = shiftStayDate(stayState.arrival, maximumStayNights);
  if (!departureInputElement.value || departureInputElement.value <= stayState.arrival) departureInputElement.value = shiftStayDate(stayState.arrival, 2);
  stayState.departure = updateFieldErrorState(departureInputElement) ? departureInputElement.value : '';
}

/* Returns a yyyy-mm-dd URL parameter only when it is a real calendar date */
function readDateUrlParameter(urlParameters, parameterName) {
  const parameterValue = urlParameters.get(parameterName) || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parameterValue)) return '';
  return formatStayInputDate(parseStayInputDate(parameterValue)) === parameterValue ? parameterValue : '';
}

/* Pre-fills the form from URL parameters sent by the home page or the rooms page */
function applyUrlParameters() {
  const urlParameters = new URLSearchParams(window.location.search);
  const requestedRoom = findHotelRoomById(urlParameters.get('chambre'));
  const requestedAdults = Number(urlParameters.get('adultes'));
  const requestedArrival = readDateUrlParameter(urlParameters, 'arrivee');
  const requestedDeparture = readDateUrlParameter(urlParameters, 'depart');
  if (Number.isInteger(requestedAdults) && requestedAdults >= guestLimits.adults.minimum && requestedAdults <= guestLimits.adults.maximum) stayState.adults = requestedAdults;
  if (requestedRoom && requestedRoom.capacity >= stayState.adults) stayState.roomId = requestedRoom.id;
  if (requestedArrival) {
    arrivalInputElement.value = requestedArrival;
    stayState.arrival = updateFieldErrorState(arrivalInputElement) ? arrivalInputElement.value : '';
  }
  if (requestedDeparture) departureInputElement.value = requestedDeparture;
  synchronizeDepartureBounds();
}

/* Generates a booking reference such as AZ-4K7Q2M */
function createStayReference() {
  const referenceAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return `AZ-${Array.from(crypto.getRandomValues(new Uint32Array(6)), (randomValue) => referenceAlphabet[randomValue % referenceAlphabet.length]).join('')}`;
}

/* Shows the confirmation panel with the booking details */
function showStayConfirmation(stayFormData) {
  const selectedRoom = findHotelRoomById(stayState.roomId);
  const stayQuote = computeStayQuote();
  const confirmationDetails = [
    ['Arrivée', formatLongStayDate(stayState.arrival)],
    ['Départ', formatLongStayDate(stayState.departure)],
    ['Chambre', selectedRoom.name],
    ['Voyageurs', `${pluralize(stayState.adults, 'adulte', 'adultes')}${stayState.children ? `, ${pluralize(stayState.children, 'enfant', 'enfants')}` : ''}`],
    ['Total TTC', formatEuroAmount(stayQuote.total, 2)],
  ];
  document.querySelector('[data-confirmation-name]').textContent = String(stayFormData.get('name')).trim().split(/\s+/)[0];
  document.querySelector('[data-confirmation-reference]').textContent = `Réf. ${createStayReference()}`;
  document.querySelector('[data-confirmation-email]').textContent = String(stayFormData.get('email')).trim();
  document.querySelector('[data-confirmation-details]').innerHTML = confirmationDetails.map(([detailLabel, detailValue]) => `<div><dt>${escapeHtml(detailLabel)}</dt><dd>${escapeHtml(detailValue)}</dd></div>`).join('');
  bookingLayoutElement.hidden = true;
  stayConfirmationElement.hidden = false;
  stayConfirmationElement.focus();
  stayConfirmationElement.scrollIntoView({ behavior: prefersReducedMotionQuery.matches ? 'auto' : 'smooth', block: 'start' });
}

arrivalInputElement.addEventListener('change', () => {
  stayState.arrival = updateFieldErrorState(arrivalInputElement) ? arrivalInputElement.value : '';
  synchronizeDepartureBounds();
  renderBookingInterface();
});

departureInputElement.addEventListener('change', () => {
  stayState.departure = updateFieldErrorState(departureInputElement) ? departureInputElement.value : '';
  renderBookingInterface();
});

document.querySelectorAll('[data-stepper]').forEach((stepperButtonElement) => {
  stepperButtonElement.addEventListener('click', () => {
    const guestType = stepperButtonElement.dataset.stepper;
    const nextValue = stayState[guestType] + Number(stepperButtonElement.dataset.step);
    stayState[guestType] = Math.min(guestLimits[guestType].maximum, Math.max(guestLimits[guestType].minimum, nextValue));
    renderBookingInterface();
  });
});

roomOptionsContainerElement.addEventListener('change', (changeEvent) => {
  if (changeEvent.target.name !== 'room') return;
  stayState.roomId = changeEvent.target.value;
  roomErrorElement.textContent = '';
  renderExtraOptions();
  renderStaySummary();
});

extraOptionsContainerElement.addEventListener('change', (changeEvent) => {
  if (!changeEvent.target.matches('[data-extra-option]')) return;
  if (changeEvent.target.checked) stayState.selectedExtras.add(changeEvent.target.value);
  else stayState.selectedExtras.delete(changeEvent.target.value);
  renderStaySummary();
});

stayBookingFormElement.addEventListener('submit', (submitEvent) => {
  submitEvent.preventDefault();
  const areFieldsValid = validateFormFields(stayBookingFormElement);
  roomErrorElement.textContent = stayState.roomId ? '' : 'Merci de choisir une chambre.';
  if (areFieldsValid && !stayState.roomId) roomOptionsContainerElement.querySelector('input:not(:disabled)').focus();
  if (!areFieldsValid || !stayState.roomId || !getStayNights().length) return;
  showStayConfirmation(new FormData(stayBookingFormElement));
});

document.querySelector('[data-new-stay]').addEventListener('click', () => {
  stayBookingFormElement.reset();
  Object.assign(stayState, { arrival: '', departure: '', adults: 2, children: 0, roomId: null, selectedExtras: new Set() });
  stayBookingFormElement.querySelectorAll('[aria-invalid]').forEach((fieldElement) => fieldElement.removeAttribute('aria-invalid'));
  stayConfirmationElement.hidden = true;
  bookingLayoutElement.hidden = false;
  renderBookingInterface();
  arrivalInputElement.focus();
});

arrivalInputElement.min = formatStayInputDate(new Date());
arrivalInputElement.max = shiftStayDate(formatStayInputDate(new Date()), 365);

applyUrlParameters();
renderBookingInterface();
