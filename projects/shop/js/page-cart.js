/* Cart page: editable line list, promo code, free shipping progress, totals and suggestions. */
const cartPageElements = {
  layout: document.querySelector("[data-cart-layout]"),
  lineList: document.querySelector("[data-cart-lines]"),
  itemCountLabel: document.querySelector("[data-cart-item-count]"),
  shippingProgress: document.querySelector("[data-cart-shipping]"),
  totals: document.querySelector("[data-cart-totals]"),
  promoForm: document.querySelector("[data-promo-form]"),
  promoInput: document.querySelector("#promo-code"),
  promoFeedback: document.querySelector("[data-promo-feedback]"),
  activePromo: document.querySelector("[data-active-promo]"),
  emptyState: document.querySelector("[data-cart-empty]"),
  suggestionGrid: document.querySelector("[data-cart-suggestions]")
};

function renderActivePromo(cartTotals) {
  if (!cartTotals.activePromo) {
    cartPageElements.activePromo.innerHTML = "";
    return;
  }
  const eligibilityNote = cartTotals.promoIsEligible ? cartTotals.activePromo.label : `Valable dès ${formatPrice(cartTotals.activePromo.minimumSubtotal)} d'achat`;
  cartPageElements.activePromo.innerHTML = `
    <div class="promo-pill${cartTotals.promoIsEligible ? "" : " promo-pill--pending"}">
      <span><strong>${escapeHtml(cartTotals.activePromo.code)}</strong> · ${escapeHtml(eligibilityNote)}</span>
      <button type="button" class="link-button" data-remove-promo>Retirer</button>
    </div>`;
}

function renderSuggestions() {
  const productIdsInCart = new Set(NordikCart.getDetailedLines().map((line) => line.productId));
  const suggestedProducts = NordikCatalog.products.filter((product) => !productIdsInCart.has(product.id) && product.price < 100).sort((firstProduct, secondProduct) => secondProduct.reviewCount - firstProduct.reviewCount).slice(0, 4);
  cartPageElements.suggestionGrid.innerHTML = suggestedProducts.map((product) => renderProductCard(product)).join("");
  observeRevealElements(cartPageElements.suggestionGrid);
}

function renderCartPage() {
  const detailedLines = NordikCart.getDetailedLines();
  const cartTotals = NordikCart.computeTotals();
  const itemCount = NordikCart.getItemCount();
  const hasItems = detailedLines.length > 0;
  cartPageElements.layout.hidden = !hasItems;
  cartPageElements.emptyState.hidden = hasItems;
  cartPageElements.itemCountLabel.textContent = hasItems ? `${itemCount} article${itemCount > 1 ? "s" : ""} dans votre panier` : "Votre panier est vide";
  if (hasItems) {
    cartPageElements.lineList.innerHTML = detailedLines.map((line) => renderCartLine(line, "page")).join("");
    cartPageElements.shippingProgress.innerHTML = renderShippingProgress(cartTotals);
    cartPageElements.totals.innerHTML = renderTotalsList(cartTotals);
    renderActivePromo(cartTotals);
  }
  renderSuggestions();
}

cartPageElements.promoForm.addEventListener("submit", (submitEvent) => {
  submitEvent.preventDefault();
  const promoResult = NordikCart.applyPromoCode(cartPageElements.promoInput.value);
  cartPageElements.promoFeedback.textContent = promoResult.message;
  cartPageElements.promoFeedback.className = `form-feedback ${promoResult.success ? "form-feedback--success" : "form-feedback--error"}`;
  cartPageElements.promoInput.setAttribute("aria-invalid", String(!promoResult.success));
  if (promoResult.success) cartPageElements.promoInput.value = "";
});

cartPageElements.activePromo.addEventListener("click", (clickEvent) => {
  if (!clickEvent.target.closest("[data-remove-promo]")) return;
  NordikCart.removePromoCode();
  cartPageElements.promoFeedback.textContent = "Le code promo a été retiré.";
  cartPageElements.promoFeedback.className = "form-feedback";
});

NordikCart.subscribe(renderCartPage);
renderCartPage();
