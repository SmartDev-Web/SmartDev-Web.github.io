/* ==========================================================================
   Atelier Méca Rivière — shared behaviour for every page
   Header state, mobile navigation, page transitions, scroll reveal,
   animated counters, accordions, opening status, toasts and form helpers
   ========================================================================== */

document.documentElement.classList.add("js");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Escapes a value before it is interpolated into an HTML template */
function escapeHtml(unsafeValue) {
  const htmlEntityMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(unsafeValue).replace(/[&<>"']/g, (matchedCharacter) => htmlEntityMap[matchedCharacter]);
}

/* Reveals the page once the DOM is ready and restores it after back/forward cache */
function revealPageOnLoad() {
  document.body.classList.add("is-ready");
  window.addEventListener("pageshow", (pageShowEvent) => {
    if (pageShowEvent.persisted) document.body.classList.add("is-ready");
  });
}

/* Fades the page out before following internal links, navigating on transitionend */
function initializePageTransitions() {
  document.addEventListener("click", (clickEvent) => {
    const clickedLinkElement = clickEvent.target.closest("a[href]");
    if (!clickedLinkElement) return;
    const linkHref = clickedLinkElement.getAttribute("href");
    const destinationUrl = new URL(linkHref, window.location.href);
    const isSameDocumentAnchor = destinationUrl.pathname === window.location.pathname && destinationUrl.search === window.location.search && destinationUrl.hash !== "";
    const isInternalPageLink = destinationUrl.pathname.endsWith(".html") && !isSameDocumentAnchor && !clickedLinkElement.target && !linkHref.startsWith("http") && destinationUrl.protocol === window.location.protocol;
    if (!isInternalPageLink || clickEvent.metaKey || clickEvent.ctrlKey || clickEvent.shiftKey || clickEvent.button !== 0) return;
    if (prefersReducedMotion) return;
    clickEvent.preventDefault();
    const navigateToTarget = (transitionEndEvent) => {
      if (transitionEndEvent.target !== document.body || transitionEndEvent.propertyName !== "opacity") return;
      document.body.removeEventListener("transitionend", navigateToTarget);
      window.location.href = clickedLinkElement.href;
    };
    document.body.addEventListener("transitionend", navigateToTarget);
    document.body.classList.remove("is-ready");
  });
}

/* Toggles the compact header style once the page is scrolled */
function initializeStickyHeader() {
  const siteHeaderElement = document.querySelector(".site-header");
  if (!siteHeaderElement) return;
  const updateHeaderState = () => siteHeaderElement.classList.toggle("is-scrolled", window.scrollY > 40);
  updateHeaderState();
  window.addEventListener("scroll", updateHeaderState, { passive: true });
}

/* Opens and closes the fullscreen mobile navigation */
function initializeMobileNavigation() {
  const burgerButtonElement = document.querySelector(".burger-button");
  const mainNavigationElement = document.querySelector(".main-nav");
  if (!burgerButtonElement || !mainNavigationElement) return;
  const setNavigationOpenState = (shouldOpen) => {
    burgerButtonElement.setAttribute("aria-expanded", String(shouldOpen));
    burgerButtonElement.setAttribute("aria-label", shouldOpen ? "Fermer le menu" : "Ouvrir le menu");
    mainNavigationElement.classList.toggle("is-open", shouldOpen);
    document.body.style.overflow = shouldOpen ? "hidden" : "";
  };
  burgerButtonElement.addEventListener("click", () => {
    setNavigationOpenState(burgerButtonElement.getAttribute("aria-expanded") !== "true");
  });
  mainNavigationElement.addEventListener("click", (clickEvent) => {
    if (clickEvent.target.closest("a")) setNavigationOpenState(false);
  });
  document.addEventListener("keydown", (keyboardEvent) => {
    if (keyboardEvent.key === "Escape" && mainNavigationElement.classList.contains("is-open")) {
      setNavigationOpenState(false);
      burgerButtonElement.focus();
    }
  });
  window.matchMedia("(min-width: 981px)").addEventListener("change", (mediaQueryEvent) => {
    if (mediaQueryEvent.matches) setNavigationOpenState(false);
  });
}

/* Reveals elements with the .reveal class when they enter the viewport */
function initializeScrollReveal() {
  const revealElements = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || prefersReducedMotion) {
    revealElements.forEach((revealElement) => revealElement.classList.add("is-visible"));
    return;
  }
  const revealObserver = new IntersectionObserver((observedEntries) => {
    observedEntries.forEach((observedEntry) => {
      if (!observedEntry.isIntersecting) return;
      observedEntry.target.classList.add("is-visible");
      revealObserver.unobserve(observedEntry.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  revealElements.forEach((revealElement) => revealObserver.observe(revealElement));
}

/* Animates a number from zero to its target value with an ease-out curve */
function animateCounterElement(counterElement) {
  const counterTargetValue = Number(counterElement.dataset.countTarget);
  const counterSuffix = counterElement.dataset.countSuffix || "";
  const counterDurationMilliseconds = 1800;
  const formatCounterValue = (numericValue) => Math.round(numericValue).toLocaleString("fr-FR").replace(/\u202f/g, "\u00a0") + counterSuffix;
  if (prefersReducedMotion) {
    counterElement.textContent = formatCounterValue(counterTargetValue);
    return;
  }
  let animationStartTimestamp = null;
  const renderCounterFrame = (frameTimestamp) => {
    if (animationStartTimestamp === null) animationStartTimestamp = frameTimestamp;
    const animationProgress = Math.min((frameTimestamp - animationStartTimestamp) / counterDurationMilliseconds, 1);
    const easedProgress = 1 - Math.pow(1 - animationProgress, 4);
    counterElement.textContent = formatCounterValue(counterTargetValue * easedProgress);
    if (animationProgress < 1) requestAnimationFrame(renderCounterFrame);
  };
  requestAnimationFrame(renderCounterFrame);
}

/* Starts each counter once it becomes visible */
function initializeAnimatedCounters() {
  const counterElements = document.querySelectorAll("[data-count-target]");
  if (!counterElements.length) return;
  const counterObserver = new IntersectionObserver((observedEntries) => {
    observedEntries.forEach((observedEntry) => {
      if (!observedEntry.isIntersecting) return;
      animateCounterElement(observedEntry.target);
      counterObserver.unobserve(observedEntry.target);
    });
  }, { threshold: 0.6 });
  counterElements.forEach((counterElement) => counterObserver.observe(counterElement));
}

/* Wires previous/next buttons to a horizontally scrolling slider track */
function initializeSliders() {
  document.querySelectorAll("[data-slider]").forEach((sliderElement) => {
    const sliderTrackElement = sliderElement.querySelector("[data-slider-track]");
    const scrollSliderByDirection = (scrollDirection) => {
      const firstSlideElement = sliderTrackElement.firstElementChild;
      const slideStepWidth = firstSlideElement ? firstSlideElement.getBoundingClientRect().width + 20 : 300;
      sliderTrackElement.scrollBy({ left: slideStepWidth * scrollDirection, behavior: prefersReducedMotion ? "auto" : "smooth" });
    };
    sliderElement.querySelector("[data-slider-previous]").addEventListener("click", () => scrollSliderByDirection(-1));
    sliderElement.querySelector("[data-slider-next]").addEventListener("click", () => scrollSliderByDirection(1));
  });
}

/* Displays a short status message; its CSS animation handles entry, hold and exit */
function showToastMessage(messageText) {
  let toastElement = document.querySelector(".toast");
  if (!toastElement) {
    toastElement = document.createElement("div");
    toastElement.className = "toast";
    toastElement.setAttribute("role", "status");
    toastElement.setAttribute("aria-live", "polite");
    document.body.appendChild(toastElement);
    toastElement.addEventListener("animationend", () => toastElement.classList.remove("is-visible"));
  }
  toastElement.textContent = messageText;
  toastElement.classList.remove("is-visible");
  void toastElement.offsetWidth;
  toastElement.classList.add("is-visible");
}

/* Shows or clears the error message attached to a form field */
function setFieldErrorState(fieldInputElement, errorMessageText) {
  const fieldWrapperElement = fieldInputElement.closest(".form-field, .checkbox-field");
  const fieldErrorElement = fieldWrapperElement ? fieldWrapperElement.querySelector(".form-field__error") : null;
  if (fieldWrapperElement) {
    fieldWrapperElement.classList.toggle("has-error", Boolean(errorMessageText));
    fieldWrapperElement.classList.remove("is-valid");
  }
  fieldInputElement.setAttribute("aria-invalid", errorMessageText ? "true" : "false");
  if (fieldErrorElement) fieldErrorElement.textContent = errorMessageText || "";
}

/* Weekly opening hours: day index (0 = Sunday) mapped to [opening, closing] minute ranges */
const WORKSHOP_OPENING_HOURS = {
  0: [],
  1: [[480, 720], [810, 1110]],
  2: [[480, 720], [810, 1110]],
  3: [[480, 720], [810, 1110]],
  4: [[480, 720], [810, 1110]],
  5: [[480, 720], [810, 1080]],
  6: [[510, 750]]
};

function formatMinutesAsTime(totalMinutes) {
  return `${Math.floor(totalMinutes / 60)}h${String(totalMinutes % 60).padStart(2, "0")}`;
}

/* Describes whether the workshop is currently open and when it next changes state */
function computeWorkshopOpeningStatus(referenceDate = new Date()) {
  const currentDayIndex = referenceDate.getDay();
  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
  const currentRange = WORKSHOP_OPENING_HOURS[currentDayIndex].find(([openingMinutes, closingMinutes]) => currentMinutes >= openingMinutes && currentMinutes < closingMinutes);
  if (currentRange) return { isOpen: true, label: `Ouvert · ferme à ${formatMinutesAsTime(currentRange[1])}` };
  const laterRangeToday = WORKSHOP_OPENING_HOURS[currentDayIndex].find(([openingMinutes]) => openingMinutes > currentMinutes);
  if (laterRangeToday) return { isOpen: false, label: `Fermé · ouvre à ${formatMinutesAsTime(laterRangeToday[0])}` };
  const dayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  for (let dayOffset = 1; dayOffset <= 7; dayOffset += 1) {
    const candidateDayIndex = (currentDayIndex + dayOffset) % 7;
    const firstRange = WORKSHOP_OPENING_HOURS[candidateDayIndex][0];
    if (firstRange) return { isOpen: false, label: `Fermé · ouvre ${dayOffset === 1 ? "demain" : dayNames[candidateDayIndex]} à ${formatMinutesAsTime(firstRange[0])}` };
  }
  return { isOpen: false, label: "Fermé" };
}

/* Renders the live opening status in every status element and highlights today's hours */
function renderWorkshopOpeningStatus() {
  const openingStatus = computeWorkshopOpeningStatus();
  document.querySelectorAll("[data-opening-status]").forEach((statusElement) => {
    statusElement.classList.toggle("is-open", openingStatus.isOpen);
    const statusLabelElement = statusElement.querySelector("[data-opening-label]");
    if (statusLabelElement) statusLabelElement.textContent = openingStatus.label;
  });
  document.querySelectorAll("[data-hours-day]").forEach((hoursRowElement) => {
    hoursRowElement.classList.toggle("is-today", Number(hoursRowElement.dataset.hoursDay) === new Date().getDay());
  });
}

/* Expands and collapses accordion items, keeping ARIA attributes in sync */
function initializeAccordions() {
  document.querySelectorAll("[data-accordion]").forEach((accordionElement) => {
    accordionElement.addEventListener("click", (clickEvent) => {
      const triggerButtonElement = clickEvent.target.closest(".accordion__trigger");
      if (!triggerButtonElement) return;
      setAccordionItemState(triggerButtonElement.closest(".accordion__item"), triggerButtonElement.getAttribute("aria-expanded") !== "true");
    });
  });
}

function setAccordionItemState(accordionItemElement, shouldOpen) {
  const triggerButtonElement = accordionItemElement.querySelector(".accordion__trigger");
  const panelElement = accordionItemElement.querySelector(".accordion__panel");
  triggerButtonElement.setAttribute("aria-expanded", String(shouldOpen));
  accordionItemElement.classList.toggle("is-open", shouldOpen);
  panelElement.inert = !shouldOpen;
}

/* Clears a field error as soon as the user edits it, unless the field validates itself live */
function initializeErrorClearingOnInput() {
  document.addEventListener("input", (inputEvent) => {
    const editedFieldElement = inputEvent.target;
    if (!editedFieldElement.closest || editedFieldElement.dataset.liveValidation !== undefined) return;
    if (editedFieldElement.closest(".has-error")) setFieldErrorState(editedFieldElement, "");
  });
}

/* Writes the current year into every footer year placeholder */
function renderCurrentYear() {
  document.querySelectorAll("[data-current-year]").forEach((yearElement) => {
    yearElement.textContent = new Date().getFullYear();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  revealPageOnLoad();
  initializePageTransitions();
  initializeStickyHeader();
  initializeMobileNavigation();
  initializeScrollReveal();
  initializeAnimatedCounters();
  initializeSliders();
  initializeAccordions();
  renderWorkshopOpeningStatus();
  initializeErrorClearingOnInput();
  renderCurrentYear();
});
