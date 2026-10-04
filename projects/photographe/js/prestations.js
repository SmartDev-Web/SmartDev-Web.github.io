/* Lumen Studio - services page: interactive price configurator */

const CONFIGURATOR_STORAGE_KEY = "lumen-studio-configuration";
const HOURLY_COVERAGE_RATE = 210;
const SECOND_SHOOTER_HOURLY_RATE = 95;
const FULL_DAY_THRESHOLD_HOURS = 10;
const FULL_DAY_DISCOUNT_RATIO = 0.05;
const ALBUM_OPTIONS = {
  aucun: { label: "Sans album", price: 0 },
  classique: { label: "Album Classique 25×25", price: 450 },
  signature: { label: "Album Signature 30×30 lin", price: 790 }
};
const EXTRA_OPTIONS = {
  engagement: { label: "Séance engagement", price: 290 },
  express: { label: "Livraison express (15 jours)", price: 190 },
  tirages: { label: "Coffret 15 tirages fine art", price: 240 },
  deplacement: { label: "Déplacement hors Provence", price: 150 }
};

const configuratorFormElement = document.getElementById("price-configurator");
let displayedTotalAmount = 0;

/* Reads the configurator form into a plain configuration object */
function readConfiguration() {
  const formData = new FormData(configuratorFormElement);
  return {
    hours: Number(formData.get("heures")),
    album: formData.get("album") || "aucun",
    secondShooter: formData.get("second") === "oui",
    extras: Object.keys(EXTRA_OPTIONS).filter(function (extraKey) { return formData.get(extraKey) === "oui"; })
  };
}

/* Computes priced lines and the total for a configuration */
function computeQuote(configuration) {
  const quoteLines = [{ label: configuration.hours + " h de reportage", amount: configuration.hours * HOURLY_COVERAGE_RATE }];
  if (configuration.secondShooter) {
    quoteLines.push({ label: "Second photographe (" + configuration.hours + " h)", amount: configuration.hours * SECOND_SHOOTER_HOURLY_RATE });
  }
  if (ALBUM_OPTIONS[configuration.album].price) {
    quoteLines.push({ label: ALBUM_OPTIONS[configuration.album].label, amount: ALBUM_OPTIONS[configuration.album].price });
  }
  configuration.extras.forEach(function (extraKey) {
    quoteLines.push({ label: EXTRA_OPTIONS[extraKey].label, amount: EXTRA_OPTIONS[extraKey].price });
  });
  const subtotalAmount = quoteLines.reduce(function (runningTotal, quoteLine) { return runningTotal + quoteLine.amount; }, 0);
  if (configuration.hours >= FULL_DAY_THRESHOLD_HOURS) {
    quoteLines.push({ label: "Remise journée complète (−5 %)", amount: -Math.round(subtotalAmount * FULL_DAY_DISCOUNT_RATIO) });
  }
  return { lines: quoteLines, total: quoteLines.reduce(function (runningTotal, quoteLine) { return runningTotal + quoteLine.amount; }, 0) };
}

/* Animates the displayed total towards a target amount */
function animateTotalAmount(targetAmount) {
  const totalElement = document.getElementById("quote-total");
  const startingAmount = displayedTotalAmount;
  const animationDuration = prefersReducedMotion ? 0 : 500;
  let animationStartTime = null;
  displayedTotalAmount = targetAmount;
  const renderFrame = function (frameTimestamp) {
    animationStartTime = animationStartTime === null ? frameTimestamp : animationStartTime;
    const progressRatio = animationDuration ? Math.min((frameTimestamp - animationStartTime) / animationDuration, 1) : 1;
    totalElement.textContent = formatEuros(Math.round(startingAmount + (targetAmount - startingAmount) * (1 - Math.pow(1 - progressRatio, 3))));
    if (progressRatio < 1) {
      requestAnimationFrame(renderFrame);
    }
  };
  requestAnimationFrame(renderFrame);
}

/* Persists the configuration so it survives a reload */
function persistConfiguration(configuration) {
  try {
    localStorage.setItem(CONFIGURATOR_STORAGE_KEY, JSON.stringify(configuration));
  } catch (storageError) {
    return;
  }
}

/* Restores a stored configuration into the form */
function restoreConfiguration() {
  let storedConfiguration = null;
  try {
    storedConfiguration = JSON.parse(localStorage.getItem(CONFIGURATOR_STORAGE_KEY));
  } catch (storageError) {
    storedConfiguration = null;
  }
  if (!storedConfiguration) {
    return;
  }
  configuratorFormElement.elements.heures.value = storedConfiguration.hours || 8;
  const albumRadioElement = configuratorFormElement.querySelector("input[name='album'][value='" + storedConfiguration.album + "']");
  if (albumRadioElement) {
    albumRadioElement.checked = true;
  }
  configuratorFormElement.elements.second.checked = Boolean(storedConfiguration.secondShooter);
  Object.keys(EXTRA_OPTIONS).forEach(function (extraKey) {
    configuratorFormElement.elements[extraKey].checked = (storedConfiguration.extras || []).includes(extraKey);
  });
}

/* Refreshes the summary, total and booking link from the form */
function updateConfigurator() {
  const configuration = readConfiguration();
  const quote = computeQuote(configuration);
  document.getElementById("hours-output").textContent = configuration.hours + " h";
  document.getElementById("hours-hint").textContent = configuration.hours <= 3 ? "Idéal pour une cérémonie civile ou un elopement." : configuration.hours <= 7 ? "Des préparatifs jusqu'au cocktail." : configuration.hours < FULL_DAY_THRESHOLD_HOURS ? "Des préparatifs à la première danse." : "Journée complète, jusqu'à la soirée dansante — remise de 5 % appliquée.";
  document.getElementById("quote-lines").innerHTML = quote.lines.map(function (quoteLine) {
    return "<li><span>" + quoteLine.label + "</span><span>" + (quoteLine.amount < 0 ? "− " + formatEuros(-quoteLine.amount) : formatEuros(quoteLine.amount)) + "</span></li>";
  }).join("");
  document.getElementById("quote-deposit").textContent = formatEuros(Math.round(quote.total * 0.3));
  document.getElementById("quote-booking-link").href = "contact.html?devis=" + encodeURIComponent(quote.lines.map(function (quoteLine) { return quoteLine.label; }).join(", ")) + "&total=" + quote.total;
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
  configuratorFormElement.addEventListener("change", updateConfigurator);
  configuratorFormElement.addEventListener("submit", function (submitEvent) { submitEvent.preventDefault(); });
  document.getElementById("reset-configurator").addEventListener("click", function () {
    configuratorFormElement.reset();
    updateConfigurator();
  });
  initializePackageHighlight();
  updateConfigurator();
});
