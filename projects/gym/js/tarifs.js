/* ==========================================================================
   IronPulse — pricing page
   Monthly/annual billing switch with animated prices, BMI calculator
   and daily calorie needs calculator
   ========================================================================== */

const BMI_GAUGE_MINIMUM = 15;
const BMI_GAUGE_MAXIMUM = 40;
const GOAL_CALORIE_ADJUSTMENTS = { loss: -450, maintain: 0, gain: 300 };
const GOAL_PROTEIN_GRAMS_PER_KILOGRAM = { loss: 2, maintain: 1.8, gain: 2.2 };

function formatEuroAmount(numericAmount) {
  return numericAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* Tweens a numeric text value between two amounts using requestAnimationFrame */
function animateNumericText(targetElement, startValue, endValue, formatValue) {
  if (prefersReducedMotion || startValue === endValue) {
    targetElement.textContent = formatValue(endValue);
    return;
  }
  const tweenDurationMilliseconds = 650;
  let tweenStartTimestamp = null;
  const renderTweenFrame = (frameTimestamp) => {
    if (tweenStartTimestamp === null) tweenStartTimestamp = frameTimestamp;
    const tweenProgress = Math.min((frameTimestamp - tweenStartTimestamp) / tweenDurationMilliseconds, 1);
    const easedProgress = 1 - Math.pow(1 - tweenProgress, 3);
    targetElement.textContent = formatValue(startValue + (endValue - startValue) * easedProgress);
    if (tweenProgress < 1) requestAnimationFrame(renderTweenFrame);
  };
  requestAnimationFrame(renderTweenFrame);
}

/* Applies the selected billing period to every plan card */
function applyBillingPeriod(isAnnualBilling) {
  document.querySelector("[data-billing-switch]").setAttribute("aria-checked", String(isAnnualBilling));
  document.querySelectorAll("[data-billing-label]").forEach((billingLabelElement) => {
    billingLabelElement.classList.toggle("is-active", (billingLabelElement.dataset.billingLabel === "annual") === isAnnualBilling);
  });
  document.querySelectorAll("[data-plan]").forEach((planCardElement) => {
    const monthlyPrice = Number(planCardElement.dataset.monthlyPrice);
    const annualMonthlyPrice = Number(planCardElement.dataset.annualPrice);
    const amountElement = planCardElement.querySelector("[data-plan-amount]");
    const noteElement = planCardElement.querySelector("[data-plan-note]");
    animateNumericText(amountElement, isAnnualBilling ? monthlyPrice : annualMonthlyPrice, isAnnualBilling ? annualMonthlyPrice : monthlyPrice, formatEuroAmount);
    noteElement.textContent = isAnnualBilling ? `Soit ${formatEuroAmount(annualMonthlyPrice * 12)} € par an · économisez ${formatEuroAmount((monthlyPrice - annualMonthlyPrice) * 12)} €` : "Sans engagement";
  });
}

function initializeBillingSwitch() {
  const billingSwitchElement = document.querySelector("[data-billing-switch]");
  billingSwitchElement.addEventListener("click", () => {
    applyBillingPeriod(billingSwitchElement.getAttribute("aria-checked") !== "true");
  });
}

/* Validates a numeric input against its min and max attributes */
function validateNumericInput(numericInputElement, fieldLabel) {
  const numericValue = Number(numericInputElement.value.replace(",", "."));
  const minimumValue = Number(numericInputElement.min);
  const maximumValue = Number(numericInputElement.max);
  if (!numericInputElement.value.trim()) {
    setFieldErrorState(numericInputElement, `Indiquez votre ${fieldLabel}.`);
    return null;
  }
  if (Number.isNaN(numericValue) || numericValue < minimumValue || numericValue > maximumValue) {
    setFieldErrorState(numericInputElement, `Valeur entre ${minimumValue} et ${maximumValue}.`);
    return null;
  }
  setFieldErrorState(numericInputElement, "");
  return numericValue;
}

function describeBmiCategory(bmiValue) {
  if (bmiValue < 18.5) return { label: "Insuffisance pondérale", advice: "Un programme de prise de masse encadré et un suivi nutritionnel vous aideront à progresser sereinement." };
  if (bmiValue < 25) return { label: "Corpulence normale", advice: "Belle base ! Concentrez-vous sur la performance : force, endurance et mobilité." };
  if (bmiValue < 30) return { label: "Surpoids", advice: "L'association HIIT, cycling et renforcement musculaire est idéale pour améliorer votre composition corporelle." };
  return { label: "Obésité", advice: "Nos coachs construisent avec vous une reprise progressive, à faible impact articulaire, en lien avec votre médecin." };
}

/* Computes and displays the BMI with its gauge position */
function initializeBmiCalculator() {
  const bmiFormElement = document.querySelector("[data-bmi-form]");
  const bmiResultElement = bmiFormElement.querySelector("[data-bmi-result]");
  bmiFormElement.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    const heightCentimeters = validateNumericInput(bmiFormElement.elements.heightCentimeters, "taille");
    const weightKilograms = validateNumericInput(bmiFormElement.elements.weightKilograms, "poids");
    if (heightCentimeters === null || weightKilograms === null) return;
    const bmiValue = weightKilograms / Math.pow(heightCentimeters / 100, 2);
    const bmiCategory = describeBmiCategory(bmiValue);
    const gaugePositionPercent = Math.min(Math.max((bmiValue - BMI_GAUGE_MINIMUM) / (BMI_GAUGE_MAXIMUM - BMI_GAUGE_MINIMUM), 0), 1) * 100;
    const bmiValueElement = bmiResultElement.querySelector("[data-bmi-value]");
    bmiResultElement.hidden = false;
    animateNumericText(bmiValueElement, 0, bmiValue, (numericValue) => numericValue.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
    bmiResultElement.querySelector("[data-bmi-category]").textContent = bmiCategory.label;
    bmiResultElement.querySelector("[data-bmi-advice]").textContent = bmiCategory.advice;
    requestAnimationFrame(() => {
      bmiResultElement.querySelector("[data-bmi-marker]").style.left = `${gaugePositionPercent}%`;
    });
  });
}

