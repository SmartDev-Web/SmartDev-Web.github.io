/* ==========================================================================
   Echoes Festival — ticket selection, live total, promo code and checkout
   ========================================================================== */

const CART_STORAGE_KEY = "echoes.cart.v1";
const MAXIMUM_QUANTITY_PER_ITEM = 8;
const SERVICE_FEE_PER_TICKET = 2.5;
const emailAddressPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const ticketCatalog = [
  {
    groupLabel: "Pass 3 jours",
    items: [
      { id: "pass-3-jours", name: "Pass 3 jours", description: "Accès aux trois soirées, aux plages et aux navettes de nuit vers Lyon.", price: 149, isTicket: true, tag: "Early bird" },
      { id: "pass-camping", name: "Pass 3 jours + camping", description: "Le pass 3 jours avec un emplacement tente du jeudi 18 h au lundi midi, douches chaudes incluses.", price: 189, isTicket: true },
      { id: "pass-vip", name: "Pass VIP 3 jours", description: "Terrasse surplombant la Scène Soleil, bar et sanitaires dédiés, entrée coupe-file et vestiaire.", price: 329, isTicket: true, tag: "Places limitées" }
    ]
  },
  {
    groupLabel: "Billets à la journée",
    items: [
      { id: "jour-vendredi", name: "Vendredi 9 juillet", description: "Lumière Noire, KOMA, Les Rives, Selva Disco et 4 autres artistes.", price: 59, isTicket: true },
      { id: "jour-samedi", name: "Samedi 10 juillet", description: "Neon Atlas, Dalia Vox, Capitaine Écho, Rouge Minuit et 4 autres artistes.", price: 65, isTicket: true },
      { id: "jour-dimanche", name: "Dimanche 11 juillet", description: "Polaris Club, Mirage 404, Vague Rose, Opaline et 4 autres artistes.", price: 59, isTicket: true }
    ]
  },
  {
    groupLabel: "Options",
    items: [
      { id: "option-parking", name: "Parking voiture 3 jours", description: "Une place par véhicule sur le parking P2, à 400 m de l'entrée.", price: 25, isTicket: false },
      { id: "option-navette-aeroport", name: "Navette aéroport Saint-Exupéry", description: "Aller-retour entre l'aéroport et le site, horaires calés sur les vols.", price: 24, isTicket: false },
      { id: "option-tente", name: "Tente pré-montée 2 places", description: "Tente montée à votre arrivée dans l'espace «\u00a0Camp Lumière\u00a0», pour la durée du séjour.", price: 90, isTicket: false, requiredItemId: "pass-camping", requirementMessage: "Ajoutez d'abord un pass 3 jours + camping : une tente par pass camping." },
      { id: "option-kit", name: "Kit confort festivalier", description: "Poncho, bouchons d'oreilles, gourde Echoes et tote bag en coton bio.", price: 12, isTicket: false }
    ]
  }
];

const promoCodeCatalog = {
  ECHOES27: { label: "Code ECHOES27 (−10 %)", computeDiscount: (subtotalAmount) => subtotalAmount * 0.1, minimumSubtotal: 0 },
  BIENVENUE15: { label: "Code BIENVENUE15 (−15 €)", computeDiscount: () => 15, minimumSubtotal: 100 }
};

const ticketState = { quantities: {}, promoCode: null, isCheckoutOpen: false };

/* Returns true when a value is one of the promo codes defined in the catalog. */
function isKnownPromoCode(promoCodeValue) {
  return typeof promoCodeValue === "string" && Object.prototype.hasOwnProperty.call(promoCodeCatalog, promoCodeValue);
}

