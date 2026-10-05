/* ==========================================================================
   Maison Ambre — gallery page: category filters, masonry grid and a
   lightbox with keyboard, button and swipe navigation.
   ========================================================================== */

const galleryListElement = document.querySelector('[data-gallery]');
const galleryItemElements = Array.from(galleryListElement.querySelectorAll('.masonry__item'));
const galleryFilterButtonElements = Array.from(document.querySelectorAll('[data-gallery-filter]'));
const lightboxElement = document.querySelector('[data-lightbox]');
const lightboxImageElement = lightboxElement.querySelector('[data-lightbox-image]');
const lightboxCaptionElement = lightboxElement.querySelector('[data-lightbox-caption]');
const lightboxCounterElement = lightboxElement.querySelector('[data-lightbox-counter]');
const lightboxCloseButtonElement = lightboxElement.querySelector('[data-lightbox-close]');
const lightboxSwipeThresholdPx = 50;

const galleryState = {
  activeFilter: 'tout',
  visibleItemElements: galleryItemElements,
  lightboxIndex: 0,
  elementFocusedBeforeLightbox: null,
  swipeStartX: null,
};

/* Applies the active category filter to the masonry grid */
function applyGalleryFilter(filterKey) {
  galleryState.activeFilter = filterKey;
  galleryFilterButtonElements.forEach((filterButtonElement) => {
    filterButtonElement.setAttribute('aria-pressed', String(filterButtonElement.dataset.galleryFilter === filterKey));
  });
  galleryItemElements.forEach((galleryItemElement) => {
    const shouldBeVisible = filterKey === 'tout' || galleryItemElement.dataset.category === filterKey;
    const wasHidden = galleryItemElement.hidden;
    galleryItemElement.hidden = !shouldBeVisible;
    if (shouldBeVisible && wasHidden) galleryItemElement.classList.add('is-filter-entering');
  });
  galleryState.visibleItemElements = galleryItemElements.filter((galleryItemElement) => !galleryItemElement.hidden);
}

/* Displays the photo at the given index of the visible items inside the lightbox */
function renderLightboxPhoto(requestedIndex) {
  const visibleCount = galleryState.visibleItemElements.length;
  galleryState.lightboxIndex = (requestedIndex + visibleCount) % visibleCount;
  const activeItemElement = galleryState.visibleItemElements[galleryState.lightboxIndex];
  const thumbnailButtonElement = activeItemElement.querySelector('.masonry__button');
  const thumbnailImageElement = thumbnailButtonElement.querySelector('img');
  if (lightboxImageElement.getAttribute('src') !== thumbnailButtonElement.dataset.fullSrc) {
    lightboxImageElement.classList.add('is-loading');
    lightboxImageElement.src = thumbnailButtonElement.dataset.fullSrc;
  }
  lightboxImageElement.alt = thumbnailImageElement.alt;
  lightboxCaptionElement.textContent = thumbnailImageElement.alt;
  lightboxCounterElement.textContent = `${galleryState.lightboxIndex + 1} / ${visibleCount}`;
}

/* Opens the lightbox on a given visible item */
function openLightbox(startIndex) {
  galleryState.elementFocusedBeforeLightbox = document.activeElement;
  renderLightboxPhoto(startIndex);
  lightboxElement.hidden = false;
  void lightboxElement.offsetWidth;
  lightboxElement.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  lightboxCloseButtonElement.focus();
}

/* Hides the lightbox once its fade-out has finished, unless it was reopened in the meantime */
function hideLightboxAfterFade(transitionEvent) {
  if (transitionEvent.target !== lightboxElement || transitionEvent.propertyName !== 'opacity') return;
  if (!lightboxElement.classList.contains('is-open')) lightboxElement.hidden = true;
}

/* Closes the lightbox, fading it out unless reduced motion is requested */
function closeLightbox() {
  if (!lightboxElement.classList.contains('is-open')) return;
  lightboxElement.classList.remove('is-open');
  if (prefersReducedMotionQuery.matches) lightboxElement.hidden = true;
  document.body.style.overflow = '';
  if (galleryState.elementFocusedBeforeLightbox) galleryState.elementFocusedBeforeLightbox.focus();
}

/* Keeps keyboard focus inside the lightbox while it is open */
function trapLightboxFocus(keyboardEvent) {
  const focusableElements = Array.from(lightboxElement.querySelectorAll('button'));
  const firstFocusableElement = focusableElements[0];
  const lastFocusableElement = focusableElements[focusableElements.length - 1];
  if (keyboardEvent.shiftKey && document.activeElement === firstFocusableElement) {
    keyboardEvent.preventDefault();
    lastFocusableElement.focus();
  } else if (!keyboardEvent.shiftKey && document.activeElement === lastFocusableElement) {
    keyboardEvent.preventDefault();
    firstFocusableElement.focus();
  }
}

galleryFilterButtonElements.forEach((filterButtonElement) => {
  filterButtonElement.addEventListener('click', () => applyGalleryFilter(filterButtonElement.dataset.galleryFilter));
});

galleryListElement.addEventListener('animationend', (animationEvent) => {
  animationEvent.target.classList.remove('is-filter-entering');
});

galleryListElement.addEventListener('click', (clickEvent) => {
  const thumbnailButtonElement = clickEvent.target.closest('.masonry__button');
  if (!thumbnailButtonElement) return;
  openLightbox(galleryState.visibleItemElements.indexOf(thumbnailButtonElement.closest('.masonry__item')));
});

['load', 'error'].forEach((imageEventName) => lightboxImageElement.addEventListener(imageEventName, () => lightboxImageElement.classList.remove('is-loading')));
lightboxElement.addEventListener('transitionend', hideLightboxAfterFade);
lightboxElement.addEventListener('transitioncancel', hideLightboxAfterFade);
lightboxCloseButtonElement.addEventListener('click', closeLightbox);
lightboxElement.querySelector('[data-lightbox-previous]').addEventListener('click', () => renderLightboxPhoto(galleryState.lightboxIndex - 1));
lightboxElement.querySelector('[data-lightbox-next]').addEventListener('click', () => renderLightboxPhoto(galleryState.lightboxIndex + 1));

lightboxElement.addEventListener('click', (clickEvent) => {
  if (clickEvent.target === lightboxElement) closeLightbox();
});

document.addEventListener('keydown', (keyboardEvent) => {
  if (!lightboxElement.classList.contains('is-open')) return;
  if (keyboardEvent.key === 'Escape') closeLightbox();
  if (keyboardEvent.key === 'ArrowLeft') renderLightboxPhoto(galleryState.lightboxIndex - 1);
  if (keyboardEvent.key === 'ArrowRight') renderLightboxPhoto(galleryState.lightboxIndex + 1);
  if (keyboardEvent.key === 'Tab') trapLightboxFocus(keyboardEvent);
});

lightboxElement.addEventListener('pointerdown', (pointerEvent) => {
  if (pointerEvent.target.closest('button')) return;
  galleryState.swipeStartX = pointerEvent.clientX;
});

lightboxElement.addEventListener('pointerup', (pointerEvent) => {
  if (galleryState.swipeStartX === null) return;
  const swipeDistance = pointerEvent.clientX - galleryState.swipeStartX;
  galleryState.swipeStartX = null;
  if (swipeDistance <= -lightboxSwipeThresholdPx) renderLightboxPhoto(galleryState.lightboxIndex + 1);
  if (swipeDistance >= lightboxSwipeThresholdPx) renderLightboxPhoto(galleryState.lightboxIndex - 1);
});

lightboxImageElement.addEventListener('dragstart', (dragEvent) => dragEvent.preventDefault());
