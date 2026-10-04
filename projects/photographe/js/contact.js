/* Lumen Studio - contact page: date availability, quote prefill and booking form */

const BOOKED_DATES = ["2026-10-17", "2026-10-24", "2026-11-07", "2027-05-22", "2027-05-29", "2027-06-05", "2027-06-12", "2027-06-19", "2027-06-26", "2027-07-03", "2027-07-10", "2027-08-28", "2027-09-04", "2027-09-11"];
const HIGH_SEASON_MONTHS = [5, 6, 7, 8, 9];

/* Returns the availability state and message for an ISO date */
function describeDateAvailability(isoDate) {
  const selectedDate = new Date(isoDate + "T12:00:00");
  const tomorrowDate = new Date();
  tomorrowDate.setHours(0, 0, 0, 0);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  if (Number.isNaN(selectedDate.getTime())) {
    return { state: "", message: "" };
  }
  if (selectedDate < tomorrowDate) {
    return { state: "booked", message: "Merci de choisir une date future." };
  }
  if (BOOKED_DATES.includes(isoDate)) {
    return { state: "booked", message: "Cette date est déjà réservée. Écrivez-moi quand même : un photographe associé peut être disponible." };
  }
  const isWeekend = selectedDate.getDay() === 6 || selectedDate.getDay() === 0;
  if (isWeekend && HIGH_SEASON_MONTHS.includes(selectedDate.getMonth() + 1)) {
    return { state: "limited", message: "Disponible — haute saison, les week-ends partent vite. Réponse sous 24 h recommandée." };
  }
  return { state: "available", message: "Bonne nouvelle, cette date est disponible." };
}

/* Updates the availability indicator and custom validity of the date input */
function updateDateAvailability() {
  const eventDateElement = document.getElementById("booking-date");
  const availabilityStatusElement = document.getElementById("date-availability");
  const availability = describeDateAvailability(eventDateElement.value);
  availabilityStatusElement.dataset.state = availability.state;
  availabilityStatusElement.textContent = availability.message;
  if (availability.state === "booked") {
    eventDateElement.dataset.customError = availability.message;
    eventDateElement.setCustomValidity(availability.message);
  } else {
    delete eventDateElement.dataset.customError;
    eventDateElement.setCustomValidity("");
  }
  if (eventDateElement.value) {
    validateFormControl(eventDateElement);
  }
}

/* Builds the booking message for a package or a configurator quote passed in the URL, or returns an empty string */
function buildQuoteMessageFromUrl() {
  const urlParameters = new URLSearchParams(window.location.search);
  const packageKey = urlParameters.get("formule");
  if (isKnownKey(PACKAGE_OFFERS, packageKey)) {
    return "Bonjour Camille, je souhaite réserver la " + PACKAGE_OFFERS[packageKey].label + " (" + formatEuros(PACKAGE_OFFERS[packageKey].total) + " TTC).";
  }
  const configuration = parseConfigurationQuery(urlParameters);
  if (!configuration) {
    return "";
  }
  const quote = computeQuote(configuration);
  return "Bonjour Camille, je souhaite réserver la configuration suivante : " + quote.lines.map(function (quoteLine) { return quoteLine.label; }).join(", ") + " — total estimé " + formatEuros(quote.total) + ".";
}

/* Prefills the message with a validated quote built on the services page */
function prefillQuoteFromUrl() {
  const quoteMessage = buildQuoteMessageFromUrl();
  if (!quoteMessage) {
    return;
  }
  document.getElementById("booking-message").value = quoteMessage;
  document.getElementById("quote-notice").hidden = false;
  document.getElementById("event-mariage").checked = true;
}

document.addEventListener("DOMContentLoaded", function () {
  const eventDateElement = document.getElementById("booking-date");
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  eventDateElement.min = tomorrowDate.getFullYear() + "-" + String(tomorrowDate.getMonth() + 1).padStart(2, "0") + "-" + String(tomorrowDate.getDate()).padStart(2, "0");
  eventDateElement.addEventListener("input", updateDateAvailability);
  eventDateElement.addEventListener("change", updateDateAvailability);
  prefillQuoteFromUrl();
});