/* Formats an amount in euros with French conventions. */
function formatEuroAmount(amountValue) {
  return amountValue.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

/* Returns every ticket item in a flat list. */
function getAllTicketItems() {
  return ticketCatalog.flatMap((ticketGroup) => ticketGroup.items);
}

/* Returns the highest quantity allowed for an item, given the items it depends on. */
function getMaximumQuantityForItem(ticketItem) {
  if (!ticketItem.requiredItemId) return MAXIMUM_QUANTITY_PER_ITEM;
  return Math.min(ticketState.quantities[ticketItem.requiredItemId] || 0, MAXIMUM_QUANTITY_PER_ITEM);
}

/* Lowers dependent items to what their required items allow and returns the names of the adjusted items. */
function enforceCartDependencies() {
  const adjustedItemNames = [];
  getAllTicketItems().forEach((ticketItem) => {
    const currentQuantity = ticketState.quantities[ticketItem.id] || 0;
    const allowedQuantity = getMaximumQuantityForItem(ticketItem);
    if (currentQuantity <= allowedQuantity) return;
    if (allowedQuantity > 0) ticketState.quantities[ticketItem.id] = allowedQuantity;
    else delete ticketState.quantities[ticketItem.id];
    adjustedItemNames.push(ticketItem.name);
  });
  return adjustedItemNames;
}

/* Reads the saved cart from localStorage. */
function restoreCart() {
  try {
    const storedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "null");
    if (!storedCart || typeof storedCart !== "object" || !storedCart.quantities || typeof storedCart.quantities !== "object") return;
    getAllTicketItems().forEach((ticketItem) => {
      const storedQuantity = Object.prototype.hasOwnProperty.call(storedCart.quantities, ticketItem.id) ? parseInt(storedCart.quantities[ticketItem.id], 10) : 0;
      if (storedQuantity > 0) ticketState.quantities[ticketItem.id] = Math.min(storedQuantity, MAXIMUM_QUANTITY_PER_ITEM);
    });
    if (isKnownPromoCode(storedCart.promoCode)) ticketState.promoCode = storedCart.promoCode;
    if (enforceCartDependencies().length) persistCart();
  } catch (storageError) {
    console.warn("Cart could not be restored.", storageError);
  }
}

/* Saves the cart to localStorage. */
function persistCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ quantities: ticketState.quantities, promoCode: ticketState.promoCode }));
  } catch (storageError) {
    console.warn("Cart could not be saved.", storageError);
  }
}

/* Computes subtotal, fees, discount and total from the current cart. */
function computeCartTotals() {
  const cartLines = getAllTicketItems().filter((ticketItem) => ticketState.quantities[ticketItem.id] > 0).map((ticketItem) => ({ ticketItem, quantity: ticketState.quantities[ticketItem.id], lineTotal: ticketItem.price * ticketState.quantities[ticketItem.id] }));
  const subtotalAmount = cartLines.reduce((amountSum, cartLine) => amountSum + cartLine.lineTotal, 0);
  const ticketCount = cartLines.filter((cartLine) => cartLine.ticketItem.isTicket).reduce((countSum, cartLine) => countSum + cartLine.quantity, 0);
  const feesAmount = ticketCount * SERVICE_FEE_PER_TICKET;
  const activePromo = promoCodeCatalog[ticketState.promoCode];
  const isPromoApplicable = Boolean(activePromo) && subtotalAmount >= activePromo.minimumSubtotal && subtotalAmount > 0;
  const discountAmount = isPromoApplicable ? Math.min(activePromo.computeDiscount(subtotalAmount), subtotalAmount) : 0;
  return { cartLines, subtotalAmount, feesAmount, discountAmount, isPromoApplicable, totalAmount: subtotalAmount + feesAmount - discountAmount };
}

