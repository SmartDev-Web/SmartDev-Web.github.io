/* Horizon Immobilier - listings page: URL driven filters, sorting and favorites */

const SALE_PRICE_SCALE = [150000, 200000, 250000, 300000, 350000, 400000, 500000, 600000, 700000, 800000, 900000, 1000000, 1200000, 1400000, 1600000, 1800000, 2000000, 2500000, 3000000, 3500000];
const RENT_PRICE_SCALE = [500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1650, 1800, 2000, 2200, 2400, 2600, 2800, 3000, 3500];
const UNLIMITED_PRICE_INDEX = SALE_PRICE_SCALE.length;
const ALLOWED_SORT_VALUES = ["recent", "prix-asc", "prix-desc", "surface-desc"];
const ALLOWED_ROOM_VALUES = [2, 3, 4, 5];

const listingFiltersFormElement = document.getElementById("listing-filters-form");
const listingResultsElement = document.getElementById("listing-results");
const surfaceRangeElement = document.getElementById("filter-surface");
const priceRangeElement = document.getElementById("filter-price");
const sortSelectElement = document.getElementById("sort-select");

/* Returns the price scale matching the selected transaction */
function getActivePriceScale(transactionValue) {
  return transactionValue === "location" ? RENT_PRICE_SCALE : SALE_PRICE_SCALE;
}

/* Returns a URL parameter only when it belongs to a list of accepted values */
function readAllowedParameter(urlParameters, parameterName, allowedValues, fallbackValue) {
  const parameterValue = urlParameters.get(parameterName);
  return allowedValues.includes(parameterValue) ? parameterValue : fallbackValue;
}

/* Returns a bounded positive integer read from a URL parameter */
function readBoundedNumberParameter(urlParameters, parameterName, maximumValue) {
  const parameterValue = Math.round(Number(urlParameters.get(parameterName)));
  return Number.isFinite(parameterValue) && parameterValue > 0 ? Math.min(parameterValue, maximumValue) : 0;
}

/* Reads and validates the filter state from the current URL */
function readFilterStateFromUrl() {
  const urlParameters = new URLSearchParams(window.location.search);
  const requestedRooms = Number(urlParameters.get("pieces"));
  return {
    transaction: readAllowedParameter(urlParameters, "transaction", ["vente", "location"], ""),
    type: readAllowedParameter(urlParameters, "type", Object.keys(PROPERTY_TYPE_LABELS), ""),
    ville: readAllowedParameter(urlParameters, "ville", PROPERTY_CITIES, ""),
    pieces: ALLOWED_ROOM_VALUES.includes(requestedRooms) ? requestedRooms : 0,
    surfaceMin: readBoundedNumberParameter(urlParameters, "surfaceMin", Number(surfaceRangeElement.max)),
    prixMax: readBoundedNumberParameter(urlParameters, "prixMax", SALE_PRICE_SCALE[SALE_PRICE_SCALE.length - 1]),
    favoris: urlParameters.get("favoris") === "1",
    tri: readAllowedParameter(urlParameters, "tri", ALLOWED_SORT_VALUES, "recent")
  };
}

/* Writes the filter state into the URL without reloading the page */
function writeFilterStateToUrl(filterState) {
  const urlParameters = new URLSearchParams();
  Object.keys(filterState).forEach(function (filterKey) {
    const filterValue = filterState[filterKey];
    if (filterValue === "" || filterValue === 0 || filterValue === false || (filterKey === "tri" && filterValue === "recent")) {
      return;
    }
    urlParameters.set(filterKey, filterValue === true ? "1" : String(filterValue));
  });
  const queryString = urlParameters.toString();
  history.replaceState(null, "", window.location.pathname + (queryString ? "?" + queryString : ""));
}

/* Converts a stored maximum price into the matching slider position */
function getPriceIndexFromValue(maximumPrice, transactionValue) {
  if (!maximumPrice) {
    return UNLIMITED_PRICE_INDEX;
  }
  const matchingIndex = getActivePriceScale(transactionValue).findIndex(function (scaleValue) { return scaleValue >= maximumPrice; });
  return matchingIndex === -1 ? UNLIMITED_PRICE_INDEX : matchingIndex;
}

/* Updates the textual outputs beside the range sliders */
function renderRangeOutputs(filterState) {
  const priceSuffix = filterState.transaction === "location" ? " / mois" : "";
  document.getElementById("filter-surface-output").textContent = filterState.surfaceMin ? filterState.surfaceMin + " m² min." : "Indifférent";
  document.getElementById("filter-price-output").textContent = filterState.prixMax ? formatEuros(filterState.prixMax) + priceSuffix : "Sans limite";
}

/* Applies a filter state to every form control */
function applyFilterStateToForm(filterState) {
  listingFiltersFormElement.querySelector("input[name='transaction'][value='" + filterState.transaction + "']").checked = true;
  document.getElementById("filter-type").value = filterState.type;
  document.getElementById("filter-city").value = filterState.ville;
  const roomsRadioElement = listingFiltersFormElement.querySelector("input[name='pieces'][value='" + (filterState.pieces || "") + "']");
  if (roomsRadioElement) {
    roomsRadioElement.checked = true;
  }
  surfaceRangeElement.value = filterState.surfaceMin;
  priceRangeElement.value = getPriceIndexFromValue(filterState.prixMax, filterState.transaction);
  document.getElementById("filter-favorites").checked = filterState.favoris;
  sortSelectElement.value = filterState.tri;
}

