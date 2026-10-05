/* ==========================================================================
   Atelier Méca Rivière — multi-step quote estimator
   Vehicle type → brand/model/year → services → estimated price range,
   with animated step transitions, progress bar and live summary
   ========================================================================== */

const QUOTE_STORAGE_KEY = "meca-riviere-last-quote";
const TOTAL_ESTIMATOR_STEPS = 4;

const VEHICLE_TYPE_DEFINITIONS = [
  { id: "citadine", label: "Citadine", detail: "Clio, 208, Polo…", priceFactor: 1, iconPath: "M6 30h44M10 30l4-10h22l8 10M14 30v3M42 30v3M18 20l2-6h12l4 6" },
  { id: "berline", label: "Berline / compacte", detail: "308, Golf, Mégane…", priceFactor: 1.18, iconPath: "M4 30h48M8 30l6-9h26l10 9M14 30v3M44 30v3M18 21l4-6h14l6 6" },
  { id: "suv", label: "SUV / 4x4", detail: "3008, Tiguan, RAV4…", priceFactor: 1.34, iconPath: "M4 30h48M6 30v-8l6-10h28l8 10v8M14 30v3M44 30v3M14 18h28" },
  { id: "utilitaire", label: "Utilitaire", detail: "Kangoo, Trafic, Transit…", priceFactor: 1.45, iconPath: "M4 30h48M6 30V10h30l10 10h4v10M14 30v3M42 30v3M36 10v10h14" },
  { id: "hybride", label: "Hybride", detail: "Yaris, C-HR, Clio E-Tech…", priceFactor: 1.22, iconPath: "M6 30h44M10 30l4-10h22l8 10M14 30v3M42 30v3M26 8l-4 8h6l-4 8" },
  { id: "electrique", label: "Électrique", detail: "Zoé, e-208, Model 3…", priceFactor: 1.1, iconPath: "M6 30h44M10 30l4-10h22l8 10M14 30v3M42 30v3M24 6v6M32 6v6M22 12h12v4a6 6 0 0 1-12 0z" }
];

const VEHICLE_BRAND_MODELS = {
  Renault: ["Clio", "Mégane", "Captur", "Kangoo", "Trafic", "Zoé", "Austral"],
  Peugeot: ["208", "308", "2008", "3008", "5008", "Partner", "e-208"],
  "Citroën": ["C3", "C4", "C5 Aircross", "Berlingo", "Jumpy", "ë-C4"],
  Dacia: ["Sandero", "Duster", "Jogger", "Spring"],
  Volkswagen: ["Polo", "Golf", "T-Roc", "Tiguan", "Transporter", "ID.3"],
  Toyota: ["Yaris", "Corolla", "C-HR", "RAV4", "Proace"],
  Ford: ["Fiesta", "Focus", "Puma", "Kuga", "Transit"],
  Tesla: ["Model 3", "Model Y"],
  BMW: ["Série 1", "Série 3", "X1", "X3"],
  Audi: ["A1", "A3", "A4", "Q3"]
};

/* Base price ranges (TTC) for a city car; excludedVehicleTypes lists incompatible vehicle types */
const QUOTE_SERVICE_DEFINITIONS = [
  { id: "vidange", label: "Vidange + filtre à huile", minimumPrice: 89, maximumPrice: 119, laborHours: 0.5, excludedVehicleTypes: ["electrique"] },
  { id: "revision", label: "Révision constructeur complète", minimumPrice: 169, maximumPrice: 239, laborHours: 1.5, excludedVehicleTypes: [] },
  { id: "plaquettes", label: "Plaquettes de frein avant", minimumPrice: 119, maximumPrice: 149, laborHours: 1, excludedVehicleTypes: [] },
  { id: "disques", label: "Disques + plaquettes avant", minimumPrice: 249, maximumPrice: 319, laborHours: 1.5, excludedVehicleTypes: [] },
  { id: "distribution", label: "Kit distribution + pompe à eau", minimumPrice: 449, maximumPrice: 620, laborHours: 4, excludedVehicleTypes: ["electrique"] },
  { id: "embrayage", label: "Kit embrayage complet", minimumPrice: 590, maximumPrice: 820, laborHours: 5, excludedVehicleTypes: ["electrique", "hybride"] },
  { id: "diagnostic", label: "Diagnostic électronique", minimumPrice: 59, maximumPrice: 89, laborHours: 1, excludedVehicleTypes: [] },
  { id: "climatisation", label: "Recharge climatisation", minimumPrice: 79, maximumPrice: 149, laborHours: 0.75, excludedVehicleTypes: [] },
  { id: "pneus", label: "4 pneus montés + équilibrage", minimumPrice: 340, maximumPrice: 560, laborHours: 1, excludedVehicleTypes: [] },
  { id: "geometrie", label: "Parallélisme 3D", minimumPrice: 69, maximumPrice: 79, laborHours: 0.75, excludedVehicleTypes: [] },
  { id: "batterie", label: "Batterie 12 V + test de charge", minimumPrice: 129, maximumPrice: 219, laborHours: 0.5, excludedVehicleTypes: [] },
  { id: "controle", label: "Pré-contrôle technique", minimumPrice: 49, maximumPrice: 59, laborHours: 0.75, excludedVehicleTypes: [] }
];

