/* Lumen Studio - gallery page: FLIP animated category filters and lightbox */

const galleryGridElement = document.getElementById("masonry-gallery");
const galleryItemElements = Array.from(document.querySelectorAll(".masonry-item"));
const galleryLightboxElement = document.getElementById("gallery-lightbox");
const galleryLightboxImageElement = document.getElementById("gallery-lightbox-image");
const galleryLightboxCaptionElement = document.getElementById("gallery-lightbox-caption");
const FLIP_DURATION = 650;
const FLIP_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

const galleryLightboxState = { visibleItems: [], currentIndex: 0, returnFocusElement: null, touchStartX: 0 };

/* Records the on-screen position of every visible gallery item */
function measureVisibleItemPositions() {
  const positionMap = new Map();
  galleryItemElements.forEach(function (galleryItemElement) {
    if (!galleryItemElement.hidden) {
      positionMap.set(galleryItemElement, galleryItemElement.getBoundingClientRect());
    }
  });
  return positionMap;
}

/* Filters the gallery by category and animates the reflow with the FLIP technique */
function applyGalleryFilter(selectedCategory) {
  const firstPositions = measureVisibleItemPositions();
  galleryItemElements.forEach(function (galleryItemElement) {
    galleryItemElement.hidden = selectedCategory !== "tout" && galleryItemElement.dataset.category !== selectedCategory;
  });
  if (prefersReducedMotion) {
    return;
  }
  galleryItemElements.forEach(function (galleryItemElement) {
    if (galleryItemElement.hidden) {
      return;
    }
    const lastPosition = galleryItemElement.getBoundingClientRect();
    const firstPosition = firstPositions.get(galleryItemElement);
    if (!firstPosition) {
      galleryItemElement.animate([
        { opacity: 0, transform: "scale(0.85)" },
        { opacity: 1, transform: "scale(1)" }
      ], { duration: FLIP_DURATION, easing: FLIP_EASING });
      return;
    }
    const deltaX = firstPosition.left - lastPosition.left;
    const deltaY = firstPosition.top - lastPosition.top;
    const scaleX = firstPosition.width / lastPosition.width;
    const scaleY = firstPosition.height / lastPosition.height;
    if (!deltaX && !deltaY && scaleX === 1 && scaleY === 1) {
      return;
    }
    galleryItemElement.animate([
      { transformOrigin: "top left", transform: "translate(" + deltaX + "px, " + deltaY + "px) scale(" + scaleX + ", " + scaleY + ")" },
      { transformOrigin: "top left", transform: "none" }
    ], { duration: FLIP_DURATION, easing: FLIP_EASING });
  });
}

/* Wires the category filter buttons and keeps the choice in the URL hash */
function initializeGalleryFilters() {
  const filterButtonElements = Array.from(document.querySelectorAll("[data-filter]"));
  const selectFilter = function (selectedCategory) {
    filterButtonElements.forEach(function (filterButtonElement) {
      filterButtonElement.setAttribute("aria-pressed", String(filterButtonElement.dataset.filter === selectedCategory));
    });
    applyGalleryFilter(selectedCategory);
    document.getElementById("gallery-status").textContent = galleryItemElements.filter(function (galleryItemElement) { return !galleryItemElement.hidden; }).length + " photographies affichées";
  };
  filterButtonElements.forEach(function (filterButtonElement) {
    filterButtonElement.querySelector("sup").textContent = filterButtonElement.dataset.filter === "tout" ? galleryItemElements.length : galleryItemElements.filter(function (galleryItemElement) { return galleryItemElement.dataset.category === filterButtonElement.dataset.filter; }).length;
    filterButtonElement.addEventListener("click", function () {
      selectFilter(filterButtonElement.dataset.filter);
      history.replaceState(null, "", filterButtonElement.dataset.filter === "tout" ? window.location.pathname : "#" + filterButtonElement.dataset.filter);
    });
  });
  const selectFilterFromHash = function () {
    const hashCategory = window.location.hash.slice(1);
    selectFilter(filterButtonElements.some(function (filterButtonElement) { return filterButtonElement.dataset.filter === hashCategory; }) ? hashCategory : "tout");
  };
  window.addEventListener("hashchange", selectFilterFromHash);
  selectFilterFromHash();
}

