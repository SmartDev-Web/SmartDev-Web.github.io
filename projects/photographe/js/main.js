/* Lumen Studio - shared behaviours (navigation, transitions, reveal, counters, forms, hero slideshow) */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Formats a euro amount with French separators */
function formatEuros(numericValue) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(numericValue) + " €";
}

/* Fades the page out and navigates once the fade-out animation ends */
function navigateWithPageFade(destinationUrl) {
  if (prefersReducedMotion) {
    window.location.href = destinationUrl;
    return;
  }
  document.body.addEventListener("animationend", function handlePageFadeEnd(animationEvent) {
    if (animationEvent.target === document.body && animationEvent.animationName === "pageFadeOut") {
      document.body.removeEventListener("animationend", handlePageFadeEnd);
      window.location.href = destinationUrl;
    }
  });
  document.body.classList.add("page-is-leaving");
}

/* Intercepts internal page links to play the fade-out transition */
function initializePageTransitions() {
  document.addEventListener("click", function (clickEvent) {
    const linkElement = clickEvent.target.closest("a[href]");
    if (!linkElement || clickEvent.defaultPrevented || clickEvent.metaKey || clickEvent.ctrlKey || clickEvent.shiftKey || clickEvent.button !== 0 || linkElement.target === "_blank") {
      return;
    }
    const destinationUrl = new URL(linkElement.href, window.location.href);
    const isInternalPage = destinationUrl.origin === window.location.origin && /\.html$/.test(destinationUrl.pathname);
    const isSamePageAnchor = destinationUrl.pathname === window.location.pathname && destinationUrl.hash;
    if (!isInternalPage || isSamePageAnchor) {
      return;
    }
    clickEvent.preventDefault();
    navigateWithPageFade(destinationUrl.href);
  });
  window.addEventListener("pageshow", function () {
    document.body.classList.remove("page-is-leaving");
  });
}

/* Switches the header to its compact style after scrolling */
function initializeStickyHeader() {
  const siteHeaderElement = document.querySelector(".site-header");
  const updateHeaderState = function () {
    siteHeaderElement.classList.toggle("is-scrolled", window.scrollY > 30);
  };
  window.addEventListener("scroll", updateHeaderState, { passive: true });
  updateHeaderState();
}

/* Opens and closes the full-screen mobile navigation panel */
function initializeBurgerMenu() {
  const burgerButtonElement = document.querySelector(".burger-button");
  const navigationPanelElement = document.getElementById(burgerButtonElement.getAttribute("aria-controls"));
  const siteHeaderElement = document.querySelector(".site-header");
  const setMenuState = function (shouldOpen) {
    burgerButtonElement.setAttribute("aria-expanded", String(shouldOpen));
    burgerButtonElement.textContent = shouldOpen ? "Fermer" : "Menu";
    navigationPanelElement.classList.toggle("is-open", shouldOpen);
    siteHeaderElement.classList.toggle("menu-is-open", shouldOpen);
    document.body.classList.toggle("scroll-is-locked", shouldOpen);
  };
  burgerButtonElement.addEventListener("click", function () {
    setMenuState(burgerButtonElement.getAttribute("aria-expanded") !== "true");
  });
  document.addEventListener("keydown", function (keyboardEvent) {
    if (keyboardEvent.key === "Escape" && navigationPanelElement.classList.contains("is-open")) {
      setMenuState(false);
      burgerButtonElement.focus();
    }
  });
  window.matchMedia("(min-width: 861px)").addEventListener("change", function () {
    setMenuState(false);
  });
}

