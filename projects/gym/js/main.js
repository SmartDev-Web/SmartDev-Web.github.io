/* ==========================================================================
   IronPulse — shared behaviour for every page
   Header state, mobile navigation, page transitions, scroll reveal,
   animated counters, split typography, toast messages and form helpers
   ========================================================================== */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    const isInternalPageLink = linkHref.endsWith(".html") && !clickedLinkElement.target && !linkHref.startsWith("http");
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
  const formatCounterValue = (numericValue) => Math.round(numericValue).toLocaleString("fr-FR") + counterSuffix;
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

/* Splits headline text into individually animated letters */
function initializeSplitTypography() {
  let globalLetterIndex = 0;
  document.querySelectorAll("[data-split-letters]").forEach((splitTextElement) => {
    const originalText = splitTextElement.textContent.trim();
    splitTextElement.setAttribute("aria-label", originalText);
    splitTextElement.textContent = "";
    [...originalText].forEach((characterValue) => {
      const letterElement = document.createElement("span");
      letterElement.className = characterValue === " " ? "split-letter split-letter--space" : "split-letter";
      letterElement.setAttribute("aria-hidden", "true");
      letterElement.style.setProperty("--letter-index", globalLetterIndex);
      letterElement.textContent = characterValue === " " ? " " : characterValue;
      splitTextElement.appendChild(letterElement);
      globalLetterIndex += 1;
    });
  });
}

/* Wires previous/next buttons to a horizontally scrolling slider track */
function initializeSliders() {
  document.querySelectorAll("[data-slider]").forEach((sliderElement) => {
    const sliderTrackElement = sliderElement.querySelector("[data-slider-track]");
    const scrollSliderByDirection = (scrollDirection) => {
      const firstSlideElement = sliderTrackElement.firstElementChild;
      const slideStepWidth = firstSlideElement ? firstSlideElement.getBoundingClientRect().width + 22 : 300;
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
  if (fieldWrapperElement) fieldWrapperElement.classList.toggle("has-error", Boolean(errorMessageText));
  fieldInputElement.setAttribute("aria-invalid", errorMessageText ? "true" : "false");
  if (fieldErrorElement) fieldErrorElement.textContent = errorMessageText || "";
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
  initializeSplitTypography();
  revealPageOnLoad();
  initializePageTransitions();
  initializeStickyHeader();
  initializeMobileNavigation();
  initializeScrollReveal();
  initializeAnimatedCounters();
  initializeSliders();
  initializeErrorClearingOnInput();
  renderCurrentYear();
});
