/* ==========================================================================
   Azur Hôtel & Spa — rooms page: photo carousels (arrows, dots, keyboard,
   swipe) and a room comparison tool persisted in localStorage.
   ========================================================================== */

const compareStorageKey = 'azurHotelComparedRooms';
const maximumComparedRooms = 3;
const carouselSwipeThresholdPx = 45;

/* Builds an independent carousel controller for one room card */
function initializeRoomCarousel(carouselElement) {
  const trackElement = carouselElement.querySelector('.carousel__track');
  const slideElements = Array.from(trackElement.children);
  const counterElement = carouselElement.querySelector('[data-carousel-counter]');
  const dotsContainerElement = carouselElement.querySelector('[data-carousel-dots]');
  const carouselState = { activeIndex: 0, dragStartX: null, dragOffsetX: 0 };
  const dotButtonElements = slideElements.map((slideElement, slideIndex) => {
    const dotButtonElement = document.createElement('button');
    dotButtonElement.type = 'button';
    dotButtonElement.className = 'carousel__dot';
    dotButtonElement.setAttribute('aria-label', `Afficher la photo ${slideIndex + 1}`);
    dotButtonElement.addEventListener('click', () => showCarouselSlide(slideIndex));
    dotsContainerElement.appendChild(dotButtonElement);
    return dotButtonElement;
  });
  function renderCarousel() {
    trackElement.style.transform = `translate3d(calc(${carouselState.activeIndex * -100}% + ${carouselState.dragOffsetX}px), 0, 0)`;
    counterElement.textContent = `${carouselState.activeIndex + 1} / ${slideElements.length}`;
    slideElements.forEach((slideElement, slideIndex) => slideElement.setAttribute('aria-hidden', String(slideIndex !== carouselState.activeIndex)));
    dotButtonElements.forEach((dotButtonElement, dotIndex) => dotButtonElement.setAttribute('aria-current', String(dotIndex === carouselState.activeIndex)));
  }
  function showCarouselSlide(requestedIndex) {
    carouselState.activeIndex = (requestedIndex + slideElements.length) % slideElements.length;
    carouselState.dragOffsetX = 0;
    renderCarousel();
  }
  carouselElement.querySelector('[data-carousel-previous]').addEventListener('click', () => showCarouselSlide(carouselState.activeIndex - 1));
  carouselElement.querySelector('[data-carousel-next]').addEventListener('click', () => showCarouselSlide(carouselState.activeIndex + 1));
  carouselElement.addEventListener('keydown', (keyboardEvent) => {
    if (keyboardEvent.key === 'ArrowLeft') showCarouselSlide(carouselState.activeIndex - 1);
    if (keyboardEvent.key === 'ArrowRight') showCarouselSlide(carouselState.activeIndex + 1);
  });
  trackElement.addEventListener('pointerdown', (pointerEvent) => {
    carouselState.dragStartX = pointerEvent.clientX;
    trackElement.setPointerCapture(pointerEvent.pointerId);
    trackElement.classList.add('is-dragging');
  });
  trackElement.addEventListener('pointermove', (pointerEvent) => {
    if (carouselState.dragStartX === null) return;
    carouselState.dragOffsetX = pointerEvent.clientX - carouselState.dragStartX;
    renderCarousel();
  });
  const finishCarouselDrag = () => {
    if (carouselState.dragStartX === null) return;
    const finalOffset = carouselState.dragOffsetX;
    carouselState.dragStartX = null;
    trackElement.classList.remove('is-dragging');
    if (finalOffset <= -carouselSwipeThresholdPx) showCarouselSlide(carouselState.activeIndex + 1);
    else if (finalOffset >= carouselSwipeThresholdPx) showCarouselSlide(carouselState.activeIndex - 1);
    else showCarouselSlide(carouselState.activeIndex);
  };
  trackElement.addEventListener('pointerup', finishCarouselDrag);
  trackElement.addEventListener('pointercancel', finishCarouselDrag);
  renderCarousel();
}

const compareCheckboxElements = Array.from(document.querySelectorAll('[data-compare-checkbox]'));
const compareTrayElement = document.querySelector('[data-compare-tray]');
const compareTrayTextElement = document.querySelector('[data-compare-tray-text]');
const compareOpenButtonElement = document.querySelector('[data-compare-open]');
const compareDialogElement = document.getElementById('compare-dialog');
const compareTableContainerElement = document.querySelector('[data-compare-table]');

