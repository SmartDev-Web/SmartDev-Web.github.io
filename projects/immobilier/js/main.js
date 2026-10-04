/* Horizon Immobilier - shared behaviours (navigation, reveal, favorites, cards, forms) */

const FAVORITES_STORAGE_KEY = "horizon-immobilier-favorites";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SVG_ICONS = {
  heart: '<svg viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.8 3.6 4.5 7.1-1.8 4.8-9.3 9.4-9.3 9.4z"/></svg>',
  surface: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 3h18v18H3z"/><path d="M3 9h6V3M15 21v-6h6"/></svg>',
  rooms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-7h6v7"/></svg>',
  bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 18V6M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>'
};

/* Formats a number with French thousands separators */
function formatNumber(numericValue, maximumFractionDigits) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: maximumFractionDigits || 0 }).format(numericValue);
}

/* Formats a euro amount */
function formatEuros(numericValue, maximumFractionDigits) {
  return formatNumber(numericValue, maximumFractionDigits) + " €";
}

/* Returns the display price of a listing, monthly for rentals */
function formatListingPrice(propertyListing) {
  if (propertyListing.transaction === "location") {
    return formatEuros(propertyListing.price) + " <small>/ mois CC</small>";
  }
  return formatEuros(propertyListing.price);
}

/* Computes the constant monthly payment of an amortizing loan */
function computeMonthlyLoanPayment(loanPrincipal, annualRatePercent, durationInYears) {
  const monthlyRate = annualRatePercent / 100 / 12;
  const numberOfPayments = durationInYears * 12;
  if (loanPrincipal <= 0) {
    return 0;
  }
  if (monthlyRate === 0) {
    return loanPrincipal / numberOfPayments;
  }
  return loanPrincipal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -numberOfPayments));
}

/* Finds a listing by its identifier */
function findListingById(listingIdentifier) {
  return PROPERTY_LISTINGS.find(function (propertyListing) { return propertyListing.id === listingIdentifier; });
}

/* Reads the favorite listing identifiers from localStorage */
function readFavoriteListingIds() {
  try {
    const storedValue = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
    return Array.isArray(storedValue) ? storedValue : [];
  } catch (storageError) {
    return [];
  }
}

/* Persists the favorite listing identifiers */
function persistFavoriteListingIds(favoriteListingIds) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteListingIds));
  } catch (storageError) {
    return;
  }
}

/* Adds or removes a listing from favorites and notifies the page */
function toggleFavoriteListing(listingIdentifier) {
  const favoriteListingIds = readFavoriteListingIds();
  const existingIndex = favoriteListingIds.indexOf(listingIdentifier);
  if (existingIndex === -1) {
    favoriteListingIds.push(listingIdentifier);
  } else {
    favoriteListingIds.splice(existingIndex, 1);
  }
  persistFavoriteListingIds(favoriteListingIds);
  refreshFavoriteIndicators();
  document.dispatchEvent(new CustomEvent("favorites:change", { detail: { favoriteListingIds: favoriteListingIds } }));
}

/* Synchronises every heart button and the header counter with stored favorites */
function refreshFavoriteIndicators() {
  const favoriteListingIds = readFavoriteListingIds();
  document.querySelectorAll("[data-favorite-id]").forEach(function (favoriteButtonElement) {
    const isFavorite = favoriteListingIds.includes(favoriteButtonElement.dataset.favoriteId);
    favoriteButtonElement.setAttribute("aria-pressed", String(isFavorite));
    favoriteButtonElement.setAttribute("aria-label", isFavorite ? "Retirer des favoris" : "Ajouter aux favoris");
  });
  document.querySelectorAll("[data-favorites-count]").forEach(function (favoritesCountElement) {
    favoritesCountElement.textContent = favoriteListingIds.length;
    favoritesCountElement.dataset.count = favoriteListingIds.length;
  });
}

