/* ==========================================================================
   Echoes Festival — shared behaviours (header, navigation, reveal, modal)
   ========================================================================== */

const prefersReducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

/* Returns true when the visitor asked the system to limit motion. */
function isReducedMotionPreferred() {
  return prefersReducedMotionQuery.matches;
}

/* Toggles the compact header style once the page is scrolled. */
function initializeStickyHeader() {
  const siteHeaderElement = document.querySelector("[data-site-header]");
  if (!siteHeaderElement) return;
  const updateHeaderState = () => {
    siteHeaderElement.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  updateHeaderState();
  window.addEventListener("scroll", updateHeaderState, { passive: true });
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
  window.matchMedia("(min-width: 961px)").addEventListener("change", (mediaEvent) => {
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

/* Animates a numeric value between two numbers using requestAnimationFrame. */
function animateNumericValue(startValue, endValue, durationInMilliseconds, onFrame) {
  if (isReducedMotionPreferred() || durationInMilliseconds <= 0) {
    onFrame(endValue);
    return;
  }
  const animationStartTime = performance.now();
  const renderFrame = (currentTime) => {
    const progressRatio = Math.min((currentTime - animationStartTime) / durationInMilliseconds, 1);
    const easedRatio = 1 - Math.pow(1 - progressRatio, 3);
    onFrame(startValue + (endValue - startValue) * easedRatio);
    if (progressRatio < 1) requestAnimationFrame(renderFrame);
  };
  requestAnimationFrame(renderFrame);
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
      answerElement.style.height = isOpening ? answerElement.scrollHeight + "px" : "0px";
    });
  });
}

const modalState = { lastFocusedElement: null };

/* Opens a modal dialog, traps focus inside it and remembers the trigger. */
function openModal(modalElement) {
  modalState.lastFocusedElement = document.activeElement;
  modalElement.classList.add("is-open");
  modalElement.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  modalElement.querySelector("button[data-modal-close]").focus();
}

/* Closes a modal dialog and restores focus to its trigger. */
function closeModal(modalElement) {
  modalElement.classList.remove("is-open");
  modalElement.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (modalState.lastFocusedElement) modalState.lastFocusedElement.focus();
}

/* Wires closing behaviours (button, backdrop, Escape, focus trap) for every modal. */
function initializeModals() {
  document.querySelectorAll("[data-modal]").forEach((modalElement) => {
    modalElement.addEventListener("click", (clickEvent) => {
      if (clickEvent.target.closest("[data-modal-close]")) closeModal(modalElement);
    });
    modalElement.addEventListener("keydown", (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") closeModal(modalElement);
      if (keyboardEvent.key !== "Tab") return;
      const focusableElements = modalElement.querySelectorAll("button:not([disabled]), a[href]");
      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];
      if (keyboardEvent.shiftKey && document.activeElement === firstFocusableElement) {
        keyboardEvent.preventDefault();
        lastFocusableElement.focus();
      } else if (!keyboardEvent.shiftKey && document.activeElement === lastFocusableElement) {
        keyboardEvent.preventDefault();
        firstFocusableElement.focus();
      }
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
  initializeModals();
});
