/* ==========================================================================
   Azur Hôtel & Spa — spa page: treatment list with category, duration and
   price filters, slot booking in a modal dialog and saved appointments.
   ========================================================================== */

const spaTreatmentCatalog = [
  { id: 'massage-ocean', name: 'Massage Océan', category: 'massage', duration: 60, price: 115, description: 'Massage enveloppant aux longs mouvements inspirés de la houle, à l’huile de camélia et d’algue rouge.' },
  { id: 'massage-pierres', name: 'Pierres chaudes du Pays basque', category: 'massage', duration: 75, price: 135, description: 'Galets de l’Adour chauffés posés le long des méridiens pour dénouer les tensions en profondeur.' },
  { id: 'massage-dos', name: 'Escale dos & nuque', category: 'massage', duration: 30, price: 65, description: 'Un soin ciblé et tonique pour libérer les épaules après une journée de surf ou de route.' },
  { id: 'massage-sportif', name: 'Massage récupération surfeur', category: 'massage', duration: 60, price: 120, description: 'Pressions profondes et étirements passifs, baume à l’arnica et menthe poivrée.' },
  { id: 'massage-signature', name: 'Signature Azur', category: 'massage', duration: 90, price: 175, description: 'Notre massage emblématique : pieds au sel chaud, corps à l’huile ambrée, visage au rouleau de quartz.' },
  { id: 'visage-eclat', name: 'Éclat marin express', category: 'visage', duration: 45, price: 85, description: 'Nettoyage, gommage enzymatique et masque à la spiruline pour un teint lumineux en un instant.' },
  { id: 'visage-hydratation', name: 'Hydratation profonde', category: 'visage', duration: 60, price: 110, description: 'Sérum à l’acide hyaluronique marin, modelage drainant et masque alginate rafraîchissant.' },
  { id: 'visage-jeunesse', name: 'Soin jeunesse Txingudi', category: 'visage', duration: 90, price: 165, description: 'Protocole anti-âge complet aux peptides d’algues et massage liftant Kobido.' },
  { id: 'rituel-maree', name: 'Rituel Marée Haute', category: 'rituel', duration: 120, price: 210, description: 'Gommage au sel de Salies-de-Béarn, enveloppement d’algues, massage Océan et tisane des Aldudes.' },
  { id: 'rituel-future-maman', name: 'Rituel douceur future maman', category: 'rituel', duration: 75, price: 140, description: 'Dès le 4e mois, massage sur coussin de grossesse et soin des jambes légères.' },
  { id: 'duo-coucher', name: 'Duo Coucher de soleil', category: 'duo', duration: 60, price: 230, description: 'Massage Océan côte à côte en cabine duo, suivi d’une coupe de crémant face à la mer.' },
  { id: 'duo-escapade', name: 'Escapade à deux', category: 'duo', duration: 120, price: 390, description: 'Bain bouillonnant privatif, gommage et massage de 60 minutes pour deux, plateau gourmand inclus.' },
];

const spaCategoryLabels = { massage: 'Massage', visage: 'Soin visage', rituel: 'Rituel', duo: 'En duo' };
const spaBookingsStorageKey = 'azurHotelSpaBookings';
const spaBookingWindowDays = 60;

const treatmentGridElement = document.querySelector('[data-treatment-grid]');
const resultsCountElement = document.querySelector('[data-results-count]');
const categoryFilterButtonElements = Array.from(document.querySelectorAll('[data-category-filters] .chip'));
const durationFilterElement = document.getElementById('duration-filter');
const priceFilterElement = document.getElementById('price-filter');
const priceFilterValueElement = document.querySelector('[data-price-filter-value]');
const spaBookingDialogElement = document.getElementById('spa-booking-dialog');
const spaBookingFormElement = document.getElementById('spa-booking-form');
const spaDateInputElement = document.getElementById('spa-date');
const spaSlotsContainerElement = document.querySelector('[data-spa-slots]');
const spaSlotErrorElement = document.querySelector('[data-error-for="spa-slot"]');
const spaSuccessElement = document.querySelector('[data-spa-success]');
const myBookingsElement = document.querySelector('[data-my-bookings]');
const myBookingsListElement = document.querySelector('[data-my-bookings-list]');

const spaState = {
  activeCategory: 'toutes',
  activeDuration: 'toutes',
  maximumPrice: Number(priceFilterElement.value),
  selectedTreatment: null,
  selectedSlot: null,
};

/* Formats a Date as yyyy-mm-dd */
function formatSpaInputDate(dateValue) {
  return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;
}

/* Parses yyyy-mm-dd as a local date */
function parseSpaInputDate(dateString) {
  const [yearPart, monthPart, dayPart] = dateString.split('-').map(Number);
  return new Date(yearPart, monthPart - 1, dayPart);
}

function formatTreatmentDuration(durationMinutes) {
  return durationMinutes >= 120 ? `${durationMinutes / 60} h` : `${durationMinutes} min`;
}