/* Builds the markup of a listing card used on the home and listings pages */
function createListingCardMarkup(propertyListing) {
  const transactionLabel = propertyListing.transaction === "location" ? "À louer" : "À vendre";
  const freshBadge = propertyListing.publishedDays <= 3 ? '<span class="badge badge--gold">Nouveau</span>' : "";
  const bedroomSpec = propertyListing.bedrooms > 0 ? "<li>" + SVG_ICONS.bed + propertyListing.bedrooms + " ch.</li>" : "";
  return '<article class="listing-card">' +
    '<div class="listing-card__media">' +
    '<img src="' + buildPropertyImageUrl(propertyListing.images[0], 800) + '" alt="' + propertyListing.title + " à " + propertyListing.city + '" loading="lazy" width="800" height="600">' +
    '<div class="listing-card__badges"><span class="badge">' + transactionLabel + "</span>" + freshBadge + "</div>" +
    '<button class="favorite-button" type="button" data-favorite-id="' + propertyListing.id + '" aria-pressed="false" aria-label="Ajouter aux favoris">' + SVG_ICONS.heart + "</button>" +
    "</div>" +
    '<div class="listing-card__body">' +
    '<p class="listing-card__location">' + propertyListing.city + " · " + PROPERTY_TYPE_LABELS[propertyListing.type] + "</p>" +
    '<h3 class="listing-card__title"><a href="bien.html?id=' + propertyListing.id + '">' + propertyListing.title + "</a></h3>" +
    '<ul class="listing-card__specs">' +
    "<li>" + SVG_ICONS.surface + propertyListing.surface + " m²</li>" +
    "<li>" + SVG_ICONS.rooms + propertyListing.rooms + " p.</li>" +
    bedroomSpec +
    "</ul>" +
    '<p class="listing-card__price">' + formatListingPrice(propertyListing) + "</p>" +
    "</div>" +
    "</article>";
}

/* Delegates clicks on heart buttons anywhere in the document */
function initializeFavoriteButtons() {
  document.addEventListener("click", function (clickEvent) {
    const favoriteButtonElement = clickEvent.target.closest("[data-favorite-id]");
    if (!favoriteButtonElement) {
      return;
    }
    clickEvent.preventDefault();
    toggleFavoriteListing(favoriteButtonElement.dataset.favoriteId);
  });
  refreshFavoriteIndicators();
}

