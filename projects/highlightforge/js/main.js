/* ==========================================================================
   HighlightForge — shared behaviours (header, navigation, reveal, counters)
   ========================================================================== */

const prefersReducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

/* Returns true when the visitor asked the system to limit motion. */
function isReducedMotionPreferred() {
  return prefersReducedMotionQuery.matches;
}

/* Toggles the compact header style once a top-of-page sentinel leaves the viewport. */
function initializeStickyHeader() {
  const siteHeaderElement = document.querySelector("[data-site-header]");
  if (!siteHeaderElement || !("IntersectionObserver" in window)) return;
  const scrollSentinelElement = document.createElement("div");
  scrollSentinelElement.className = "scroll-sentinel";
  scrollSentinelElement.setAttribute("aria-hidden", "true");
  document.body.prepend(scrollSentinelElement);
  const headerObserver = new IntersectionObserver(([sentinelEntry]) => {
    siteHeaderElement.classList.toggle("is-scrolled", !sentinelEntry.isIntersecting);
  });
  headerObserver.observe(scrollSentinelElement);
}

/* Escapes a value before it is interpolated into an HTML template. */
function escapeHtml(rawValue) {
  return String(rawValue).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* Opens and closes the mobile navigation drawer. */
function initializeBurgerMenu() {
  const burgerButtonElement = document.querySelector("[data-burger]");
  const mainNavigationElement = document.querySelector("[data-main-nav]");
  if (!burgerButtonElement || !mainNavigationElement) return;
  const setMenuOpenState = (shouldOpen) => {
    burgerButtonElement.setAttribute("aria-expanded", String(shouldOpen));
    burgerButtonElement.setAttribute("aria-label", shouldOpen ? "Fermer le menu" : "Ouvrir le menu");
    mainNavigationElement.classList.toggle("is-open", shouldOpen);
    document.body.style.overflow = shouldOpen ? "hidden" : "";
  };
  burgerButtonElement.addEventListener("click", () => {
    setMenuOpenState(burgerButtonElement.getAttribute("aria-expanded") !== "true");
  });
  document.addEventListener("keydown", (keyboardEvent) => {
    if (keyboardEvent.key === "Escape") setMenuOpenState(false);
  });
  window.matchMedia("(min-width: 921px)").addEventListener("change", (mediaEvent) => {
    if (mediaEvent.matches) setMenuOpenState(false);
  });
}

/* Fades the page out before following internal links. */
function initializePageTransitions() {
  document.addEventListener("click", (clickEvent) => {
    const linkElement = clickEvent.target.closest("a[href]");
    if (!linkElement || clickEvent.defaultPrevented) return;
    const linkHref = linkElement.getAttribute("href");
    const isModifiedClick = clickEvent.metaKey || clickEvent.ctrlKey || clickEvent.shiftKey || clickEvent.button !== 0;
    const isInternalPage = !linkHref.startsWith("#") && !linkHref.startsWith("mailto:") && !linkHref.startsWith("http") && linkElement.target !== "_blank";
    if (!isInternalPage || isModifiedClick || isReducedMotionPreferred()) return;
    const destinationUrl = new URL(linkHref, window.location.href);
    if (destinationUrl.pathname === window.location.pathname && destinationUrl.hash) return;
    clickEvent.preventDefault();
    document.body.addEventListener("animationend", function handleLeaveAnimationEnd(animationEvent) {
      if (animationEvent.animationName !== "page-leave") return;
      document.body.removeEventListener("animationend", handleLeaveAnimationEnd);
      window.location.href = destinationUrl.href;
    });
    document.body.classList.add("is-leaving");
  });
  window.addEventListener("pageshow", (pageTransitionEvent) => {
    if (pageTransitionEvent.persisted) document.body.classList.remove("is-leaving");
  });
}

/* Reveals elements with the .reveal class as they enter the viewport. */
function initializeScrollReveal() {
  const revealElements = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || isReducedMotionPreferred()) {
    revealElements.forEach((revealElement) => revealElement.classList.add("is-visible"));
    return;
  }
  const revealObserver = new IntersectionObserver((observerEntries) => {
    observerEntries.forEach((observerEntry) => {
      if (!observerEntry.isIntersecting) return;
      observerEntry.target.classList.add("is-visible");
      revealObserver.unobserve(observerEntry.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  revealElements.forEach((revealElement) => revealObserver.observe(revealElement));
}

/* Formats a number with French thousands separators and optional decimals. */
function formatFrenchNumber(numericValue, decimalCount = 0) {
  return numericValue.toLocaleString("fr-FR", { minimumFractionDigits: decimalCount, maximumFractionDigits: decimalCount });
}

/* Animates a numeric value between two numbers using requestAnimationFrame and returns a function that cancels it. */
function animateNumericValue(startValue, endValue, durationInMilliseconds, onFrame) {
  if (isReducedMotionPreferred() || durationInMilliseconds <= 0) {
    onFrame(endValue);
    return () => {};
  }
  const animationStartTime = performance.now();
  let frameRequestId = 0;
  const renderFrame = (currentTime) => {
    const progressRatio = Math.min(Math.max((currentTime - animationStartTime) / durationInMilliseconds, 0), 1);
    const easedRatio = 1 - Math.pow(1 - progressRatio, 3);
    onFrame(startValue + (endValue - startValue) * easedRatio);
    if (progressRatio < 1) frameRequestId = requestAnimationFrame(renderFrame);
  };
  frameRequestId = requestAnimationFrame(renderFrame);
  return () => cancelAnimationFrame(frameRequestId);
}

/* Counts up every [data-counter] element once it becomes visible. */
function initializeAnimatedCounters() {
  const counterElements = document.querySelectorAll("[data-counter]");
  if (!counterElements.length) return;
  const startCounter = (counterElement) => {
    const targetValue = parseFloat(counterElement.dataset.counter);
    const decimalCount = parseInt(counterElement.dataset.decimals || "0", 10);
    const valueSuffix = counterElement.dataset.suffix || "";
    animateNumericValue(0, targetValue, 1800, (currentValue) => {
      counterElement.textContent = formatFrenchNumber(currentValue, decimalCount) + valueSuffix;
    });
  };
  if (!("IntersectionObserver" in window)) {
    counterElements.forEach(startCounter);
    return;
  }
  const counterObserver = new IntersectionObserver((observerEntries) => {
    observerEntries.forEach((observerEntry) => {
      if (!observerEntry.isIntersecting) return;
      startCounter(observerEntry.target);
      counterObserver.unobserve(observerEntry.target);
    });
  }, { threshold: 0.5 });
  counterElements.forEach((counterElement) => counterObserver.observe(counterElement));
}

/* Writes the current year inside every [data-current-year] element. */
function initializeCurrentYear() {
  document.querySelectorAll("[data-current-year]").forEach((yearElement) => {
    yearElement.textContent = String(new Date().getFullYear());
  });
}

/* Shows a short notification at the bottom of the screen. */
function showToastMessage(messageText) {
  let toastElement = document.querySelector("[data-toast]");
  if (!toastElement) {
    toastElement = document.createElement("div");
    toastElement.className = "toast";
    toastElement.setAttribute("data-toast", "");
    toastElement.setAttribute("role", "status");
    toastElement.setAttribute("aria-live", "polite");
    toastElement.addEventListener("animationend", () => toastElement.classList.remove("is-visible"));
    document.body.appendChild(toastElement);
  }
  toastElement.textContent = messageText;
  toastElement.classList.remove("is-visible");
  void toastElement.offsetWidth;
  toastElement.classList.add("is-visible");
}

/* Wires the expandable FAQ accordion with animated height. */
function initializeAccordion() {
  document.querySelectorAll("[data-faq-item]").forEach((faqItemElement) => {
    const questionButtonElement = faqItemElement.querySelector("[data-faq-question]");
    const answerElement = faqItemElement.querySelector("[data-faq-answer]");
    questionButtonElement.addEventListener("click", () => {
      const isOpening = !faqItemElement.classList.contains("is-open");
      faqItemElement.classList.toggle("is-open", isOpening);
      questionButtonElement.setAttribute("aria-expanded", String(isOpening));
      if (!isOpening) {
        answerElement.style.height = answerElement.scrollHeight + "px";
        void answerElement.offsetHeight;
      }
      answerElement.style.height = isOpening ? answerElement.scrollHeight + "px" : "0px";
    });
    answerElement.addEventListener("transitionend", (transitionEvent) => {
      if (transitionEvent.target === answerElement && transitionEvent.propertyName === "height" && faqItemElement.classList.contains("is-open")) answerElement.style.height = "auto";
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeStickyHeader();
  initializeBurgerMenu();
  initializePageTransitions();
  initializeScrollReveal();
  initializeAnimatedCounters();
  initializeCurrentYear();
  initializeAccordion();
});