/* Builds a filter state from the current form controls */
function readFilterStateFromForm() {
  const formData = new FormData(listingFiltersFormElement);
  const transactionValue = formData.get("transaction") || "";
  const priceIndex = Number(priceRangeElement.value);
  return {
    transaction: transactionValue,
    type: formData.get("type") || "",
    ville: formData.get("ville") || "",
    pieces: Number(formData.get("pieces")) || 0,
    surfaceMin: Number(surfaceRangeElement.value) || 0,
    prixMax: priceIndex >= UNLIMITED_PRICE_INDEX ? 0 : getActivePriceScale(transactionValue)[priceIndex],
    favoris: formData.get("favoris") === "1",
    tri: sortSelectElement.value
  };
}

/* Returns the listings matching a filter state, sorted as requested */
function getFilteredListings(filterState) {
  const favoriteListingIds = readFavoriteListingIds();
  const sortComparators = {
    "recent": function (firstListing, secondListing) { return firstListing.publishedDays - secondListing.publishedDays; },
    "prix-asc": function (firstListing, secondListing) { return firstListing.price - secondListing.price; },
    "prix-desc": function (firstListing, secondListing) { return secondListing.price - firstListing.price; },
    "surface-desc": function (firstListing, secondListing) { return secondListing.surface - firstListing.surface; }
  };
  const priceTransaction = filterState.transaction || "vente";
  return PROPERTY_LISTINGS.filter(function (propertyListing) {
    const matchesPrice = !filterState.prixMax || propertyListing.transaction !== priceTransaction || propertyListing.price <= filterState.prixMax;
    return (!filterState.transaction || propertyListing.transaction === filterState.transaction) &&
      (!filterState.type || propertyListing.type === filterState.type) &&
      (!filterState.ville || propertyListing.city === filterState.ville) &&
      (!filterState.pieces || propertyListing.rooms >= filterState.pieces) &&
      (!filterState.surfaceMin || propertyListing.surface >= filterState.surfaceMin) &&
      matchesPrice &&
      (!filterState.favoris || favoriteListingIds.includes(propertyListing.id));
  }).sort(sortComparators[filterState.tri] || sortComparators.recent);
}

/* Renders the result grid and counter for a filter state */
function renderListingResults(filterState) {
  const matchingListings = getFilteredListings(filterState);
  document.getElementById("results-count").textContent = matchingListings.length;
  document.getElementById("results-label").textContent = matchingListings.length > 1 ? "biens correspondent à votre recherche" : "bien correspond à votre recherche";
  if (!matchingListings.length) {
    listingResultsElement.innerHTML = filterState.favoris ?
      '<div class="empty-state"><h3>Aucun favori pour le moment</h3><p>Cliquez sur le cœur d\'une annonce pour la retrouver ici.</p></div>' :
      '<div class="empty-state"><h3>Aucun bien ne correspond</h3><p>Élargissez vos critères ou confiez-nous votre recherche : 40 % de nos biens sont vendus avant publication.</p></div>';
    return;
  }
  listingResultsElement.innerHTML = matchingListings.map(createListingCardMarkup).join("");
  listingResultsElement.querySelectorAll(".listing-card").forEach(function (listingCardElement, cardIndex) {
    listingCardElement.style.animationDelay = Math.min(cardIndex * 0.05, 0.4) + "s";
  });
  refreshFavoriteIndicators();
}

/* Synchronises form, URL and results after any change */
function handleFilterChange(changeEvent) {
  if (changeEvent && changeEvent.target.name === "transaction") {
    priceRangeElement.value = UNLIMITED_PRICE_INDEX;
  }
  const filterState = readFilterStateFromForm();
  renderRangeOutputs(filterState);
  writeFilterStateToUrl(filterState);
  renderListingResults(filterState);
}

/* Wires the listings page */
function initializeListingsPage() {
  const initialFilterState = readFilterStateFromUrl();
  const filtersToggleButtonElement = document.getElementById("filters-toggle-button");
  priceRangeElement.max = UNLIMITED_PRICE_INDEX;
  applyFilterStateToForm(initialFilterState);
  const normalizedFilterState = readFilterStateFromForm();
  renderRangeOutputs(normalizedFilterState);
  renderListingResults(normalizedFilterState);
  listingFiltersFormElement.addEventListener("input", handleFilterChange);
  listingFiltersFormElement.addEventListener("change", handleFilterChange);
  sortSelectElement.addEventListener("change", handleFilterChange);
  listingFiltersFormElement.addEventListener("submit", function (submitEvent) { submitEvent.preventDefault(); });
  document.getElementById("reset-filters-button").addEventListener("click", function () {
    listingFiltersFormElement.reset();
    sortSelectElement.value = "recent";
    priceRangeElement.value = UNLIMITED_PRICE_INDEX;
    handleFilterChange();
  });
  document.addEventListener("favorites:change", function () {
    if (document.getElementById("filter-favorites").checked) {
      renderListingResults(readFilterStateFromForm());
    }
  });
  filtersToggleButtonElement.addEventListener("click", function () {
    const shouldOpen = !listingFiltersFormElement.classList.contains("is-open");
    listingFiltersFormElement.classList.toggle("is-open", shouldOpen);
    filtersToggleButtonElement.setAttribute("aria-expanded", String(shouldOpen));
    filtersToggleButtonElement.textContent = shouldOpen ? "Masquer les filtres" : "Afficher les filtres";
  });
}

document.addEventListener("DOMContentLoaded", initializeListingsPage);