/* Renders the ticket catalog with quantity steppers. */
function renderTicketCatalog() {
  document.querySelector("[data-ticket-catalog]").innerHTML = ticketCatalog.map((ticketGroup) => `
    <h2 class="ticket-group-title">${ticketGroup.groupLabel}</h2>
    <ul class="ticket-list">
      ${ticketGroup.items.map((ticketItem) => `
        <li class="ticket-item" data-ticket-item="${ticketItem.id}">
          <div>
            <h3 class="ticket-name">${ticketItem.name}${ticketItem.tag ? `<span class="ticket-tag">${ticketItem.tag}</span>` : ""}</h3>
            <p class="ticket-description">${ticketItem.description}</p>
            ${ticketItem.requiredItemId ? `<p class="ticket-requirement" id="requirement-${ticketItem.id}" data-ticket-requirement="${ticketItem.id}">${ticketItem.requirementMessage}</p>` : ""}
            <span class="ticket-price">${formatEuroAmount(ticketItem.price)}</span>
          </div>
          <div class="stepper" role="group" aria-label="Quantité pour ${ticketItem.name}">
            <button type="button" aria-label="Retirer un ${ticketItem.name}" data-quantity-step="-1" data-ticket-id="${ticketItem.id}">−</button>
            <output aria-live="polite" data-quantity-output="${ticketItem.id}">0</output>
            <button type="button" aria-label="Ajouter un ${ticketItem.name}" data-quantity-step="1" data-ticket-id="${ticketItem.id}"${ticketItem.requiredItemId ? ` aria-describedby="requirement-${ticketItem.id}"` : ""}>+</button>
          </div>
        </li>`).join("")}
    </ul>`).join("");
}

/* Animates a numeric total from its displayed value to a target amount. */
function animateAmountElement(amountElement, targetAmount) {
  const startAmount = parseFloat(amountElement.dataset.currentAmount || "0");
  amountElement.dataset.currentAmount = String(targetAmount);
  animateNumericValue(startAmount, targetAmount, 500, (animatedAmount) => {
    amountElement.textContent = formatEuroAmount(animatedAmount);
  });
}

/* Renders steppers, summary lines and totals from the cart state. */
function renderCart() {
  const cartTotals = computeCartTotals();
  getAllTicketItems().forEach((ticketItem) => {
    const quantityValue = ticketState.quantities[ticketItem.id] || 0;
    const quantityOutputElement = document.querySelector(`[data-quantity-output="${ticketItem.id}"]`);
    quantityOutputElement.textContent = String(quantityValue);
    document.querySelector(`[data-ticket-item="${ticketItem.id}"]`).classList.toggle("is-selected", quantityValue > 0);
    document.querySelector(`[data-ticket-id="${ticketItem.id}"][data-quantity-step="-1"]`).disabled = quantityValue === 0;
    const maximumQuantity = getMaximumQuantityForItem(ticketItem);
    document.querySelector(`[data-ticket-id="${ticketItem.id}"][data-quantity-step="1"]`).disabled = quantityValue >= maximumQuantity;
    const requirementElement = document.querySelector(`[data-ticket-requirement="${ticketItem.id}"]`);
    if (requirementElement) requirementElement.classList.toggle("is-blocking", quantityValue >= maximumQuantity);
  });
  document.querySelector("[data-summary-lines]").innerHTML = cartTotals.cartLines.map((cartLine) => `<li><span>${cartLine.quantity} × ${cartLine.ticketItem.name}</span><span>${formatEuroAmount(cartLine.lineTotal)}</span></li>`).join("");
  document.querySelector("[data-summary-empty]").hidden = cartTotals.cartLines.length > 0;
  document.querySelector("[data-total-subtotal]").textContent = formatEuroAmount(cartTotals.subtotalAmount);
  document.querySelector("[data-total-fees]").textContent = formatEuroAmount(cartTotals.feesAmount);
  document.querySelector("[data-discount-row]").hidden = !cartTotals.isPromoApplicable;
  document.querySelector("[data-total-discount]").textContent = "−" + formatEuroAmount(cartTotals.discountAmount);
  if (cartTotals.isPromoApplicable) document.querySelector("[data-discount-label]").textContent = promoCodeCatalog[ticketState.promoCode].label;
  animateAmountElement(document.querySelector("[data-total-amount]"), cartTotals.totalAmount);
  document.querySelector("[data-open-checkout]").disabled = !isCartCheckoutReady(cartTotals);
  if (!isCartCheckoutReady(cartTotals) && !document.querySelector("[data-checkout-form]").hidden) showOrderPanel("cart");
  document.querySelector("[data-checkout-total]").textContent = formatEuroAmount(cartTotals.totalAmount);
  document.querySelector("[data-pay-button]").textContent = "Payer " + formatEuroAmount(cartTotals.totalAmount);
  renderPromoMessage(cartTotals);
}