/* Reveals elements when they enter the viewport */
function initializeScrollReveal() {
  const revealElements = document.querySelectorAll(".reveal, .reveal-image");
  if (!("IntersectionObserver" in window) || prefersReducedMotion) {
    revealElements.forEach(function (revealElement) { revealElement.classList.add("is-visible"); });
    return;
  }
  const revealObserver = new IntersectionObserver(function (observerEntries) {
    observerEntries.forEach(function (observerEntry) {
      if (observerEntry.isIntersecting) {
        observerEntry.target.classList.add("is-visible");
        revealObserver.unobserve(observerEntry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  revealElements.forEach(function (revealElement) { revealObserver.observe(revealElement); });
}

/* Animates numeric counters with requestAnimationFrame once visible */
function initializeAnimatedCounters() {
  const counterElements = document.querySelectorAll("[data-counter-target]");
  const animateCounter = function (counterElement) {
    const targetValue = Number(counterElement.dataset.counterTarget);
    const valueSuffix = counterElement.dataset.counterSuffix || "";
    const animationDuration = 1600;
    let animationStartTime = null;
    const renderFrame = function (frameTimestamp) {
      animationStartTime = animationStartTime === null ? frameTimestamp : animationStartTime;
      const progressRatio = prefersReducedMotion ? 1 : Math.min((frameTimestamp - animationStartTime) / animationDuration, 1);
      counterElement.textContent = Math.round(targetValue * (1 - Math.pow(1 - progressRatio, 3))).toLocaleString("fr-FR") + valueSuffix;
      if (progressRatio < 1) {
        requestAnimationFrame(renderFrame);
      }
    };
    requestAnimationFrame(renderFrame);
  };
  const counterObserver = new IntersectionObserver(function (observerEntries) {
    observerEntries.forEach(function (observerEntry) {
      if (observerEntry.isIntersecting) {
        animateCounter(observerEntry.target);
        counterObserver.unobserve(observerEntry.target);
      }
    });
  }, { threshold: 0.6 });
  counterElements.forEach(function (counterElement) { counterObserver.observe(counterElement); });
}

/* Returns the French message describing why a control is invalid */
function getFieldErrorMessage(formControlElement) {
  const controlValidity = formControlElement.validity;
  if (formControlElement.dataset.customError) {
    return formControlElement.dataset.customError;
  }
  if (controlValidity.valueMissing) {
    if (formControlElement.type === "checkbox") {
      return "Merci de cocher cette case.";
    }
    return formControlElement.type === "radio" ? "Merci de choisir une option." : "Ce champ est obligatoire.";
  }
  if (controlValidity.typeMismatch && formControlElement.type === "email") {
    return "Adresse e-mail invalide (ex. : prenom@domaine.fr).";
  }
  if (controlValidity.patternMismatch) {
    return formControlElement.dataset.patternMessage || "Format invalide.";
  }
  if (controlValidity.rangeUnderflow || controlValidity.rangeOverflow) {
    return formControlElement.dataset.rangeMessage || "Valeur hors limites.";
  }
  if (controlValidity.tooShort) {
    return "Merci de saisir au moins " + formControlElement.minLength + " caractères.";
  }
  return "";
}

/* Validates one control and updates its error message */
function validateFormControl(formControlElement) {
  const formFieldElement = formControlElement.closest(".form-field, .form-consent");
  const errorMessageElement = formFieldElement ? formFieldElement.querySelector(".form-error") : null;
  const errorMessage = formControlElement.checkValidity() ? "" : getFieldErrorMessage(formControlElement);
  if (formFieldElement) {
    formFieldElement.classList.toggle("has-error", Boolean(errorMessage));
  }
  if (errorMessageElement) {
    errorMessageElement.textContent = errorMessage;
  }
  formControlElement.setAttribute("aria-invalid", String(Boolean(errorMessage)));
  return !errorMessage;
}

/* Validates forms flagged with data-validate and reveals their success panel */
function initializeValidatedForms() {
  document.querySelectorAll("form[data-validate]").forEach(function (validatedFormElement) {
    const formControlElements = Array.from(validatedFormElement.querySelectorAll("input, select, textarea"));
    validatedFormElement.setAttribute("novalidate", "");
    formControlElements.forEach(function (formControlElement) {
      const revalidate = function () {
        if (formControlElement.getAttribute("aria-invalid") === "true") {
          validateFormControl(formControlElement);
        }
      };
      formControlElement.addEventListener("blur", function () { validateFormControl(formControlElement); });
      formControlElement.addEventListener("input", revalidate);
      formControlElement.addEventListener("change", revalidate);
    });
    validatedFormElement.addEventListener("submit", function (submitEvent) {
      submitEvent.preventDefault();
      const invalidControlElements = formControlElements.filter(function (formControlElement) {
        return !validateFormControl(formControlElement);
      });
      if (invalidControlElements.length) {
        invalidControlElements[0].focus();
        return;
      }
      const successPanelElement = document.getElementById(validatedFormElement.dataset.successTarget);
      const firstNameControl = validatedFormElement.querySelector("[name='prenom']");
      const successNameElement = successPanelElement.querySelector("[data-success-name]");
      if (successNameElement && firstNameControl) {
        successNameElement.textContent = firstNameControl.value.trim();
      }
      validatedFormElement.hidden = true;
      successPanelElement.hidden = false;
      successPanelElement.focus();
      validatedFormElement.dispatchEvent(new CustomEvent("form:success"));
    });
  });
}

/* Builds one progress button of the hero slideshow */
function createSlideshowDotElement(slideIndex) {
  const dotElement = document.createElement("button");
  dotElement.className = "slideshow-dot";
  dotElement.type = "button";
  dotElement.dataset.slideIndex = String(slideIndex);
  dotElement.setAttribute("aria-label", "Afficher la photo " + (slideIndex + 1));
  dotElement.append(document.createElement("span"));
  return dotElement;
}

/* Home hero: crossfading main figure advanced by the progress bar animationend event */
function initializeHeroSlideshow() {
  const heroFigureElement = document.querySelector("[data-hero-slideshow]");
  if (!heroFigureElement) {
    return;
  }
  const slideElements = Array.from(heroFigureElement.querySelectorAll(".hero-spread__slide"));
  const dotsContainerElement = heroFigureElement.querySelector(".slideshow-dots");
  const captionElement = heroFigureElement.querySelector(".slideshow-caption");
  const figureNumberElement = captionElement.querySelector(".figure-caption__number");
  const captionTextNode = document.createTextNode("");
  let activeSlideIndex = 0;
  captionElement.replaceChildren(figureNumberElement, captionTextNode);
  const dotElements = slideElements.map(function (slideElement, slideIndex) { return createSlideshowDotElement(slideIndex); });
  dotsContainerElement.replaceChildren(...dotElements);
  const showSlide = function (targetSlideIndex) {
    activeSlideIndex = (targetSlideIndex + slideElements.length) % slideElements.length;
    slideElements.forEach(function (slideElement, slideIndex) {
      slideElement.classList.toggle("is-active", slideIndex === activeSlideIndex);
      slideElement.setAttribute("aria-hidden", String(slideIndex !== activeSlideIndex));
    });
    dotElements.forEach(function (dotElement, dotIndex) {
      dotElement.removeAttribute("aria-current");
      if (dotIndex === activeSlideIndex) {
        void dotElement.offsetWidth;
        dotElement.setAttribute("aria-current", "true");
      }
    });
    captionTextNode.textContent = " — " + slideElements[activeSlideIndex].dataset.caption + " · " + String(activeSlideIndex + 1).padStart(2, "0") + "/" + String(slideElements.length).padStart(2, "0");
  };
  dotsContainerElement.addEventListener("click", function (clickEvent) {
    const dotElement = clickEvent.target.closest("[data-slide-index]");
    if (dotElement) {
      showSlide(Number(dotElement.dataset.slideIndex));
    }
  });
  dotsContainerElement.addEventListener("animationend", function (animationEvent) {
    if (animationEvent.animationName === "slideProgress" && !prefersReducedMotion) {
      showSlide(activeSlideIndex + 1);
    }
  });
  showSlide(0);
}

/* Writes the current year in the footer */
function renderFooterYear() {
  document.querySelectorAll("[data-current-year]").forEach(function (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initializePageTransitions();
  initializeStickyHeader();
  initializeBurgerMenu();
  initializeScrollReveal();
  initializeAnimatedCounters();
  initializeValidatedForms();
  initializeHeroSlideshow();
  renderFooterYear();
});