const estimatorState = { currentStep: 1, isTransitioning: false, preselectedServiceId: null };

const quoteFormElement = document.querySelector("[data-quote-form]");

/* Reads every user choice from the form into a plain object */
function readQuoteSelection() {
  const formFields = quoteFormElement.elements;
  const vehicleTypeId = formFields.vehicleType ? formFields.vehicleType.value : "";
  const selectedServiceIds = [...quoteFormElement.querySelectorAll("input[name='quoteServices']:checked:not(:disabled)")].map((serviceInputElement) => serviceInputElement.value);
  return {
    vehicleType: VEHICLE_TYPE_DEFINITIONS.find((vehicleTypeDefinition) => vehicleTypeDefinition.id === vehicleTypeId) || null,
    vehicleBrand: formFields.vehicleBrand.value,
    vehicleModel: formFields.vehicleModel.value,
    vehicleYear: Number(formFields.vehicleYear.value) || null,
    vehicleMileage: Number(formFields.vehicleMileage.value) || null,
    selectedServices: QUOTE_SERVICE_DEFINITIONS.filter((serviceDefinition) => selectedServiceIds.includes(serviceDefinition.id))
  };
}

/* Older or high-mileage vehicles usually need more labour time */
function computeAgeFactor(vehicleYear, vehicleMileage) {
  const vehicleAgeYears = vehicleYear ? new Date().getFullYear() - vehicleYear : 0;
  let ageFactor = 1;
  if (vehicleAgeYears > 15) ageFactor = 1.15;
  else if (vehicleAgeYears > 10) ageFactor = 1.08;
  if (vehicleMileage && vehicleMileage > 200000) ageFactor += 0.05;
  return ageFactor;
}

/* Central pricing function: returns line items and the total range */
function computeQuoteEstimate(quoteSelection) {
  const vehicleFactor = quoteSelection.vehicleType ? quoteSelection.vehicleType.priceFactor : 1;
  const ageFactor = computeAgeFactor(quoteSelection.vehicleYear, quoteSelection.vehicleMileage);
  const lineItems = quoteSelection.selectedServices.map((serviceDefinition) => ({
    label: serviceDefinition.label,
    minimumPrice: Math.round((serviceDefinition.minimumPrice * vehicleFactor * ageFactor) / 5) * 5,
    maximumPrice: Math.round((serviceDefinition.maximumPrice * vehicleFactor * ageFactor) / 5) * 5,
    laborHours: serviceDefinition.laborHours
  }));
  const groupedServiceDiscount = lineItems.length >= 3 ? 0.95 : 1;
  return {
    lineItems,
    groupedServiceDiscount,
    totalMinimum: Math.round(lineItems.reduce((runningTotal, lineItem) => runningTotal + lineItem.minimumPrice, 0) * groupedServiceDiscount),
    totalMaximum: Math.round(lineItems.reduce((runningTotal, lineItem) => runningTotal + lineItem.maximumPrice, 0) * groupedServiceDiscount),
    totalLaborHours: lineItems.reduce((runningTotal, lineItem) => runningTotal + lineItem.laborHours, 0)
  };
}

function formatEuroValue(numericValue) {
  return Math.round(numericValue).toLocaleString("fr-FR");
}

function describeVehicle(quoteSelection) {
  const vehicleParts = [quoteSelection.vehicleBrand, quoteSelection.vehicleModel, quoteSelection.vehicleYear].filter(Boolean);
  return vehicleParts.length ? vehicleParts.join(" ") : "Non renseigné";
}

