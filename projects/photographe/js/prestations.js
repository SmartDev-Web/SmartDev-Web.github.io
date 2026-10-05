/* Lumen Studio - services page: interactive price configurator (pricing logic lives in pricing.js) */

const CONFIGURATOR_STORAGE_KEY = "lumen-studio-configuration";

const configuratorFormElement = document.getElementById("price-configurator");
let displayedTotalAmount = 0;
let totalAnimationFrameId = 0;

/* Reads the configurator form into a validated configuration object */
function readConfiguration() {
  const formData = new FormData(configuratorFormElement);
  return sanitizeConfiguration({
    hours: Number(formData.get("heures")),
    album: formData.get("album"),
    secondShooter: formData.get("second") === "oui",
    extras: Object.keys(EXTRA_OPTIONS).filter(function (extraKey) { return formData.get(extraKey) === "oui"; })
  });
}

/* Animates the displayed total towards a target amount */
function animateTotalAmount(targetAmount) {
  const totalElement = document.getElementById("quote-total");
  const startingAmount = displayedTotalAmount;
  const animationDuration = prefersReducedMotion ? 0 : 500;
  let animationStartTime = null;
  cancelAnimationFrame(totalAnimationFrameId);
  const renderFrame = function (frameTimestamp) {
    animationStartTime = animationStartTime === null ? frameTimestamp : animationStartTime;
    const progressRatio = animationDuration ? Math.min((frameTimestamp - animationStartTime) / animationDuration, 1) : 1;
    displayedTotalAmount = Math.round(startingAmount + (targetAmount - startingAmount) * (1 - Math.pow(1 - progressRatio, 3)));
    totalElement.textContent = formatEuros(displayedTotalAmount);
    if (progressRatio < 1) {
      totalAnimationFrameId = requestAnimationFrame(renderFrame);
    }
  };
  totalAnimationFrameId = requestAnimationFrame(renderFrame);
}

/* Persists the configuration so it survives a reload */
function persistConfiguration(configuration) {
  try {
    localStorage.setItem(CONFIGURATOR_STORAGE_KEY, JSON.stringify(configuration));
  } catch (storageError) {
    return;
  }
}

/* Loads the stored configuration, validated, or null when absent or unreadable */
function loadStoredConfiguration() {
  try {
    const storedValue = localStorage.getItem(CONFIGURATOR_STORAGE_KEY);
    return storedValue ? sanitizeConfiguration(JSON.parse(storedValue)) : null;
  } catch (storageError) {
    return null;
  }
}

/* Restores a stored configuration into the form */
function restoreConfiguration() {
  const storedConfiguration = loadStoredConfiguration();
  if (!storedConfiguration) {
    return;
  }
  configuratorFormElement.elements.heures.value = storedConfiguration.hours;
  Array.from(configuratorFormElement.elements.album).forEach(function (albumRadioElement) {
    albumRadioElement.checked = albumRadioElement.value === storedConfiguration.album;
  });
  configuratorFormElement.elements.second.checked = storedConfiguration.secondShooter;
  Object.keys(EXTRA_OPTIONS).forEach(function (extraKey) {
    configuratorFormElement.elements[extraKey].checked = storedConfiguration.extras.includes(extraKey);
  });
}

/* Builds one summary line element with a label and a formatted amount */
function createQuoteLineElement(quoteLine) {
  const lineElement = document.createElement("li");
  const labelElement = document.createElement("span");
  const amountElement = document.createElement("span");
  labelElement.textContent = quoteLine.label;
  amountElement.textContent = quoteLine.amount < 0 ? "− " + formatEuros(-quoteLine.amount) : formatEuros(quoteLine.amount);
  lineElement.append(labelElement, amountElement);
  return lineElement;
}

/* Returns the hint matching a coverage duration */
function describeCoverageHours(coverageHours) {
  if (coverageHours <= 3) {
    return "Idéal pour une cérémonie civile ou un elopement.";
  }
  if (coverageHours <= 7) {
    return "Des préparatifs jusqu'au cocktail.";
  }
  return coverageHours < FULL_DAY_THRESHOLD_HOURS ? "Des préparatifs à la première danse." : "Journée complète, jusqu'à la soirée dansante — remise de 5 % appliquée.";
}

/* Refreshes the summary, total and booking link from the form */
function updateConfigurator() {
  const configuration = readConfiguration();
  const quote = computeQuote(configuration);
  document.getElementById("hours-output").textContent = configuration.hours + " h";
  document.getElementById("hours-hint").textContent = describeCoverageHours(configuration.hours);
  document.getElementById("quote-lines").replaceChildren(...quote.lines.map(createQuoteLineElement));
  document.getElementById("quote-deposit").textContent = formatEuros(Math.round(quote.total * DEPOSIT_RATIO));
  document.getElementById("quote-booking-link").href = "contact.html?" + buildConfigurationQuery(configuration);
  animateTotalAmount(quote.total);
  persistConfiguration(configuration);
}

/* Highlights the comparison table column matching a hovered package card */
function initializePackageHighlight() {
  document.querySelectorAll("[data-package]").forEach(function (packageCardElement) {
    const columnCells = document.querySelectorAll("[data-column='" + packageCardElement.dataset.package + "']");
    packageCardElement.addEventListener("mouseenter", function () {
      columnCells.forEach(function (columnCell) { columnCell.classList.add("is-featured-column"); });
    });
    packageCardElement.addEventListener("mouseleave", function () {
      columnCells.forEach(function (columnCell) {
        columnCell.classList.toggle("is-featured-column", columnCell.dataset.column === "signature");
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  restoreConfiguration();
  configuratorFormElement.addEventListener("input", updateConfigurator);
  configuratorFormElement.addEventListener("submit", function (submitEvent) { submitEvent.preventDefault(); });
  document.getElementById("reset-configurator").addEventListener("click", function () {
    configuratorFormElement.reset();
    updateConfigurator();
  });
  initializePackageHighlight();
  updateConfigurator();
});