/* Displays the status message of the applied promo code. */
function renderPromoMessage(cartTotals) {
  const promoMessageElement = document.querySelector("[data-promo-message]");
  if (!ticketState.promoCode) return;
  const activePromo = promoCodeCatalog[ticketState.promoCode];
  const pendingPromoMessage = cartTotals.subtotalAmount > 0 ? `Le code ${ticketState.promoCode} s'applique dès ${formatEuroAmount(activePromo.minimumSubtotal)} d'achat.` : `Le code ${ticketState.promoCode} sera appliqué dès que votre panier contiendra un article.`;
  promoMessageElement.className = "promo-message " + (cartTotals.isPromoApplicable ? "is-success" : "is-error");
  promoMessageElement.textContent = cartTotals.isPromoApplicable ? `✔ ${activePromo.label} appliqué` : pendingPromoMessage;
}

/* Changes the quantity of a ticket item by a step value. */
function changeTicketQuantity(ticketId, stepValue) {
  const currentQuantity = ticketState.quantities[ticketId] || 0;
  const ticketItem = getAllTicketItems().find((catalogItem) => catalogItem.id === ticketId);
  if (!ticketItem) return;
  const nextQuantity = Math.min(Math.max(currentQuantity + stepValue, 0), getMaximumQuantityForItem(ticketItem));
  if (nextQuantity === currentQuantity) return;
  ticketState.quantities[ticketId] = nextQuantity;
  if (nextQuantity === 0) delete ticketState.quantities[ticketId];
  const adjustedItemNames = enforceCartDependencies();
  if (adjustedItemNames.length) showToastMessage(`${adjustedItemNames.join(", ")} : quantité ajustée au nombre de pass camping`);
  if (!document.querySelector("[data-checkout-success]").hidden) showOrderPanel("cart");
  persistCart();
  renderCart();
  const quantityOutputElement = document.querySelector(`[data-quantity-output="${ticketId}"]`);
  quantityOutputElement.classList.remove("is-bumped");
  void quantityOutputElement.offsetWidth;
  quantityOutputElement.classList.add("is-bumped");
}

/* Validates one checkout field and shows its error message. */
function validateCheckoutField(fieldElement) {
  const validationRule = fieldElement.dataset.validate;
  const fieldValue = fieldElement.type === "checkbox" ? fieldElement.checked : fieldElement.value.trim();
  let errorMessage = "";
  if (validationRule === "checkbox" && !fieldValue) errorMessage = "Merci d'accepter les conditions de vente.";
  else if (validationRule !== "checkbox" && !fieldValue) errorMessage = "Ce champ est obligatoire.";
  else if (validationRule === "name" && fieldValue.length < 2) errorMessage = "Deux caractères minimum.";
  else if (validationRule === "email" && !emailAddressPattern.test(fieldValue)) errorMessage = "Adresse e-mail invalide.";
  const formFieldElement = fieldElement.closest(".form-field");
  formFieldElement.classList.toggle("has-error", Boolean(errorMessage));
  formFieldElement.querySelector(".field-error").textContent = errorMessage;
  fieldElement.setAttribute("aria-invalid", String(Boolean(errorMessage)));
  return !errorMessage;
}

/* Switches the summary panel between cart, checkout form and success state. */
function showOrderPanel(panelName) {
  document.querySelector("[data-cart-panel]").hidden = panelName !== "cart";
  document.querySelector("[data-checkout-form]").hidden = panelName !== "checkout";
  document.querySelector("[data-checkout-success]").hidden = panelName !== "success";
}

/* Returns true when the cart holds at least one ticket, the condition to open or submit the checkout. */
function isCartCheckoutReady(cartTotals) {
  return cartTotals.cartLines.some((cartLine) => cartLine.ticketItem.isTicket);
}