/* Returns the service identifier passed as ?service= when it matches a known service, otherwise null */
function readPreselectedServiceId() {
  const requestedServiceId = new URLSearchParams(window.location.search).get("service");
  const matchingService = QUOTE_SERVICE_DEFINITIONS.find((serviceDefinition) => serviceDefinition.id === requestedServiceId);
  return matchingService ? matchingService.id : null;
}

/* Announces the service carried over from the services page, warning when the chosen vehicle type excludes it */
function renderPreselectedServiceNotice(vehicleTypeDefinition = null) {
  const preselectionElement = document.querySelector("[data-preselected-service]");
  const preselectedService = QUOTE_SERVICE_DEFINITIONS.find((serviceDefinition) => serviceDefinition.id === estimatorState.preselectedServiceId);
  preselectionElement.hidden = !preselectedService;
  if (!preselectedService) return;
  const isExcludedForVehicle = Boolean(vehicleTypeDefinition) && preselectedService.excludedVehicleTypes.includes(vehicleTypeDefinition.id);
  preselectionElement.textContent = isExcludedForVehicle ? `Prestation pré-sélectionnée : ${preselectedService.label} (non applicable au type «\u00a0${vehicleTypeDefinition.label}\u00a0»)` : `Prestation pré-sélectionnée : ${preselectedService.label}`;
}

/* Builds the vehicle type tiles */
function renderVehicleOptions() {
  const vehicleOptionsElement = document.querySelector("[data-vehicle-options]");
  vehicleOptionsElement.insertAdjacentHTML("beforeend", VEHICLE_TYPE_DEFINITIONS.map((vehicleTypeDefinition) => `<label class="option-tile">
    <input type="radio" name="vehicleType" value="${vehicleTypeDefinition.id}">
    <span class="option-tile__body">
      <svg class="option-tile__icon" viewBox="0 0 56 36" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${vehicleTypeDefinition.iconPath}"/><circle cx="16" cy="31" r="3.5"/><circle cx="42" cy="31" r="3.5"/></svg>
      <span class="option-tile__title">${vehicleTypeDefinition.label}</span>
      <span class="option-tile__detail">${vehicleTypeDefinition.detail}</span>
    </span>
  </label>`).join(""));
}

/* Fills the brand and year selects */
function renderBrandAndYearOptions() {
  const brandSelectElement = document.querySelector("[data-brand-select]");
  const yearSelectElement = document.querySelector("[data-year-select]");
  brandSelectElement.insertAdjacentHTML("beforeend", Object.keys(VEHICLE_BRAND_MODELS).map((brandName) => `<option value="${brandName}">${brandName}</option>`).join(""));
  const currentYear = new Date().getFullYear();
  const yearOptionsMarkup = [];
  for (let candidateYear = currentYear; candidateYear >= currentYear - 25; candidateYear -= 1) yearOptionsMarkup.push(`<option value="${candidateYear}">${candidateYear}</option>`);
  yearSelectElement.insertAdjacentHTML("beforeend", yearOptionsMarkup.join(""));
}

/* Repopulates the model select whenever the brand changes */
function renderModelOptions(brandName) {
  const modelSelectElement = document.querySelector("[data-model-select]");
  const brandModels = VEHICLE_BRAND_MODELS[brandName] || [];
  modelSelectElement.disabled = !brandModels.length;
  modelSelectElement.innerHTML = brandModels.length ? `<option value="">Choisir un modèle</option>${brandModels.map((modelName) => `<option value="${modelName}">${modelName}</option>`).join("")}` : `<option value="">Choisir d'abord une marque</option>`;
}