/* Returns true when a treatment matches the duration filter */
function matchesDurationFilter(spaTreatment) {
  if (spaState.activeDuration === 'courte') return spaTreatment.duration <= 45;
  if (spaState.activeDuration === 'moyenne') return spaTreatment.duration === 60;
  if (spaState.activeDuration === 'longue') return spaTreatment.duration >= 90;
  return true;
}

/* Renders the filtered treatment cards */
function renderTreatmentList() {
  const visibleTreatments = spaTreatmentCatalog.filter((spaTreatment) => (spaState.activeCategory === 'toutes' || spaTreatment.category === spaState.activeCategory) && matchesDurationFilter(spaTreatment) && spaTreatment.price <= spaState.maximumPrice);
  categoryFilterButtonElements.forEach((categoryButtonElement) => categoryButtonElement.setAttribute('aria-pressed', String(categoryButtonElement.dataset.category === spaState.activeCategory)));
  priceFilterValueElement.textContent = formatEuroAmount(spaState.maximumPrice);
  resultsCountElement.textContent = `${visibleTreatments.length} soin${visibleTreatments.length > 1 ? 's' : ''} correspond${visibleTreatments.length > 1 ? 'ent' : ''} à vos critères.`;
  if (!visibleTreatments.length) {
    treatmentGridElement.innerHTML = '<li class="empty-state">Aucun soin ne correspond à ces critères. Augmentez votre budget ou choisissez une autre durée.</li>';
    return;
  }
  treatmentGridElement.innerHTML = visibleTreatments.map((spaTreatment, treatmentIndex) => `
    <li class="treatment-card" style="--item-index:${treatmentIndex}">
      <span class="treatment-card__category">${spaCategoryLabels[spaTreatment.category]}</span>
      <h3>${spaTreatment.name}</h3>
      <p>${spaTreatment.description}</p>
      <div class="treatment-card__footer">
        <span class="treatment-card__details"><strong>${formatEuroAmount(spaTreatment.price)}</strong>${formatTreatmentDuration(spaTreatment.duration)}</span>
        <button class="button button--primary button--small" type="button" data-book-treatment="${spaTreatment.id}">Réserver</button>
      </div>
    </li>`).join('');
}

/* Generates bookable start times for a date, given the treatment duration */
function getSpaSlotsForDate(dateString, durationMinutes) {
  const firstStartMinutes = 9 * 60 + 30;
  const lastEndMinutes = 19 * 60 + 30;
  const generatedSlots = [];
  for (let startMinutes = firstStartMinutes; startMinutes + durationMinutes <= lastEndMinutes; startMinutes += 30) {
    const timeLabel = `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`;
    const seedValue = Array.from(`${dateString}${timeLabel}${spaState.selectedTreatment.id}`).reduce((accumulatedHash, character) => (accumulatedHash * 33 + character.charCodeAt(0)) % 7919, 11);
    generatedSlots.push({ timeLabel, isTaken: seedValue % 100 < 30 });
  }
  return generatedSlots;
}

/* Renders the slot picker for the chosen date */
function renderSpaSlots() {
  spaState.selectedSlot = null;
  spaSlotErrorElement.textContent = '';
  if (!spaDateInputElement.value || spaDateInputElement.getAttribute('aria-invalid') === 'true') {
    spaSlotsContainerElement.innerHTML = '<p class="slot-message">Choisissez une date pour voir les horaires disponibles.</p>';
    return;
  }
  const availableSlots = getSpaSlotsForDate(spaDateInputElement.value, spaState.selectedTreatment.duration);
  if (availableSlots.every((spaSlot) => spaSlot.isTaken)) {
    spaSlotsContainerElement.innerHTML = '<p class="slot-message">Plus aucun horaire libre ce jour-là. Essayez une autre date.</p>';
    return;
  }
  spaSlotsContainerElement.innerHTML = `<div class="slot-grid" role="radiogroup" aria-label="Horaires disponibles">${availableSlots.map((spaSlot, slotIndex) => `<label class="slot-option"><input type="radio" name="slot" value="${spaSlot.timeLabel}"${spaSlot.isTaken ? ' disabled' : ''}><span style="--item-index:${slotIndex}">${spaSlot.timeLabel.replace(':', 'h')}</span></label>`).join('')}</div>`;
}

/* Reads saved spa appointments */
function loadSpaBookings() {
  try {
    const storedBookings = JSON.parse(localStorage.getItem(spaBookingsStorageKey));
    return Array.isArray(storedBookings) ? storedBookings : [];
  } catch (storageError) {
    return [];
  }
}

/* Saves spa appointments and refreshes the list */
function persistSpaBookings(spaBookings) {
  try {
    localStorage.setItem(spaBookingsStorageKey, JSON.stringify(spaBookings));
  } catch (storageError) {
    myBookingsElement.dataset.storageUnavailable = 'true';
  }
  renderMySpaBookings(spaBookings);
}

