/* Checkout page: shipping step, payment step with live card preview and validation, confirmation with order number. */
const checkoutElements = {
  checkoutLayout: document.querySelector("[data-checkout-layout]"),
  emptyState: document.querySelector("[data-checkout-empty]"),
  stepIndicators: document.querySelectorAll("[data-step-indicator]"),
  stepSections: document.querySelectorAll("[data-checkout-step]"),
  shippingForm: document.querySelector("#shipping-form"),
  shippingMethodList: document.querySelector("[data-shipping-methods]"),
  paymentForm: document.querySelector("#payment-form"),
  paymentSubmitLabel: document.querySelector("[data-pay-amount]"),
  backToShippingButton: document.querySelector("[data-back-to-shipping]"),
  shippingRecap: document.querySelector("[data-shipping-recap]"),
  confirmationContent: document.querySelector("[data-confirmation]"),
  summaryLines: document.querySelector("[data-summary-lines]"),
  summaryTotals: document.querySelector("[data-summary-totals]"),
  cardPreview: document.querySelector("[data-card-preview]"),
  cardNumberPreview: document.querySelector("[data-card-number-preview]"),
  cardHolderPreview: document.querySelector("[data-card-holder-preview]"),
  cardExpiryPreview: document.querySelector("[data-card-expiry-preview]"),
  cardCvcPreview: document.querySelector("[data-card-cvc-preview]"),
  cardBrandPreview: document.querySelector("[data-card-brand]"),
  cardNumberInput: document.querySelector("#card-number"),
  cardHolderInput: document.querySelector("#card-holder"),
  cardExpiryInput: document.querySelector("#card-expiry"),
  cardCvcInput: document.querySelector("#card-cvc")
};

const checkoutState = { currentStep: "shipping", shippingDetails: null, shippingMethodId: "standard", orderPlaced: false };
const postalCodePatterns = { France: /^\d{5}$/, Belgique: /^\d{4}$/, Suisse: /^\d{4}$/, Luxembourg: /^\d{4}$/ };
const cardBrandDefinitions = [
  { id: "amex", label: "AMEX", pattern: /^3[47]/, numberLength: 15, cvcLength: 4, groups: [4, 6, 5] },
  { id: "visa", label: "VISA", pattern: /^4/, numberLength: 16, cvcLength: 3, groups: [4, 4, 4, 4] },
  { id: "mastercard", label: "MASTERCARD", pattern: /^(5[1-5]|2[2-7])/, numberLength: 16, cvcLength: 3, groups: [4, 4, 4, 4] }
];
const defaultCardBrand = { id: "generic", label: "CARTE", numberLength: 16, cvcLength: 3, groups: [4, 4, 4, 4] };

/* Field validation helpers shared by both forms. */
function setCheckoutFieldError(formElement, fieldName, errorMessage) {
  const fieldElement = formElement.querySelector(`[name="${fieldName}"]`);
  const errorElement = formElement.querySelector(`[data-error-for="${fieldName}"]`);
  if (errorElement) errorElement.textContent = errorMessage;
  if (fieldElement && fieldElement.type !== "radio") fieldElement.setAttribute("aria-invalid", String(Boolean(errorMessage)));
}

function validateFormFields(formElement, validationRules) {
  const formValues = Object.fromEntries(new FormData(formElement).entries());
  let firstInvalidFieldName = null;
  Object.entries(validationRules).forEach(([fieldName, validateField]) => {
    const errorMessage = validateField(String(formValues[fieldName] || "").trim(), formValues);
    setCheckoutFieldError(formElement, fieldName, errorMessage);
    if (errorMessage && !firstInvalidFieldName) firstInvalidFieldName = fieldName;
  });
  if (firstInvalidFieldName) formElement.querySelector(`[name="${firstInvalidFieldName}"]`).focus();
  return firstInvalidFieldName ? null : formValues;
}

function bindLiveValidation(formElement, validationRules) {
  formElement.addEventListener("focusout", (focusEvent) => {
    const fieldName = focusEvent.target.name;
    if (!validationRules[fieldName] || !focusEvent.target.value) return;
    const formValues = Object.fromEntries(new FormData(formElement).entries());
    setCheckoutFieldError(formElement, fieldName, validationRules[fieldName](focusEvent.target.value.trim(), formValues));
  });
  formElement.addEventListener("input", (inputEvent) => {
    if (inputEvent.target.getAttribute("aria-invalid") === "true") setCheckoutFieldError(formElement, inputEvent.target.name, "");
  });
}