/* Builds the service checkboxes, disabling the ones incompatible with the chosen vehicle type */
function renderServiceOptions() {
  const serviceOptionsElement = document.querySelector("[data-service-options]");
  const quoteSelection = readQuoteSelection();
  const previouslyCheckedIds = quoteSelection.selectedServices.map((serviceDefinition) => serviceDefinition.id);
  if (estimatorState.preselectedServiceId) {
    previouslyCheckedIds.push(estimatorState.preselectedServiceId);
    renderPreselectedServiceNotice(quoteSelection.vehicleType);
    estimatorState.preselectedServiceId = null;
  }
  const vehicleTypeId = quoteSelection.vehicleType ? quoteSelection.vehicleType.id : "";
  const vehicleFactor = quoteSelection.vehicleType ? quoteSelection.vehicleType.priceFactor : 1;
  serviceOptionsElement.querySelectorAll(".option-tile").forEach((existingTileElement) => existingTileElement.remove());
  serviceOptionsElement.insertAdjacentHTML("beforeend", QUOTE_SERVICE_DEFINITIONS.map((serviceDefinition) => {
    const isExcluded = serviceDefinition.excludedVehicleTypes.includes(vehicleTypeId);
    const isChecked = previouslyCheckedIds.includes(serviceDefinition.id) && !isExcluded;
    return `<label class="option-tile service-option"${isExcluded ? ' style="opacity:0.4;cursor:not-allowed"' : ""}>
      <input type="checkbox" name="quoteServices" value="${serviceDefinition.id}"${isChecked ? " checked" : ""}${isExcluded ? " disabled" : ""}>
      <span class="option-tile__body">
        <span class="service-option__check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></span>
        <span class="option-tile__title">${serviceDefinition.label}</span>
        <span class="service-option__price">${isExcluded ? "Non applicable" : `dès ${formatEuroValue(Math.round((serviceDefinition.minimumPrice * vehicleFactor) / 5) * 5)} €`}</span>
      </span>
    </label>`;
  }).join(""));
}

/* Refreshes the sticky summary next to the estimator */
function renderLiveSummary() {
  const quoteSelection = readQuoteSelection();
  const quoteEstimate = computeQuoteEstimate(quoteSelection);
  document.querySelector("[data-live-summary]").innerHTML = [
    ["Type", quoteSelection.vehicleType ? quoteSelection.vehicleType.label : "—"],
    ["Véhicule", describeVehicle(quoteSelection)],
    ["Prestations", quoteSelection.selectedServices.length ? String(quoteSelection.selectedServices.length) : "—"]
  ].map(([summaryLabel, summaryValue]) => `<li><span>${summaryLabel}</span><span>${summaryValue}</span></li>`).join("");
  document.querySelector("[data-live-total]").textContent = quoteEstimate.lineItems.length ? `${formatEuroValue(quoteEstimate.totalMinimum)} – ${formatEuroValue(quoteEstimate.totalMaximum)} €` : "—";
}

/* Animates the final range figures and the range meter */
function renderFinalEstimate() {
  const quoteSelection = readQuoteSelection();
  const quoteEstimate = computeQuoteEstimate(quoteSelection);
  const minimumElement = document.querySelector("[data-estimate-minimum]");
  const maximumElement = document.querySelector("[data-estimate-maximum]");
  const rangeElement = document.querySelector("[data-estimate-range]");
  const meterScaleMaximum = Math.max(quoteEstimate.totalMaximum * 1.25, 200);
  document.querySelector("[data-summary-vehicle]").textContent = `${quoteSelection.vehicleType.label} · ${describeVehicle(quoteSelection)}${quoteSelection.vehicleMileage ? ` · ${formatEuroValue(quoteSelection.vehicleMileage)} km` : ""}`;
  document.querySelector("[data-estimate-duration]").textContent = `Immobilisation estimée : ${quoteEstimate.totalLaborHours <= 3 ? "une demi-journée" : quoteEstimate.totalLaborHours <= 6 ? "une journée" : "1 à 2 jours (véhicule de prêt offert)"}${quoteEstimate.groupedServiceDiscount < 1 ? " · remise 5 % multi-prestations appliquée" : ""}`;
  document.querySelector("[data-summary-list]").innerHTML = quoteEstimate.lineItems.map((lineItem) => `<li><span>${lineItem.label}</span><span>${formatEuroValue(lineItem.minimumPrice)} – ${formatEuroValue(lineItem.maximumPrice)} €</span></li>`).join("");
  rangeElement.style.left = "0%";
  rangeElement.style.width = "0%";
  requestAnimationFrame(() => requestAnimationFrame(() => {
    rangeElement.style.left = `${(quoteEstimate.totalMinimum / meterScaleMaximum) * 100}%`;
    rangeElement.style.width = `${((quoteEstimate.totalMaximum - quoteEstimate.totalMinimum) / meterScaleMaximum) * 100}%`;
  }));
  animateEstimateNumber(minimumElement, quoteEstimate.totalMinimum);
  animateEstimateNumber(maximumElement, quoteEstimate.totalMaximum);
  saveQuoteForAppointment(quoteSelection, quoteEstimate);
}

