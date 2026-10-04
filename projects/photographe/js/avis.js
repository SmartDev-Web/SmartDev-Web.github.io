/* Lumen Studio - testimonials page: featured carousel and review filters */

/* Wires the scroll-snap carousel buttons and live counter */
function initializeFeaturedCarousel() {
  const carouselTrackElement = document.getElementById("featured-track");
  const slideElements = Array.from(carouselTrackElement.children);
  const counterElement = document.getElementById("carousel-counter");
  let currentSlideIndex = 0;
  const scrollToSlide = function (targetSlideIndex) {
    const boundedIndex = (targetSlideIndex + slideElements.length) % slideElements.length;
    carouselTrackElement.scrollTo({ left: slideElements[boundedIndex].offsetLeft - carouselTrackElement.offsetLeft, behavior: prefersReducedMotion ? "auto" : "smooth" });
  };
  const slideObserver = new IntersectionObserver(function (observerEntries) {
    observerEntries.forEach(function (observerEntry) {
      if (observerEntry.isIntersecting) {
        currentSlideIndex = slideElements.indexOf(observerEntry.target);
        counterElement.textContent = String(currentSlideIndex + 1).padStart(2, "0") + " / " + String(slideElements.length).padStart(2, "0");
      }
    });
  }, { root: carouselTrackElement, threshold: 0.6 });
  slideElements.forEach(function (slideElement) { slideObserver.observe(slideElement); });
  document.getElementById("carousel-previous").addEventListener("click", function () { scrollToSlide(currentSlideIndex - 1); });
  document.getElementById("carousel-next").addEventListener("click", function () { scrollToSlide(currentSlideIndex + 1); });
  carouselTrackElement.addEventListener("keydown", function (keyboardEvent) {
    if (keyboardEvent.key === "ArrowRight" || keyboardEvent.key === "ArrowLeft") {
      keyboardEvent.preventDefault();
      scrollToSlide(currentSlideIndex + (keyboardEvent.key === "ArrowRight" ? 1 : -1));
    }
  });
}

/* Filters review cards by event type */
function initializeReviewFilters() {
  const filterButtonElements = Array.from(document.querySelectorAll("[data-review-filter]"));
  const reviewElements = Array.from(document.querySelectorAll("[data-review-type]"));
  filterButtonElements.forEach(function (filterButtonElement) {
    filterButtonElement.addEventListener("click", function () {
      const selectedType = filterButtonElement.dataset.reviewFilter;
      filterButtonElements.forEach(function (otherButtonElement) {
        otherButtonElement.setAttribute("aria-pressed", String(otherButtonElement === filterButtonElement));
      });
      reviewElements.forEach(function (reviewElement) {
        const shouldShow = selectedType === "tout" || reviewElement.dataset.reviewType === selectedType;
        reviewElement.hidden = !shouldShow;
        if (shouldShow && !prefersReducedMotion) {
          reviewElement.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 500, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
        }
      });
      document.getElementById("review-status").textContent = reviewElements.filter(function (reviewElement) { return !reviewElement.hidden; }).length + " avis affichés";
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initializeFeaturedCarousel();
  initializeReviewFilters();
});