const shippingValidationRules = {
  firstName: (fieldValue) => fieldValue.length >= 2 ? "" : "Indiquez votre prénom.",
  lastName: (fieldValue) => fieldValue.length >= 2 ? "" : "Indiquez votre nom.",
  email: (fieldValue) => EMAIL_PATTERN.test(fieldValue) ? "" : "Adresse e-mail invalide (ex. : prenom@domaine.example).",
  phone: (fieldValue) => /^(?:\+\d{2,3}\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(fieldValue) ? "" : "Numéro invalide (ex. : 06 39 98 12 34).",
  address: (fieldValue) => fieldValue.length >= 6 ? "" : "Indiquez une adresse complète.",
  postalCode: (fieldValue, formValues) => (postalCodePatterns[formValues.country] || postalCodePatterns.France).test(fieldValue) ? "" : `Code postal invalide pour ${formValues.country || "la France"}.`,
  city: (fieldValue) => fieldValue.length >= 2 ? "" : "Indiquez votre ville.",
  country: (fieldValue) => postalCodePatterns[fieldValue] ? "" : "Choisissez un pays de livraison."
};

/* Card helpers: brand detection, formatting, Luhn checksum and expiry check. */
function detectCardBrand(cardDigits) {
  return cardBrandDefinitions.find((cardBrand) => cardBrand.pattern.test(cardDigits)) || defaultCardBrand;
}

function formatCardNumber(cardDigits, cardBrand) {
  const numberGroups = [];
  let digitOffset = 0;
  cardBrand.groups.forEach((groupLength) => {
    const groupDigits = cardDigits.slice(digitOffset, digitOffset + groupLength);
    if (groupDigits) numberGroups.push(groupDigits);
    digitOffset += groupLength;
  });
  return numberGroups.join(" ");
}

function passesLuhnChecksum(cardDigits) {
  const checksum = cardDigits.split("").reverse().reduce((digitSum, digitCharacter, digitIndex) => {
    let digitValue = Number(digitCharacter);
    if (digitIndex % 2 === 1) digitValue = digitValue * 2 > 9 ? digitValue * 2 - 9 : digitValue * 2;
    return digitSum + digitValue;
  }, 0);
  return checksum % 10 === 0;
}

function validateExpiryDate(expiryValue) {
  const expiryMatch = expiryValue.match(/^(\d{2})\/(\d{2})$/);
  if (!expiryMatch) return "Format attendu : MM/AA.";
  const expiryMonth = Number(expiryMatch[1]);
  const expiryYear = 2000 + Number(expiryMatch[2]);
  if (expiryMonth < 1 || expiryMonth > 12) return "Le mois doit être compris entre 01 et 12.";
  const currentDate = new Date();
  const expiryEndDate = new Date(expiryYear, expiryMonth, 1);
  if (expiryEndDate <= currentDate) return "Cette carte est expirée.";
  if (expiryYear > currentDate.getFullYear() + 15) return "Date d'expiration improbable.";
  return "";
}

const paymentValidationRules = {
  cardNumber: (fieldValue) => {
    const cardDigits = fieldValue.replace(/\D/g, "");
    const cardBrand = detectCardBrand(cardDigits);
    if (cardDigits.length !== cardBrand.numberLength) return `Le numéro doit comporter ${cardBrand.numberLength} chiffres.`;
    return passesLuhnChecksum(cardDigits) ? "" : "Ce numéro de carte n'est pas valide.";
  },
  cardHolder: (fieldValue) => /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{3,}$/.test(fieldValue) && fieldValue.includes(" ") ? "" : "Indiquez le prénom et le nom figurant sur la carte.",
  cardExpiry: (fieldValue) => validateExpiryDate(fieldValue),
  cardCvc: (fieldValue, formValues) => {
    const expectedLength = detectCardBrand(String(formValues.cardNumber || "").replace(/\D/g, "")).cvcLength;
    return new RegExp(`^\\d{${expectedLength}}$`).test(fieldValue) ? "" : `Le cryptogramme comporte ${expectedLength} chiffres.`;
  }
};

/* Live card preview. */
function updateCardPreview() {
  const cardDigits = checkoutElements.cardNumberInput.value.replace(/\D/g, "");
  const cardBrand = detectCardBrand(cardDigits);
  const maskedDigits = cardDigits.padEnd(cardBrand.numberLength, "•");
  checkoutElements.cardNumberPreview.textContent = formatCardNumber(maskedDigits, cardBrand);
  checkoutElements.cardHolderPreview.textContent = checkoutElements.cardHolderInput.value.trim().toUpperCase() || "PRÉNOM NOM";
  checkoutElements.cardExpiryPreview.textContent = checkoutElements.cardExpiryInput.value || "MM/AA";
  checkoutElements.cardCvcPreview.textContent = checkoutElements.cardCvcInput.value.replace(/\d/g, "•") || "•".repeat(cardBrand.cvcLength);
  checkoutElements.cardBrandPreview.textContent = cardBrand.label;
  checkoutElements.cardPreview.dataset.brand = cardBrand.id;
}

function initPaymentInputs() {
  checkoutElements.cardNumberInput.addEventListener("input", () => {
    const cardDigits = checkoutElements.cardNumberInput.value.replace(/\D/g, "");
    const cardBrand = detectCardBrand(cardDigits);
    checkoutElements.cardNumberInput.value = formatCardNumber(cardDigits.slice(0, cardBrand.numberLength), cardBrand);
    checkoutElements.cardCvcInput.maxLength = cardBrand.cvcLength;
    updateCardPreview();
  });
  checkoutElements.cardExpiryInput.addEventListener("input", (inputEvent) => {
    const expiryDigits = checkoutElements.cardExpiryInput.value.replace(/\D/g, "").slice(0, 4);
    const isDeleting = inputEvent.inputType && inputEvent.inputType.startsWith("delete");
    checkoutElements.cardExpiryInput.value = expiryDigits.length > 2 || (expiryDigits.length === 2 && !isDeleting) ? `${expiryDigits.slice(0, 2)}/${expiryDigits.slice(2)}` : expiryDigits;
    updateCardPreview();
  });
  checkoutElements.cardCvcInput.addEventListener("input", () => {
    checkoutElements.cardCvcInput.value = checkoutElements.cardCvcInput.value.replace(/\D/g, "");
    updateCardPreview();
  });
  checkoutElements.cardHolderInput.addEventListener("input", updateCardPreview);
  checkoutElements.cardCvcInput.addEventListener("focus", () => checkoutElements.cardPreview.classList.add("is-flipped"));
  checkoutElements.cardCvcInput.addEventListener("blur", () => checkoutElements.cardPreview.classList.remove("is-flipped"));
  updateCardPreview();
}

/* Order summary and shipping methods. */
function renderOrderSummary(detailedLines = NordikCart.getDetailedLines(), cartTotals = NordikCart.computeTotals(checkoutState.shippingMethodId)) {
  checkoutElements.summaryLines.innerHTML = detailedLines.map((line) => renderCartLine(line, "summary")).join("");
  checkoutElements.summaryTotals.innerHTML = renderTotalsList(cartTotals);
  checkoutElements.paymentSubmitLabel.textContent = formatExactPrice(cartTotals.total);
}

function renderShippingMethods() {
  checkoutElements.shippingMethodList.innerHTML = Object.values(NordikCart.shippingMethods).map((shippingMethod) => {
    const methodPrice = NordikCart.computeTotals(shippingMethod.id).shipping;
    return `
      <label class="shipping-option">
        <input type="radio" name="shippingMethod" value="${escapeHtml(shippingMethod.id)}" ${shippingMethod.id === checkoutState.shippingMethodId ? "checked" : ""}>
        <span class="shipping-option__text"><strong>${escapeHtml(shippingMethod.label)}</strong><small>${escapeHtml(shippingMethod.delay)}</small></span>
        <span class="shipping-option__price">${methodPrice === 0 ? "Offerte" : formatExactPrice(methodPrice)}</span>
      </label>`;
  }).join("");
}

function showCheckoutStep(stepName) {
  const stepOrder = ["shipping", "payment", "confirmation"];
  checkoutState.currentStep = stepName;
  checkoutElements.stepSections.forEach((stepSection) => {
    stepSection.hidden = stepSection.dataset.checkoutStep !== stepName;
  });
  checkoutElements.stepIndicators.forEach((stepIndicator) => {
    const indicatorPosition = stepOrder.indexOf(stepIndicator.dataset.stepIndicator);
    const activePosition = stepOrder.indexOf(stepName);
    stepIndicator.classList.toggle("is-complete", indicatorPosition < activePosition);
    if (indicatorPosition === activePosition) stepIndicator.setAttribute("aria-current", "step");
    else stepIndicator.removeAttribute("aria-current");
  });
  const activeHeading = document.querySelector(`[data-checkout-step="${stepName}"] h2`);
  activeHeading.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
}

function generateOrderNumber() {
  const currentDate = new Date();
  const datePart = `${String(currentDate.getFullYear()).slice(2)}${String(currentDate.getMonth() + 1).padStart(2, "0")}${String(currentDate.getDate()).padStart(2, "0")}`;
  const randomPart = String(10000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 90000));
  return `NS-${datePart}-${randomPart}`;
}

