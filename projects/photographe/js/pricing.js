/* Lumen Studio - shared pricing data, configuration validation and quote computation */

const HOURLY_COVERAGE_RATE = 210;
const SECOND_SHOOTER_HOURLY_RATE = 95;
const FULL_DAY_THRESHOLD_HOURS = 10;
const FULL_DAY_DISCOUNT_RATIO = 0.05;
const DEPOSIT_RATIO = 0.3;
const COVERAGE_HOURS_LIMITS = { minimum: 2, maximum: 12, fallback: 8 };
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
const PACKAGE_OFFERS = {
  essentiel: { label: "Formule Essentiel", total: 1490 },
  signature: { label: "Formule Signature", total: 2490 },
  prestige: { label: "Formule Prestige", total: 3690 }
};

/* Checks that a key is an own property of a lookup table */
function isKnownKey(lookupTable, candidateKey) {
  return typeof candidateKey === "string" && Object.prototype.hasOwnProperty.call(lookupTable, candidateKey);
}

/* Returns a configuration whose every field is validated against the pricing tables */
function sanitizeConfiguration(candidateConfiguration) {
  const safeCandidate = candidateConfiguration && typeof candidateConfiguration === "object" ? candidateConfiguration : {};
  const candidateHours = Number(safeCandidate.hours);
  const isValidHours = Number.isInteger(candidateHours) && candidateHours >= COVERAGE_HOURS_LIMITS.minimum && candidateHours <= COVERAGE_HOURS_LIMITS.maximum;
  const candidateExtras = Array.isArray(safeCandidate.extras) ? safeCandidate.extras : [];
  return {
    hours: isValidHours ? candidateHours : COVERAGE_HOURS_LIMITS.fallback,
    album: isKnownKey(ALBUM_OPTIONS, safeCandidate.album) ? safeCandidate.album : "aucun",
    secondShooter: safeCandidate.secondShooter === true,
    extras: Object.keys(EXTRA_OPTIONS).filter(function (extraKey) { return candidateExtras.includes(extraKey); })
  };
}

/* Computes priced lines and the total for a validated configuration */
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

/* Encodes a configuration as query parameters for the booking page */
function buildConfigurationQuery(configuration) {
  const queryParameters = new URLSearchParams();
  queryParameters.set("heures", String(configuration.hours));
  queryParameters.set("album", configuration.album);
  if (configuration.secondShooter) {
    queryParameters.set("second", "oui");
  }
  if (configuration.extras.length) {
    queryParameters.set("options", configuration.extras.join(","));
  }
  return queryParameters.toString();
}

/* Decodes and validates a configuration from query parameters, or returns null */
function parseConfigurationQuery(queryParameters) {
  if (!queryParameters.has("heures")) {
    return null;
  }
  return sanitizeConfiguration({
    hours: Number(queryParameters.get("heures")),
    album: queryParameters.get("album"),
    secondShooter: queryParameters.get("second") === "oui",
    extras: (queryParameters.get("options") || "").split(",")
  });
}
