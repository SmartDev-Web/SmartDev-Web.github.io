/* Horizon Immobilier - agency page: live indicative estimate */

const AVERAGE_PRICE_PER_SQUARE_METER = {
  "Annecy": 6200,
  "Annecy-le-Vieux": 6500,
  "Seynod": 4700,
  "Cran-Gevrier": 4500,
  "Sevrier": 6300,
  "Veyrier-du-Lac": 8200,
  "Menthon-Saint-Bernard": 7800,
  "Talloires": 8600,
  "Duingt": 6400
};

const PROPERTY_TYPE_PRICE_FACTORS = { appartement: 1, maison: 1.05, villa: 1.22, chalet: 1.1 };
const ESTIMATE_MARGIN_RATIO = 0.07;

/* Rounds a value to the nearest five thousand euros */
function roundToFiveThousand(numericValue) {
  return Math.round(numericValue / 5000) * 5000;
}

/* Recomputes the indicative price range from the estimation form */
function updateIndicativeEstimate() {
  const propertyType = document.getElementById("estimation-type").value;
  const cityName = document.getElementById("estimation-city").value;
  const livingSurface = Number(document.getElementById("estimation-surface").value);
  const conditionFactor = Number(document.getElementById("estimation-condition").value) || 1;
  const estimateRangeElement = document.getElementById("estimate-range");
  const estimateDetailElement = document.getElementById("estimate-detail");
  if (!propertyType || !cityName || !livingSurface || livingSurface < 10) {
    estimateRangeElement.textContent = "Complétez type, commune et surface";
    estimateDetailElement.textContent = "Prix moyen au m² selon la commune et l'état du bien.";
    return;
  }
  const pricePerSquareMeter = AVERAGE_PRICE_PER_SQUARE_METER[cityName] * PROPERTY_TYPE_PRICE_FACTORS[propertyType] * conditionFactor;
  const centralEstimate = pricePerSquareMeter * livingSurface;
  estimateRangeElement.textContent = formatEuros(roundToFiveThousand(centralEstimate * (1 - ESTIMATE_MARGIN_RATIO))) + " – " + formatEuros(roundToFiveThousand(centralEstimate * (1 + ESTIMATE_MARGIN_RATIO)));
  estimateDetailElement.textContent = "Base : " + formatEuros(Math.round(pricePerSquareMeter)) + " / m² à " + cityName + " (ventes des 12 derniers mois). Estimation non contractuelle.";
}

document.addEventListener("DOMContentLoaded", function () {
  const estimationFormElement = document.getElementById("estimation-form");
  estimationFormElement.addEventListener("input", updateIndicativeEstimate);
  estimationFormElement.addEventListener("change", updateIndicativeEstimate);
  updateIndicativeEstimate();
});