function renderConfirmation(orderNumber, cardDigits, cartTotals) {
  const shippingDetails = checkoutState.shippingDetails;
  const shippingMethod = NordikCart.getShippingMethod(checkoutState.shippingMethodId);
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + (shippingMethod.id === "express" ? 1 : 4));
  checkoutElements.confirmationContent.innerHTML = `
    <div class="confirmation__icon" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M14 24.5l7 7 13-14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    <p class="eyebrow">Commande confirmée</p>
    <h3 class="confirmation__title">Merci ${escapeHtml(shippingDetails.firstName)}, votre commande est en préparation.</h3>
    <p class="confirmation__number">Numéro de commande <strong>${escapeHtml(orderNumber)}</strong></p>
    <p>Un e-mail de confirmation a été envoyé à <strong>${escapeHtml(shippingDetails.email)}</strong>. Vous recevrez le lien de suivi dès l'expédition depuis notre entrepôt de Lille.</p>
    <dl class="confirmation__details">
      <div><dt>Livraison</dt><dd>${escapeHtml(shippingDetails.firstName)} ${escapeHtml(shippingDetails.lastName)}<br>${escapeHtml(shippingDetails.address)}${shippingDetails.addressComplement ? `<br>${escapeHtml(shippingDetails.addressComplement)}` : ""}<br>${escapeHtml(shippingDetails.postalCode)} ${escapeHtml(shippingDetails.city)}, ${escapeHtml(shippingDetails.country)}</dd></div>
      <div><dt>Mode d'envoi</dt><dd>${escapeHtml(shippingMethod.label)}<br>Arrivée estimée le ${deliveryDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</dd></div>
      <div><dt>Paiement</dt><dd>Carte se terminant par ${escapeHtml(cardDigits.slice(-4))}<br>${formatExactPrice(cartTotals.total)} débités</dd></div>
    </dl>
    <div class="confirmation__actions">
      <a class="button button--primary" href="catalogue.html">Continuer mes achats</a>
      <a class="button button--ghost" href="index.html">Retour à l'accueil</a>
    </div>`;
}