/* Shows the current lightbox photo */
function renderGalleryLightboxImage() {
  const currentItemImage = galleryLightboxState.visibleItems[galleryLightboxState.currentIndex].querySelector("img");
  galleryLightboxImageElement.classList.add("is-loading");
  galleryLightboxImageElement.src = currentItemImage.dataset.fullSrc;
  galleryLightboxImageElement.alt = currentItemImage.alt;
  galleryLightboxCaptionElement.textContent = currentItemImage.alt + " — " + (galleryLightboxState.currentIndex + 1) + " / " + galleryLightboxState.visibleItems.length;
}

/* Opens the lightbox on a gallery item, navigating only among visible items */
function openGalleryLightbox(galleryItemElement, triggerElement) {
  galleryLightboxState.visibleItems = galleryItemElements.filter(function (candidateElement) { return !candidateElement.hidden; });
  galleryLightboxState.currentIndex = galleryLightboxState.visibleItems.indexOf(galleryItemElement);
  galleryLightboxState.returnFocusElement = triggerElement;
  renderGalleryLightboxImage();
  galleryLightboxElement.classList.add("is-open");
  galleryLightboxElement.setAttribute("aria-hidden", "false");
  document.body.classList.add("scroll-is-locked");
  galleryLightboxElement.querySelector("[data-lightbox-close]").focus();
}

/* Closes the lightbox and restores focus to the triggering photo */
function closeGalleryLightbox() {
  galleryLightboxElement.classList.remove("is-open");
  galleryLightboxElement.setAttribute("aria-hidden", "true");
  document.body.classList.remove("scroll-is-locked");
  if (galleryLightboxState.returnFocusElement) {
    galleryLightboxState.returnFocusElement.focus();
  }
}

/* Moves to the previous or next photo with wrap-around */
function stepGalleryLightbox(stepDirection) {
  const visibleCount = galleryLightboxState.visibleItems.length;
  galleryLightboxState.currentIndex = (galleryLightboxState.currentIndex + stepDirection + visibleCount) % visibleCount;
  renderGalleryLightboxImage();
}

/* Wires clicks, keyboard navigation, focus trapping and swipe gestures */
function initializeGalleryLightbox() {
  galleryGridElement.addEventListener("click", function (clickEvent) {
    const triggerElement = clickEvent.target.closest(".masonry-item button");
    if (triggerElement) {
      openGalleryLightbox(triggerElement.closest(".masonry-item"), triggerElement);
    }
  });
  galleryLightboxImageElement.addEventListener("load", function () {
    galleryLightboxImageElement.classList.remove("is-loading");
  });
  galleryLightboxElement.addEventListener("click", function (clickEvent) {
    const stepButtonElement = clickEvent.target.closest("[data-lightbox-step]");
    if (stepButtonElement) {
      stepGalleryLightbox(Number(stepButtonElement.dataset.lightboxStep));
    } else if (clickEvent.target.closest("[data-lightbox-close]") || clickEvent.target === galleryLightboxElement) {
      closeGalleryLightbox();
    }
  });
  document.addEventListener("keydown", function (keyboardEvent) {
    if (!galleryLightboxElement.classList.contains("is-open")) {
      return;
    }
    if (keyboardEvent.key === "Escape") {
      closeGalleryLightbox();
    } else if (keyboardEvent.key === "ArrowRight") {
      stepGalleryLightbox(1);
    } else if (keyboardEvent.key === "ArrowLeft") {
      stepGalleryLightbox(-1);
    } else if (keyboardEvent.key === "Tab") {
      const lightboxButtons = galleryLightboxElement.querySelectorAll("button");
      const firstButton = lightboxButtons[0];
      const lastButton = lightboxButtons[lightboxButtons.length - 1];
      if (keyboardEvent.shiftKey && document.activeElement === firstButton) {
        keyboardEvent.preventDefault();
        lastButton.focus();
      } else if (!keyboardEvent.shiftKey && document.activeElement === lastButton) {
        keyboardEvent.preventDefault();
        firstButton.focus();
      }
    }
  });
  galleryLightboxElement.addEventListener("touchstart", function (touchEvent) {
    galleryLightboxState.touchStartX = touchEvent.changedTouches[0].clientX;
  }, { passive: true });
  galleryLightboxElement.addEventListener("touchend", function (touchEvent) {
    const swipeDistance = touchEvent.changedTouches[0].clientX - galleryLightboxState.touchStartX;
    if (Math.abs(swipeDistance) > 50) {
      stepGalleryLightbox(swipeDistance < 0 ? 1 : -1);
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initializeGalleryFilters();
  initializeGalleryLightbox();
});