/* Renders protein, fat and carbohydrate distribution bars */
function renderMacroBars(targetCalories, weightKilograms, fitnessGoal) {
  const proteinGrams = Math.round(weightKilograms * GOAL_PROTEIN_GRAMS_PER_KILOGRAM[fitnessGoal]);
  const fatGrams = Math.round((targetCalories * 0.27) / 9);
  const carbohydrateGrams = Math.max(Math.round((targetCalories - proteinGrams * 4 - fatGrams * 9) / 4), 0);
  const macroDefinitions = [
    { label: "Protéines", grams: proteinGrams, calories: proteinGrams * 4, color: "#d4ff2e" },
    { label: "Glucides", grams: carbohydrateGrams, calories: carbohydrateGrams * 4, color: "#4fc3ff" },
    { label: "Lipides", grams: fatGrams, calories: fatGrams * 9, color: "#ffb02e" }
  ];
  const macroBarsElement = document.querySelector("[data-macro-bars]");
  macroBarsElement.innerHTML = macroDefinitions.map((macroDefinition) => `<div class="macro-bar">
    <div class="macro-bar__header"><span>${macroDefinition.label}</span><strong>${macroDefinition.grams} g</strong></div>
    <div class="macro-bar__track"><div class="macro-bar__fill" style="background:${macroDefinition.color}" data-fill-percent="${Math.round((macroDefinition.calories / targetCalories) * 100)}"></div></div>
  </div>`).join("");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    macroBarsElement.querySelectorAll("[data-fill-percent]").forEach((fillElement) => {
      fillElement.style.width = `${fillElement.dataset.fillPercent}%`;
    });
  }));
}

/* Computes basal metabolic rate, maintenance and goal calories */
function initializeCalorieCalculator() {
  const calorieFormElement = document.querySelector("[data-calorie-form]");
  const calorieResultElement = calorieFormElement.querySelector("[data-calorie-result]");
  calorieFormElement.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    const ageYears = validateNumericInput(calorieFormElement.elements.ageYears, "âge");
    const heightCentimeters = validateNumericInput(calorieFormElement.elements.heightCentimeters, "taille");
    const weightKilograms = validateNumericInput(calorieFormElement.elements.weightKilograms, "poids");
    if (ageYears === null || heightCentimeters === null || weightKilograms === null) return;
    const biologicalSex = calorieFormElement.elements.biologicalSex.value;
    const fitnessGoal = calorieFormElement.elements.fitnessGoal.value;
    const activityFactor = Number(calorieFormElement.elements.activityFactor.value);
    const basalMetabolicRate = 10 * weightKilograms + 6.25 * heightCentimeters - 5 * ageYears + (biologicalSex === "male" ? 5 : -161);
    const maintenanceCalories = basalMetabolicRate * activityFactor;
    const calorieAdjustment = GOAL_CALORIE_ADJUSTMENTS[fitnessGoal];
    const targetCalories = maintenanceCalories + calorieAdjustment;
    const formatCalories = (numericValue) => Math.round(numericValue).toLocaleString("fr-FR");
    calorieResultElement.hidden = false;
    animateNumericText(calorieResultElement.querySelector("[data-calorie-target]"), 0, targetCalories, formatCalories);
    calorieResultElement.querySelector("[data-calorie-bmr]").textContent = formatCalories(basalMetabolicRate);
    calorieResultElement.querySelector("[data-calorie-maintenance]").textContent = formatCalories(maintenanceCalories);
    calorieResultElement.querySelector("[data-calorie-difference]").textContent = `${calorieAdjustment > 0 ? "+" : ""}${calorieAdjustment}`;
    renderMacroBars(targetCalories, weightKilograms, fitnessGoal);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initializeBillingSwitch();
  initializeBmiCalculator();
  initializeCalorieCalculator();
});