function initCheckoutForms() {
  bindLiveValidation(checkoutElements.shippingForm, shippingValidationRules);
  bindLiveValidation(checkoutElements.paymentForm, paymentValidationRules);
  checkoutElements.shippingMethodList.addEventListener("change", (changeEvent) => {
    if (changeEvent.target.name !== "shippingMethod") return;
    checkoutState.shippingMethodId = NordikCart.getShippingMethod(changeEvent.target.value).id;
    renderOrderSummary();
  });
  checkoutElements.shippingForm.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    const shippingDetails = validateFormFields(checkoutElements.shippingForm, shippingValidationRules);
    if (!shippingDetails) return;
    checkoutState.shippingDetails = shippingDetails;
    checkoutElements.shippingRecap.innerHTML = `<strong>Livraison à :</strong> ${escapeHtml(shippingDetails.firstName)} ${escapeHtml(shippingDetails.lastName)}, ${escapeHtml(shippingDetails.address)}, ${escapeHtml(shippingDetails.postalCode)} ${escapeHtml(shippingDetails.city)} · ${escapeHtml(NordikCart.getShippingMethod(checkoutState.shippingMethodId).label)}`;
    showCheckoutStep("payment");
  });
  checkoutElements.backToShippingButton.addEventListener("click", () => showCheckoutStep("shipping"));
  checkoutElements.paymentForm.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    const paymentDetails = validateFormFields(checkoutElements.paymentForm, paymentValidationRules);
    if (!paymentDetails) return;
    const orderedLines = NordikCart.getDetailedLines();
    const orderTotals = NordikCart.computeTotals(checkoutState.shippingMethodId);
    const orderNumber = generateOrderNumber();
    checkoutState.orderPlaced = true;
    renderConfirmation(orderNumber, paymentDetails.cardNumber.replace(/\D/g, ""), orderTotals);
    NordikCart.clearCart();
    renderOrderSummary(orderedLines, orderTotals);
    checkoutElements.paymentForm.reset();
    showCheckoutStep("confirmation");
  });
}

function refreshCheckoutAvailability() {
  if (checkoutState.orderPlaced) return;
  const cartIsEmpty = NordikCart.getItemCount() === 0;
  checkoutElements.checkoutLayout.hidden = cartIsEmpty;
  checkoutElements.emptyState.hidden = !cartIsEmpty;
  if (!cartIsEmpty) {
    renderShippingMethods();
    renderOrderSummary();
  }
}

initPaymentInputs();
initCheckoutForms();
refreshCheckoutAvailability();
NordikCart.subscribe(refreshCheckoutAvailability);
