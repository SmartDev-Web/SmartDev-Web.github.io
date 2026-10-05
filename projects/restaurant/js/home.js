/* ==========================================================================
   Maison Ambre — home page: reviews slider driven by buttons, dots,
   keyboard arrows and touch / mouse swipe (no autoplay).
   ========================================================================== */

/* Builds a slider controller around a container marked with data-reviews-slider */
function initializeReviewsSlider(sliderRootElement) {
  const viewportElement = sliderRootElement.querySelector('.reviews__viewport');
  const trackElement = sliderRootElement.querySelector('.reviews__track');
  const reviewSlideElements = Array.from(trackElement.children);
  const dotsContainerElement = sliderRootElement.querySelector('[data-reviews-dots]');
  const swipeThresholdPx = 50;
  let activeSlideIndex = 0;
  let dragStartX = null;
  let dragOffsetX = 0;
  const dotButtonElements = reviewSlideElements.map((slideElement, slideIndex) => {
    const dotButtonElement = document.createElement('button');
    dotButtonElement.type = 'button';
    dotButtonElement.className = 'reviews__dot';
    dotButtonElement.setAttribute('aria-label', `Afficher l’avis ${slideIndex + 1}`);
    dotButtonElement.addEventListener('click', () => showSlide(slideIndex));
    dotsContainerElement.appendChild(dotButtonElement);
    return dotButtonElement;
  });
  function renderSliderPosition() {
    trackElement.style.transform = `translate3d(calc(${activeSlideIndex * -100}% + ${dragOffsetX}px), 0, 0)`;
    reviewSlideElements.forEach((slideElement, slideIndex) => {
      slideElement.setAttribute('aria-hidden', String(slideIndex !== activeSlideIndex));
    });
    dotButtonElements.forEach((dotButtonElement, dotIndex) => {
      dotButtonElement.setAttribute('aria-current', String(dotIndex === activeSlideIndex));
    });
  }
  function showSlide(requestedSlideIndex) {
    activeSlideIndex = (requestedSlideIndex + reviewSlideElements.length) % reviewSlideElements.length;
    dragOffsetX = 0;
    renderSliderPosition();
  }
  sliderRootElement.querySelector('[data-reviews-previous]').addEventListener('click', () => showSlide(activeSlideIndex - 1));
  sliderRootElement.querySelector('[data-reviews-next]').addEventListener('click', () => showSlide(activeSlideIndex + 1));
  sliderRootElement.addEventListener('keydown', (keyboardEvent) => {
    if (keyboardEvent.key === 'ArrowLeft') showSlide(activeSlideIndex - 1);
    if (keyboardEvent.key === 'ArrowRight') showSlide(activeSlideIndex + 1);
  });
  viewportElement.addEventListener('pointerdown', (pointerEvent) => {
    if (pointerEvent.button !== 0) return;
    dragStartX = pointerEvent.clientX;
    viewportElement.setPointerCapture(pointerEvent.pointerId);
    viewportElement.classList.add('is-dragging');
    trackElement.classList.add('is-dragging');
  });
  viewportElement.addEventListener('pointermove', (pointerEvent) => {
    if (dragStartX === null) return;
    dragOffsetX = pointerEvent.clientX - dragStartX;
    renderSliderPosition();
  });
  const finishDrag = () => {
    if (dragStartX === null) return;
    const finalDragOffset = dragOffsetX;
    dragStartX = null;
    viewportElement.classList.remove('is-dragging');
    trackElement.classList.remove('is-dragging');
    if (finalDragOffset <= -swipeThresholdPx) showSlide(activeSlideIndex + 1);
    else if (finalDragOffset >= swipeThresholdPx) showSlide(activeSlideIndex - 1);
    else showSlide(activeSlideIndex);
  };
  viewportElement.addEventListener('pointerup', finishDrag);
  viewportElement.addEventListener('pointercancel', finishDrag);
  renderSliderPosition();
}

document.querySelectorAll('[data-reviews-slider]').forEach(initializeReviewsSlider);