/* Completes the fake order, clears the cart and shows the confirmation. */
function completeOrder(checkoutFormElement) {
  const cartTotals = computeCartTotals();
  const buyerFirstName = checkoutFormElement.querySelector("#buyer-firstname").value.trim();
  const buyerEmail = checkoutFormElement.querySelector("#buyer-email").value.trim();
  const ticketCount = cartTotals.cartLines.filter((cartLine) => cartLine.ticketItem.isTicket).reduce((countSum, cartLine) => countSum + cartLine.quantity, 0);
  document.querySelector("[data-order-reference]").textContent = "ECH-27-" + Date.now().toString(36).toUpperCase().slice(-6);
  document.querySelector("[data-success-message]").textContent = `Merci ${buyerFirstName} ! ${ticketCount} billet${ticketCount > 1 ? "s" : ""} pour un total de ${formatEuroAmount(cartTotals.totalAmount)} ${ticketCount > 1 ? "arrivent" : "arrive"} à l'adresse ${buyerEmail}.`;
  ticketState.quantities = {};
  ticketState.promoCode = null;
  persistCart();
  checkoutFormElement.reset();
  document.querySelector("[data-promo-message]").textContent = "";
  renderCart();
  showOrderPanel("success");
  document.querySelector("[data-checkout-success] a").focus();
}

/* Registers every interaction of the ticketing page. */
function bindTicketEvents() {
  document.querySelector("[data-ticket-catalog]").addEventListener("click", (clickEvent) => {
    const stepButtonElement = clickEvent.target.closest("[data-quantity-step]");
    if (stepButtonElement) changeTicketQuantity(stepButtonElement.dataset.ticketId, parseInt(stepButtonElement.dataset.quantityStep, 10));
  });
  document.querySelector("[data-promo-form]").addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    const promoInputElement = document.querySelector("[data-promo-input]");
    const promoMessageElement = document.querySelector("[data-promo-message]");
    const enteredCode = promoInputElement.value.trim().toUpperCase();
    if (!isKnownPromoCode(enteredCode)) {
      promoMessageElement.className = "promo-message is-error";
      promoMessageElement.textContent = enteredCode ? `Le code «\u00a0${enteredCode}\u00a0» n'est pas valide.` : "Saisissez un code promo.";
      return;
    }
    ticketState.promoCode = enteredCode;
    promoInputElement.value = "";
    persistCart();
    renderCart();
  });
  document.querySelector("[data-open-checkout]").addEventListener("click", () => {
    showOrderPanel("checkout");
    document.querySelector("#buyer-firstname").focus();
  });
  document.querySelector("[data-back-to-cart]").addEventListener("click", () => showOrderPanel("cart"));
  const checkoutFormElement = document.querySelector("[data-checkout-form]");
  const checkoutFields = checkoutFormElement.querySelectorAll("[data-validate]");
  checkoutFields.forEach((fieldElement) => {
    fieldElement.addEventListener("blur", () => validateCheckoutField(fieldElement));
    fieldElement.addEventListener("change", () => validateCheckoutField(fieldElement));
  });
  checkoutFormElement.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    if (enforceCartDependencies().length) {
      persistCart();
      renderCart();
      showOrderPanel("cart");
      showToastMessage("Votre commande a été ajustée : une tente pré-montée nécessite un pass camping.");
      return;
    }
    if (!isCartCheckoutReady(computeCartTotals())) {
      showOrderPanel("cart");
      showToastMessage("Ajoutez au moins un billet avant de payer.");
      return;
    }
    const validationResults = Array.from(checkoutFields).map(validateCheckoutField);
    if (validationResults.every(Boolean)) {
      completeOrder(checkoutFormElement);
      return;
    }
    checkoutFormElement.querySelector("[aria-invalid='true']").focus();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector("[data-ticket-catalog]")) return;
  restoreCart();
  renderTicketCatalog();
  bindTicketEvents();
  renderCart();
});