/* Counts a figure up to its value with requestAnimationFrame */
function animateEstimateNumber(targetElement, targetValue) {
  if (prefersReducedMotion) {
    targetElement.textContent = formatEuroValue(targetValue);
    return;
  }
  let animationStartTimestamp = null;
  const renderFrame = (frameTimestamp) => {
    if (animationStartTimestamp === null) animationStartTimestamp = frameTimestamp;
    const animationProgress = Math.min((frameTimestamp - animationStartTimestamp) / 900, 1);
    targetElement.textContent = formatEuroValue(targetValue * (1 - Math.pow(1 - animationProgress, 3)));
    if (animationProgress < 1) requestAnimationFrame(renderFrame);
  };
  requestAnimationFrame(renderFrame);
}

/* Stores the quote so the appointment page can attach it */
function saveQuoteForAppointment(quoteSelection, quoteEstimate) {
  const storedQuote = {
    vehicleDescription: `${quoteSelection.vehicleType.label} · ${describeVehicle(quoteSelection)}`,
    serviceLabels: quoteEstimate.lineItems.map((lineItem) => lineItem.label),
    totalMinimum: quoteEstimate.totalMinimum,
    totalMaximum: quoteEstimate.totalMaximum,
    createdAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(storedQuote));
  } catch (storageError) {
    return;
  }
}

/* Validates the current step and returns true when the user may continue */
function validateCurrentStep() {
  const quoteSelection = readQuoteSelection();
  const formFields = quoteFormElement.elements;
  if (estimatorState.currentStep === 1) {
    const stepErrorElement = document.querySelector("[data-step-error='1']");
    stepErrorElement.textContent = quoteSelection.vehicleType ? "" : "Sélectionnez un type de véhicule pour continuer.";
    return Boolean(quoteSelection.vehicleType);
  }
  if (estimatorState.currentStep === 2) {
    const mileageValue = formFields.vehicleMileage.value;
    const fieldChecks = [
      [formFields.vehicleBrand, quoteSelection.vehicleBrand ? "" : "Choisissez une marque."],
      [formFields.vehicleModel, quoteSelection.vehicleModel ? "" : "Choisissez un modèle."],
      [formFields.vehicleYear, quoteSelection.vehicleYear ? "" : "Indiquez l'année."],
      [formFields.vehicleMileage, mileageValue && (Number(mileageValue) < 0 || Number(mileageValue) > 500000) ? "Kilométrage entre 0 et 500 000 km." : ""]
    ];
    fieldChecks.forEach(([fieldElement, errorMessage]) => setFieldErrorState(fieldElement, errorMessage));
    const firstInvalidCheck = fieldChecks.find(([, errorMessage]) => errorMessage);
    if (firstInvalidCheck) firstInvalidCheck[0].focus();
    return !firstInvalidCheck;
  }
  if (estimatorState.currentStep === 3) {
    const stepErrorElement = document.querySelector("[data-step-error='3']");
    stepErrorElement.textContent = quoteSelection.selectedServices.length ? "" : "Cochez au moins une prestation.";
    return quoteSelection.selectedServices.length > 0;
  }
  return true;
}

/* Updates progress indicators and navigation buttons for the active step */
function renderStepChrome() {
  const activeStep = estimatorState.currentStep;
  const isFinalStep = activeStep === TOTAL_ESTIMATOR_STEPS;
  const progressPercent = (activeStep / TOTAL_ESTIMATOR_STEPS) * 100;
  document.querySelectorAll("[data-progress-step]").forEach((progressStepElement) => {
    const progressStepNumber = Number(progressStepElement.dataset.progressStep);
    progressStepElement.classList.toggle("is-current", progressStepNumber === activeStep);
    progressStepElement.classList.toggle("is-done", progressStepNumber < activeStep);
  });
  const progressBarElement = document.querySelector("[data-progress-bar]");
  progressBarElement.setAttribute("aria-valuenow", String(progressPercent));
  progressBarElement.setAttribute("aria-label", `Étape ${activeStep} sur ${TOTAL_ESTIMATOR_STEPS}`);
  document.querySelector("[data-progress-fill]").style.width = `${progressPercent}%`;
  document.querySelector("[data-step-previous]").hidden = activeStep === 1;
  document.querySelector("[data-step-next]").hidden = isFinalStep;
  document.querySelector("[data-book-with-quote]").hidden = !isFinalStep;
  document.querySelector("[data-quote-restart]").hidden = !isFinalStep;
  document.querySelector("[data-step-next]").textContent = activeStep === TOTAL_ESTIMATOR_STEPS - 1 ? "Voir mon estimation →" : "Continuer →";
}