/* Amenity rows displayed in the comparison table */
const comparedAmenityRows = [
  { label: 'Tarif / nuit', render: (hotelRoom) => `dès ${formatEuroAmount(hotelRoom.nightlyRate)}` },
  { label: 'Surface', render: (hotelRoom) => `${hotelRoom.surface} m²` },
  { label: 'Capacité', render: (hotelRoom) => `${hotelRoom.capacity} personnes` },
  { label: 'Literie', render: (hotelRoom) => hotelRoom.bed },
  { label: 'Vue', render: (hotelRoom) => hotelRoom.view },
  { label: 'Balcon / terrasse', flag: 'balcony' },
  { label: 'Baignoire', flag: 'bathtub' },
  { label: 'Machine à café', flag: 'coffeeMachine' },
  { label: 'Petit-déjeuner inclus', flag: 'breakfastIncluded' },
  { label: 'Accès spa inclus', flag: 'spaIncluded' },
];

/* Reads the list of compared room ids */
function loadComparedRoomIds() {
  try {
    const storedRoomIds = JSON.parse(localStorage.getItem(compareStorageKey));
    return Array.isArray(storedRoomIds) ? storedRoomIds.filter((roomId) => findHotelRoomById(roomId)).slice(0, maximumComparedRooms) : [];
  } catch (storageError) {
    return [];
  }
}

let comparedRoomIds = loadComparedRoomIds();

/* Persists the compared rooms and refreshes the interface */
function updateComparedRooms(nextComparedRoomIds) {
  comparedRoomIds = nextComparedRoomIds;
  try {
    localStorage.setItem(compareStorageKey, JSON.stringify(comparedRoomIds));
  } catch (storageError) {
    compareTrayElement.dataset.storageUnavailable = 'true';
  }
  renderCompareState();
}

/* Syncs checkboxes and tray with the compared rooms */
function renderCompareState() {
  const isSelectionFull = comparedRoomIds.length >= maximumComparedRooms;
  compareCheckboxElements.forEach((compareCheckboxElement) => {
    compareCheckboxElement.checked = comparedRoomIds.includes(compareCheckboxElement.value);
    compareCheckboxElement.disabled = isSelectionFull && !compareCheckboxElement.checked;
  });
  compareTrayElement.classList.toggle('is-visible', comparedRoomIds.length > 0);
  compareOpenButtonElement.disabled = comparedRoomIds.length < 2;
  const selectedRoomNames = comparedRoomIds.map((roomId) => findHotelRoomById(roomId).name.replace(/^(Chambre|Suite) /, ''));
  const remainingHint = comparedRoomIds.length < 2 ? ' — ajoutez-en au moins une autre.' : isSelectionFull ? ' — maximum atteint.' : '';
  compareTrayTextElement.innerHTML = `<strong>${comparedRoomIds.length}/${maximumComparedRooms}</strong> ${selectedRoomNames.join(', ')}${remainingHint}`;
}

/* Builds the comparison table for the selected rooms */
function renderComparisonTable() {
  const comparedRooms = comparedRoomIds.map(findHotelRoomById);
  const headerCells = comparedRooms.map((hotelRoom) => `<th scope="col">${hotelRoom.name}</th>`).join('');
  const bodyRows = comparedAmenityRows.map((amenityRow) => {
    const valueCells = comparedRooms.map((hotelRoom) => {
      if (!amenityRow.flag) return `<td>${amenityRow.render(hotelRoom)}</td>`;
      return hotelRoom[amenityRow.flag] ? '<td><span class="amenity-yes">✓ Oui</span></td>' : '<td><span class="amenity-no">—</span></td>';
    }).join('');
    return `<tr><th scope="row">${amenityRow.label}</th>${valueCells}</tr>`;
  }).join('');
  const bookingCells = comparedRooms.map((hotelRoom) => `<td><a class="button button--primary button--small" href="reservation.html?chambre=${hotelRoom.id}">Réserver</a></td>`).join('');
  compareTableContainerElement.innerHTML = `<table class="compare-table"><thead><tr><td></td>${headerCells}</tr></thead><tbody>${bodyRows}<tr><th scope="row"></th>${bookingCells}</tr></tbody></table>`;
}

compareCheckboxElements.forEach((compareCheckboxElement) => {
  compareCheckboxElement.addEventListener('change', () => {
    const roomId = compareCheckboxElement.value;
    updateComparedRooms(compareCheckboxElement.checked ? [...comparedRoomIds, roomId].slice(0, maximumComparedRooms) : comparedRoomIds.filter((comparedId) => comparedId !== roomId));
  });
});

document.querySelector('[data-compare-clear]').addEventListener('click', () => updateComparedRooms([]));

compareOpenButtonElement.addEventListener('click', () => {
  renderComparisonTable();
  openModalDialog(compareDialogElement);
});

document.querySelectorAll('[data-carousel]').forEach(initializeRoomCarousel);
renderCompareState();