/* Toggles the header style once the page is scrolled */
function initializeStickyHeader() {
  const siteHeaderElement = document.querySelector(".site-header");
  if (!siteHeaderElement) {
    return;
  }
  const updateHeaderState = function () {
    siteHeaderElement.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  window.addEventListener("scroll", updateHeaderState, { passive: true });
  updateHeaderState();
}

/* Opens and closes the mobile navigation */
function initializeBurgerMenu() {
  const burgerButtonElement = document.querySelector(".burger-button");
  const navigationListElement = document.querySelector(".main-nav__list");
  const siteHeaderElement = document.querySelector(".site-header");
  if (!burgerButtonElement || !navigationListElement) {
    return;
  }
  const setMenuState = function (shouldOpen) {
    burgerButtonElement.setAttribute("aria-expanded", String(shouldOpen));
    burgerButtonElement.setAttribute("aria-label", shouldOpen ? "Fermer le menu" : "Ouvrir le menu");
    navigationListElement.classList.toggle("is-open", shouldOpen);
    siteHeaderElement.classList.toggle("menu-is-open", shouldOpen);
    document.body.classList.toggle("scroll-is-locked", shouldOpen);
  };
  burgerButtonElement.addEventListener("click", function () {
    setMenuState(burgerButtonElement.getAttribute("aria-expanded") !== "true");
  });
  document.addEventListener("keydown", function (keyboardEvent) {
    if (keyboardEvent.key === "Escape" && navigationListElement.classList.contains("is-open")) {
      setMenuState(false);
      burgerButtonElement.focus();
    }
  });
  window.matchMedia("(min-width: 901px)").addEventListener("change", function () {
    setMenuState(false);
  });
}

/* Reveals elements as they enter the viewport */
function initializeScrollReveal() {
  const revealElements = document.querySelectorAll(".reveal");
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
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  revealElements.forEach(function (revealElement) { revealObserver.observe(revealElement); });
}

/* Animates a numeric counter from zero to its target with requestAnimationFrame */
function animateCounterElement(counterElement) {
  const targetValue = Number(counterElement.dataset.counterTarget);
  const valueSuffix = counterElement.dataset.counterSuffix || "";
  const animationDuration = 1800;
  if (prefersReducedMotion) {
    counterElement.textContent = formatNumber(targetValue) + valueSuffix;
    return;
  }
  let animationStartTime = null;
  const renderFrame = function (frameTimestamp) {
    if (animationStartTime === null) {
      animationStartTime = frameTimestamp;
    }
    const progressRatio = Math.min((frameTimestamp - animationStartTime) / animationDuration, 1);
    const easedRatio = 1 - Math.pow(1 - progressRatio, 3);
    counterElement.textContent = formatNumber(Math.round(targetValue * easedRatio)) + valueSuffix;
    if (progressRatio < 1) {
      requestAnimationFrame(renderFrame);
    }
  };
  requestAnimationFrame(renderFrame);
}

/* Starts counters once they become visible */
function initializeAnimatedCounters() {
  const counterElements = document.querySelectorAll("[data-counter-target]");
  if (!counterElements.length) {
    return;
  }
  const counterObserver = new IntersectionObserver(function (observerEntries) {
    observerEntries.forEach(function (observerEntry) {
      if (observerEntry.isIntersecting) {
        animateCounterElement(observerEntry.target);
        counterObserver.unobserve(observerEntry.target);
      }
    });
  }, { threshold: 0.5 });
  counterElements.forEach(function (counterElement) { counterObserver.observe(counterElement); });
}

/* Fades the page out, then navigates once the fade-out animation ends */
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

/* Fades the page out before following internal links */
function initializePageTransitions() {
  document.addEventListener("click", function (clickEvent) {
    const linkElement = clickEvent.target.closest("a[href]");
    if (!linkElement || clickEvent.defaultPrevented || clickEvent.metaKey || clickEvent.ctrlKey || clickEvent.shiftKey || clickEvent.button !== 0) {
      return;
    }
    const destinationUrl = new URL(linkElement.href, window.location.href);
    const isInternalPage = destinationUrl.origin === window.location.origin && /\.html$/.test(destinationUrl.pathname);
    const isSamePageAnchor = destinationUrl.pathname === window.location.pathname && destinationUrl.search === window.location.search && destinationUrl.hash;
    if (!isInternalPage || isSamePageAnchor || linkElement.target === "_blank" || prefersReducedMotion) {
      return;
    }
    clickEvent.preventDefault();
    navigateWithPageFade(destinationUrl.href);
  });
  window.addEventListener("pageshow", function () {
    document.body.classList.remove("page-is-leaving");
  });
}

/* Returns the French error message for an invalid form control */
function getFieldErrorMessage(formControlElement) {
  const controlValidity = formControlElement.validity;
  if (controlValidity.valueMissing) {
    return formControlElement.type === "checkbox" ? "Merci de cocher cette case." : "Ce champ est obligatoire.";
  }
  if (controlValidity.typeMismatch && formControlElement.type === "email") {
    return "Adresse e-mail invalide (ex. : nom@domaine.fr).";
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

/* Shows or clears the error message attached to a form control */
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

/* Validates forms flagged with data-validate and displays their success panel */
function initializeValidatedForms() {
  document.querySelectorAll("form[data-validate]").forEach(function (validatedFormElement) {
    const formControlElements = validatedFormElement.querySelectorAll("input, select, textarea");
    validatedFormElement.setAttribute("novalidate", "");
    formControlElements.forEach(function (formControlElement) {
      formControlElement.addEventListener("blur", function () { validateFormControl(formControlElement); });
      formControlElement.addEventListener("input", function () {
        if (formControlElement.getAttribute("aria-invalid") === "true") {
          validateFormControl(formControlElement);
        }
      });
    });
    validatedFormElement.addEventListener("submit", function (submitEvent) {
      submitEvent.preventDefault();
      const invalidControlElements = Array.from(formControlElements).filter(function (formControlElement) {
        return !validateFormControl(formControlElement);
      });
      if (invalidControlElements.length) {
        invalidControlElements[0].focus();
        return;
      }
      const successPanelElement = document.getElementById(validatedFormElement.dataset.successTarget);
      const firstNameControl = validatedFormElement.querySelector("[name='prenom']");
      const successNameElement = successPanelElement ? successPanelElement.querySelector("[data-success-name]") : null;
      if (successNameElement && firstNameControl) {
        successNameElement.textContent = firstNameControl.value.trim();
      }
      validatedFormElement.hidden = true;
      if (successPanelElement) {
        successPanelElement.hidden = false;
        successPanelElement.focus();
      }
    });
  });
}

/* Sets the earliest selectable date on date inputs to tomorrow */
function initializeDateInputs() {
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const isoTomorrow = tomorrowDate.toISOString().slice(0, 10);
  document.querySelectorAll("input[type='date'][data-min-tomorrow]").forEach(function (dateInputElement) {
    dateInputElement.min = isoTomorrow;
  });
}

/* Home page: transaction tabs and search redirection to the listings page */
function initializeHomeSearch() {
  const homeSearchFormElement = document.getElementById("home-search-form");
  if (!homeSearchFormElement) {
    return;
  }
  const transactionTabElements = homeSearchFormElement.querySelectorAll("[data-transaction-tab]");
  const budgetSelectElement = homeSearchFormElement.querySelector("#search-budget");
  const budgetOptionsByTransaction = {
    vente: [["", "Sans limite"], ["400000", "400 000 €"], ["700000", "700 000 €"], ["1000000", "1 000 000 €"], ["1500000", "1 500 000 €"], ["2500000", "2 500 000 €"]],
    location: [["", "Sans limite"], ["800", "800 € / mois"], ["1200", "1 200 € / mois"], ["1800", "1 800 € / mois"], ["2500", "2 500 € / mois"], ["3500", "3 500 € / mois"]]
  };
  let selectedTransaction = "vente";
  const renderBudgetOptions = function () {
    budgetSelectElement.innerHTML = budgetOptionsByTransaction[selectedTransaction].map(function (budgetOption) {
      return '<option value="' + budgetOption[0] + '">' + budgetOption[1] + "</option>";
    }).join("");
  };
  transactionTabElements.forEach(function (transactionTabElement) {
    transactionTabElement.addEventListener("click", function () {
      selectedTransaction = transactionTabElement.dataset.transactionTab;
      transactionTabElements.forEach(function (otherTabElement) {
        otherTabElement.setAttribute("aria-pressed", String(otherTabElement === transactionTabElement));
      });
      renderBudgetOptions();
    });
  });
  homeSearchFormElement.addEventListener("submit", function (submitEvent) {
    submitEvent.preventDefault();
    const searchParameters = new URLSearchParams({ transaction: selectedTransaction });
    const propertyTypeValue = homeSearchFormElement.querySelector("#search-type").value;
    const cityValue = homeSearchFormElement.querySelector("#search-city").value;
    if (propertyTypeValue) {
      searchParameters.set("type", propertyTypeValue);
    }
    if (cityValue) {
      searchParameters.set("ville", cityValue);
    }
    if (budgetSelectElement.value) {
      searchParameters.set("prixMax", budgetSelectElement.value);
    }
    navigateWithPageFade("annonces.html?" + searchParameters.toString());
  });
  renderBudgetOptions();
}

/* Fills every city select flagged with data-city-options */
function populateCitySelects() {
  document.querySelectorAll("select[data-city-options]").forEach(function (citySelectElement) {
    citySelectElement.insertAdjacentHTML("beforeend", PROPERTY_CITIES.map(function (cityName) {
      return '<option value="' + cityName + '">' + cityName + "</option>";
    }).join(""));
  });
}

/* Home page: renders the featured listings */
function renderFeaturedListings() {
  const featuredGridElement = document.getElementById("featured-listings");
  if (!featuredGridElement) {
    return;
  }
  featuredGridElement.innerHTML = PROPERTY_LISTINGS.filter(function (propertyListing) { return propertyListing.featured; }).slice(0, 6).map(createListingCardMarkup).join("");
  refreshFavoriteIndicators();
}

/* Writes the current year in the footer */
function renderFooterYear() {
  document.querySelectorAll("[data-current-year]").forEach(function (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  populateCitySelects();
  initializePageTransitions();
  initializeStickyHeader();
  initializeBurgerMenu();
  initializeFavoriteButtons();
  initializeScrollReveal();
  initializeAnimatedCounters();
  initializeValidatedForms();
  initializeDateInputs();
  initializeHomeSearch();
  renderFeaturedListings();
  renderFooterYear();
});