/* Lists upcoming spa appointments with a cancel action */
function renderMySpaBookings(spaBookings) {
  const todayValue = formatSpaInputDate(new Date());
  const upcomingBookings = spaBookings.filter((spaBooking) => spaBooking.date >= todayValue).sort((firstBooking, secondBooking) => `${firstBooking.date}${firstBooking.time}`.localeCompare(`${secondBooking.date}${secondBooking.time}`));
  myBookingsElement.hidden = upcomingBookings.length === 0;
  myBookingsListElement.innerHTML = upcomingBookings.map((spaBooking) => `
    <li><span><strong>${spaBooking.treatmentName}</strong> — ${parseSpaInputDate(spaBooking.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${spaBooking.time.replace(':', 'h')}</span>
    <button class="text-button" type="button" data-cancel-booking="${spaBooking.id}">Annuler</button></li>`).join('');
}

/* Prepares and opens the booking dialog for a treatment */
function openSpaBookingDialog(treatmentId) {
  spaState.selectedTreatment = spaTreatmentCatalog.find((spaTreatment) => spaTreatment.id === treatmentId);
  document.querySelector('[data-dialog-treatment-name]').textContent = spaState.selectedTreatment.name;
  document.querySelector('[data-dialog-treatment-details]').textContent = `${formatTreatmentDuration(spaState.selectedTreatment.duration)} · ${formatEuroAmount(spaState.selectedTreatment.price)}`;
  spaBookingFormElement.reset();
  spaBookingFormElement.querySelectorAll('[aria-invalid]').forEach((fieldElement) => fieldElement.removeAttribute('aria-invalid'));
  spaBookingFormElement.querySelectorAll('.form-error').forEach((errorElement) => { errorElement.textContent = ''; });
  spaBookingFormElement.hidden = false;
  spaSuccessElement.hidden = true;
  renderSpaSlots();
  openModalDialog(spaBookingDialogElement);
}

categoryFilterButtonElements.forEach((categoryButtonElement) => {
  categoryButtonElement.addEventListener('click', () => {
    spaState.activeCategory = categoryButtonElement.dataset.category;
    renderTreatmentList();
  });
});

durationFilterElement.addEventListener('change', () => {
  spaState.activeDuration = durationFilterElement.value;
  renderTreatmentList();
});

priceFilterElement.addEventListener('input', () => {
  spaState.maximumPrice = Number(priceFilterElement.value);
  renderTreatmentList();
});

treatmentGridElement.addEventListener('click', (clickEvent) => {
  const bookButtonElement = clickEvent.target.closest('[data-book-treatment]');
  if (bookButtonElement) openSpaBookingDialog(bookButtonElement.dataset.bookTreatment);
});

spaDateInputElement.addEventListener('change', () => {
  updateFieldErrorState(spaDateInputElement);
  renderSpaSlots();
});

spaSlotsContainerElement.addEventListener('change', (changeEvent) => {
  if (changeEvent.target.name !== 'slot') return;
  spaState.selectedSlot = changeEvent.target.value;
  spaSlotErrorElement.textContent = '';
});

spaBookingFormElement.addEventListener('submit', (submitEvent) => {
  submitEvent.preventDefault();
  const areFieldsValid = validateFormFields(spaBookingFormElement);
  const isSlotMissing = Boolean(spaDateInputElement.value) && !spaState.selectedSlot;
  spaSlotErrorElement.textContent = isSlotMissing ? 'Merci de choisir un horaire.' : '';
  if (!areFieldsValid || isSlotMissing) return;
  const spaBookingFormData = new FormData(spaBookingFormElement);
  const spaBooking = {
    id: `${Date.now()}`,
    treatmentName: spaState.selectedTreatment.name,
    date: spaDateInputElement.value,
    time: spaState.selectedSlot,
    name: spaBookingFormData.get('name').trim(),
  };
  persistSpaBookings([...loadSpaBookings(), spaBooking]);
  document.querySelector('[data-spa-success-text]').textContent = `${spaBooking.name.split(' ')[0]}, nous vous attendons le ${parseSpaInputDate(spaBooking.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${spaBooking.time.replace(':', 'h')} pour votre soin « ${spaBooking.treatmentName} ». Pensez à arriver 20 minutes en avance.`;
  spaBookingFormElement.hidden = true;
  spaSuccessElement.hidden = false;
  spaSuccessElement.focus();
});

myBookingsListElement.addEventListener('click', (clickEvent) => {
  const cancelButtonElement = clickEvent.target.closest('[data-cancel-booking]');
  if (!cancelButtonElement) return;
  persistSpaBookings(loadSpaBookings().filter((spaBooking) => spaBooking.id !== cancelButtonElement.dataset.cancelBooking));
});

spaDateInputElement.min = formatSpaInputDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
spaDateInputElement.max = formatSpaInputDate(new Date(Date.now() + spaBookingWindowDays * 24 * 60 * 60 * 1000));

renderTreatmentList();
renderMySpaBookings(loadSpaBookings());