/* Prepares the content of a step right before it becomes visible */
function prepareStepContent(stepNumber) {
  if (stepNumber === 3) renderServiceOptions();
  if (stepNumber === 4) renderFinalEstimate();
}

/* Swaps the visible step using CSS animations, finishing on animationend */
function goToStep(targetStep) {
  if (estimatorState.isTransitioning || targetStep === estimatorState.currentStep) return;
  const isMovingForward = targetStep > estimatorState.currentStep;
  const currentStepElement = quoteFormElement.querySelector(`[data-step="${estimatorState.currentStep}"]`);
  const targetStepElement = quoteFormElement.querySelector(`[data-step="${targetStep}"]`);
  const revealTargetStep = () => {
    currentStepElement.hidden = true;
    currentStepElement.classList.remove("is-leaving-forward", "is-leaving-backward");
    estimatorState.currentStep = targetStep;
    prepareStepContent(targetStep);
    renderStepChrome();
    targetStepElement.hidden = false;
    targetStepElement.querySelector(".estimator-step__title").setAttribute("tabindex", "-1");
    targetStepElement.querySelector(".estimator-step__title").focus({ preventScroll: true });
    if (prefersReducedMotion) {
      estimatorState.isTransitioning = false;
      return;
    }
    targetStepElement.classList.add(isMovingForward ? "is-entering-forward" : "is-entering-backward");
    targetStepElement.addEventListener("animationend", () => {
      targetStepElement.classList.remove("is-entering-forward", "is-entering-backward");
      estimatorState.isTransitioning = false;
    }, { once: true });
  };
  estimatorState.isTransitioning = true;
  if (prefersReducedMotion) {
    revealTargetStep();
    return;
  }
  currentStepElement.addEventListener("animationend", revealTargetStep, { once: true });
  currentStepElement.classList.add(isMovingForward ? "is-leaving-forward" : "is-leaving-backward");
}

/* Clears every choice and returns to the first step */
function restartEstimator() {
  quoteFormElement.reset();
  estimatorState.preselectedServiceId = null;
  renderPreselectedServiceNotice();
  renderModelOptions("");
  quoteFormElement.querySelectorAll(".has-error").forEach((invalidFieldElement) => invalidFieldElement.classList.remove("has-error"));
  quoteFormElement.querySelectorAll(".form-field__error").forEach((errorElement) => { errorElement.textContent = ""; });
  renderLiveSummary();
  goToStep(1);
}

function initializeQuoteEstimator() {
  estimatorState.preselectedServiceId = readPreselectedServiceId();
  renderPreselectedServiceNotice();
  renderVehicleOptions();
  renderBrandAndYearOptions();
  renderStepChrome();
  renderLiveSummary();
  quoteFormElement.addEventListener("change", (changeEvent) => {
    if (changeEvent.target.matches("[data-brand-select]")) renderModelOptions(changeEvent.target.value);
    if (changeEvent.target.name === "vehicleType") document.querySelector("[data-step-error='1']").textContent = "";
    if (changeEvent.target.name === "quoteServices") document.querySelector("[data-step-error='3']").textContent = "";
    if (changeEvent.target.closest(".form-field") && changeEvent.target.value) setFieldErrorState(changeEvent.target, "");
    renderLiveSummary();
  });
  quoteFormElement.addEventListener("submit", (submitEvent) => submitEvent.preventDefault());
  document.querySelector("[data-step-next]").addEventListener("click", () => {
    if (validateCurrentStep()) goToStep(estimatorState.currentStep + 1);
  });
  document.querySelector("[data-step-previous]").addEventListener("click", () => goToStep(estimatorState.currentStep - 1));
  document.querySelector("[data-quote-restart]").addEventListener("click", restartEstimator);
  document.querySelector("[data-vehicle-options]").addEventListener("dblclick", (doubleClickEvent) => {
    if (doubleClickEvent.target.closest(".option-tile") && validateCurrentStep()) goToStep(2);
  });
}

document.addEventListener("DOMContentLoaded", initializeQuoteEstimator);
