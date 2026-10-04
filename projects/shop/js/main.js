/* Nordik Store shared module: formatting, product cards, mini-cart drawer, cart badges and common UI behaviours. */
const priceFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function formatPrice(amount) {
  return priceFormatter.format(amount).replace(/,00(?=\s?€)/, "");
}

function formatExactPrice(amount) {
  return priceFormatter.format(amount);
}

function escapeHtml(rawText) {
  return String(rawText).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function normalizeSearchText(rawText) {
  return String(rawText).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function getQueryParameter(parameterName) {
  return new URLSearchParams(window.location.search).get(parameterName);
}

/* Shared product markup. */
function renderRatingStars(ratingValue) {
  const roundedRating = Math.round(ratingValue);
  return `<span class="rating" aria-label="Note de ${String(ratingValue).replace(".", ",")} sur 5">${"★".repeat(roundedRating)}<span class="rating__off">${"★".repeat(5 - roundedRating)}</span></span>`;
}

function renderPriceMarkup(product, unitPrice = product.price) {
  const compareMarkup = product.compareAtPrice ? ` <s class="price__compare">${formatPrice(product.compareAtPrice)}</s>` : "";
  return `<span class="price${product.compareAtPrice ? " price--sale" : ""}">${formatPrice(unitPrice)}${compareMarkup}</span>`;
}

function renderProductBadges(product) {
  const badgeMarkup = [];
  if (product.compareAtPrice) badgeMarkup.push(`<span class="product-badge product-badge--sale">-${Math.round((1 - product.price / product.compareAtPrice) * 100)} %</span>`);
  if (product.isNew) badgeMarkup.push('<span class="product-badge product-badge--new">Nouveau</span>');
  if (product.bestseller) badgeMarkup.push('<span class="product-badge">Best-seller</span>');
  return badgeMarkup.length ? `<div class="product-badges">${badgeMarkup.join("")}</div>` : "";
}

function renderColorDots(product) {
  return `<ul class="color-dots" aria-label="Coloris disponibles">${product.colors.map((color) => `<li style="--swatch:${color.hex}" title="${escapeHtml(color.name)}"><span class="visually-hidden">${escapeHtml(color.name)}</span></li>`).join("")}</ul>`;
}

function renderProductCard(product, cardOptions = {}) {
  const category = NordikCatalog.getCategoryById(product.category);
  const quickViewButton = cardOptions.withQuickView ? `<button type="button" class="product-card__quick-view" data-quick-view="${product.id}">Aperçu rapide</button>` : "";
  return `
    <article class="product-card reveal">
      <div class="product-card__media">
        <a href="produit.html?id=${encodeURIComponent(product.id)}" tabindex="-1" aria-hidden="true">
          <img class="product-card__image" src="${product.thumbnail}" alt="" loading="lazy" width="480" height="600">
          <img class="product-card__image product-card__image--hover" src="${product.hoverImage}" alt="" loading="lazy" width="480" height="600">
        </a>
        ${renderProductBadges(product)}
        <div class="product-card__actions">
          ${quickViewButton}
          <button type="button" class="product-card__add" data-quick-add="${product.id}" aria-label="Ajouter ${escapeHtml(product.name)} au panier">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
      <div class="product-card__body">
        <p class="product-card__category">${escapeHtml(category.name)}</p>
        <h3 class="product-card__name"><a href="produit.html?id=${encodeURIComponent(product.id)}">${escapeHtml(product.name)}</a></h3>
        <div class="product-card__footer">${renderPriceMarkup(product)}${renderColorDots(product)}</div>
      </div>
    </article>`;
}

/* Shared cart markup used by the drawer, the cart page and the checkout summary. */
function renderCartLineOptions(line) {
  return [line.color, line.size].filter(Boolean).map(escapeHtml).join(" · ");
}

function renderQuantityStepper(line) {
  return `
    <div class="quantity-stepper" role="group" aria-label="Quantité pour ${escapeHtml(line.product.name)}">
      <button type="button" data-cart-action="decrement" data-line-key="${escapeHtml(line.key)}" aria-label="Retirer un exemplaire">−</button>
      <input type="number" min="1" max="${NordikCart.MAXIMUM_LINE_QUANTITY}" value="${line.quantity}" data-cart-quantity-input data-line-key="${escapeHtml(line.key)}" aria-label="Quantité">
      <button type="button" data-cart-action="increment" data-line-key="${escapeHtml(line.key)}" aria-label="Ajouter un exemplaire" ${line.quantity >= NordikCart.MAXIMUM_LINE_QUANTITY ? "disabled" : ""}>+</button>
    </div>`;
}

function renderCartLine(line, lineVariant) {
  const productUrl = `produit.html?id=${encodeURIComponent(line.product.id)}`;
  const isEditable = lineVariant !== "summary";
  return `
    <li class="cart-line cart-line--${lineVariant}">
      <a class="cart-line__media" href="${productUrl}" tabindex="-1" aria-hidden="true"><img src="${line.product.thumbnail}" alt="" width="96" height="120" loading="lazy">${lineVariant === "summary" ? `<span class="cart-line__count">${line.quantity}</span>` : ""}</a>
      <div class="cart-line__info">
        <a class="cart-line__name" href="${productUrl}">${escapeHtml(line.product.name)}</a>
        <p class="cart-line__options">${renderCartLineOptions(line)}</p>
        ${lineVariant === "page" ? `<p class="cart-line__unit">${formatExactPrice(line.unitPrice)} l'unité</p>` : ""}
        ${isEditable ? renderQuantityStepper(line) : ""}
      </div>
      <div class="cart-line__end">
        <span class="cart-line__total">${formatExactPrice(line.lineTotal)}</span>
        ${isEditable ? `<button type="button" class="link-button" data-cart-action="remove" data-line-key="${escapeHtml(line.key)}">Retirer<span class="visually-hidden"> ${escapeHtml(line.product.name)}</span></button>` : ""}
      </div>
    </li>`;
}

function renderShippingProgress(cartTotals) {
  const progressMessage = cartTotals.remainingForFreeShipping > 0
    ? `Plus que <strong>${formatExactPrice(cartTotals.remainingForFreeShipping)}</strong> pour profiter de la livraison offerte.`
    : "<strong>Bonne nouvelle :</strong> la livraison standard vous est offerte.";
  return `
    <div class="shipping-progress${cartTotals.remainingForFreeShipping > 0 ? "" : " is-complete"}">
      <p>${progressMessage}</p>
      <div class="shipping-progress__track" role="progressbar" aria-label="Progression vers la livraison offerte" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(cartTotals.freeShippingProgress * 100)}">
        <span class="shipping-progress__bar" style="--progress:${cartTotals.freeShippingProgress}"></span>
      </div>
    </div>`;
}

function renderTotalsList(cartTotals) {
  const discountRow = cartTotals.discount > 0 ? `<div class="totals__row totals__row--discount"><dt>Remise ${escapeHtml(cartTotals.activePromo.code)}</dt><dd>−${formatExactPrice(cartTotals.discount)}</dd></div>` : "";
  return `
    <dl class="totals">
      <div class="totals__row"><dt>Sous-total</dt><dd>${formatExactPrice(cartTotals.subtotal)}</dd></div>
      ${discountRow}
      <div class="totals__row"><dt>Livraison</dt><dd>${cartTotals.shipping === 0 ? "Offerte" : formatExactPrice(cartTotals.shipping)}</dd></div>
      <div class="totals__row totals__row--grand"><dt>Total <small>TVA incluse</small></dt><dd>${formatExactPrice(cartTotals.total)}</dd></div>
    </dl>`;
}

/* Mini-cart drawer. */
const cartDrawerElement = document.querySelector("[data-cart-drawer]");
const cartDrawerOverlay = document.querySelector("[data-drawer-overlay]");
let elementFocusedBeforeDrawer = null;

function renderMiniCart() {
  if (!cartDrawerElement) return;
  const drawerBody = cartDrawerElement.querySelector("[data-drawer-body]");
  const drawerFooter = cartDrawerElement.querySelector("[data-drawer-footer]");
  const detailedLines = NordikCart.getDetailedLines();
  const cartTotals = NordikCart.computeTotals();
  cartDrawerElement.querySelector("[data-drawer-count]").textContent = `(${NordikCart.getItemCount()})`;
  if (!detailedLines.length) {
    drawerBody.innerHTML = `
      <div class="drawer-empty">
        <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 16h28l-2.5 22a3 3 0 01-3 2.7H15.5a3 3 0 01-3-2.7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M17 16v-3a7 7 0 0114 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        <p>Votre panier est vide pour le moment.</p>
        <a class="button button--primary" href="catalogue.html">Découvrir la collection</a>
      </div>`;
    drawerFooter.hidden = true;
    return;
  }
  drawerBody.innerHTML = `${renderShippingProgress(cartTotals)}<ul class="cart-lines">${detailedLines.map((line) => renderCartLine(line, "drawer")).join("")}</ul>`;
  drawerFooter.hidden = false;
  drawerFooter.querySelector("[data-drawer-totals]").innerHTML = renderTotalsList(cartTotals);
}

function openCartDrawer() {
  if (!cartDrawerElement) return;
  elementFocusedBeforeDrawer = document.activeElement;
  cartDrawerElement.inert = false;
  cartDrawerElement.classList.add("is-open");
  cartDrawerOverlay.classList.add("is-visible");
  document.body.classList.add("has-open-drawer");
  cartDrawerElement.querySelector("[data-close-cart]").focus();
}

function closeCartDrawer() {
  if (!cartDrawerElement || !cartDrawerElement.classList.contains("is-open")) return;
  cartDrawerElement.classList.remove("is-open");
  cartDrawerOverlay.classList.remove("is-visible");
  document.body.classList.remove("has-open-drawer");
  cartDrawerElement.inert = true;
  if (elementFocusedBeforeDrawer) elementFocusedBeforeDrawer.focus();
}

function updateCartBadges() {
  const itemCount = NordikCart.getItemCount();
  document.querySelectorAll("[data-cart-count]").forEach((badgeElement) => {
    const previousCount = Number(badgeElement.textContent) || 0;
    badgeElement.textContent = String(itemCount);
    badgeElement.hidden = itemCount === 0;
    if (itemCount > previousCount) {
      badgeElement.classList.remove("is-bumping");
      requestAnimationFrame(() => badgeElement.classList.add("is-bumping"));
    }
  });
  document.querySelectorAll("[data-open-cart]").forEach((cartButton) => cartButton.setAttribute("aria-label", `Ouvrir le panier, ${itemCount} article${itemCount > 1 ? "s" : ""}`));
}

function addProductToCart(cartItemInput, shouldOpenDrawer = true) {
  const product = NordikCatalog.getProductById(cartItemInput.productId);
  if (!product) return;
  NordikCart.addItem(cartItemInput);
  showToast(`${product.name} a été ajouté au panier.`);
  if (shouldOpenDrawer) openCartDrawer();
}

function initCartInteractions() {
  document.querySelectorAll("[data-open-cart]").forEach((cartButton) => cartButton.addEventListener("click", openCartDrawer));
  document.querySelectorAll("[data-close-cart]").forEach((closeButton) => closeButton.addEventListener("click", closeCartDrawer));
  if (cartDrawerOverlay) cartDrawerOverlay.addEventListener("click", closeCartDrawer);
  document.addEventListener("keydown", (keyboardEvent) => {
    if (keyboardEvent.key === "Escape") closeCartDrawer();
  });
  document.addEventListener("click", (clickEvent) => {
    const quickAddButton = clickEvent.target.closest("[data-quick-add]");
    const cartActionButton = clickEvent.target.closest("[data-cart-action]");
    if (quickAddButton) addProductToCart({ productId: quickAddButton.dataset.quickAdd, quantity: 1 });
    if (!cartActionButton) return;
    const lineKey = cartActionButton.dataset.lineKey;
    const targetLine = NordikCart.getDetailedLines().find((line) => line.key === lineKey);
    if (!targetLine) return;
    if (cartActionButton.dataset.cartAction === "increment") NordikCart.setQuantity(lineKey, targetLine.quantity + 1);
    if (cartActionButton.dataset.cartAction === "decrement") NordikCart.setQuantity(lineKey, targetLine.quantity - 1);
    if (cartActionButton.dataset.cartAction === "remove") {
      NordikCart.removeItem(lineKey);
      showToast(`${targetLine.product.name} a été retiré du panier.`);
    }
  });
  document.addEventListener("change", (changeEvent) => {
    const quantityInput = changeEvent.target.closest("[data-cart-quantity-input]");
    if (quantityInput) NordikCart.setQuantity(quantityInput.dataset.lineKey, quantityInput.value);
  });
  document.addEventListener("animationend", (animationEvent) => {
    if (animationEvent.animationName === "badge-bump") animationEvent.target.classList.remove("is-bumping");
  });
  NordikCart.subscribe(() => {
    renderMiniCart();
    updateCartBadges();
  });
  renderMiniCart();
  updateCartBadges();
}

/* Toast notifications removed once their exit animation ends. */
function showToast(messageText) {
  let toastRegion = document.querySelector(".toast-region");
  if (!toastRegion) {
    toastRegion = document.createElement("div");
    toastRegion.className = "toast-region";
    toastRegion.setAttribute("role", "status");
    toastRegion.setAttribute("aria-live", "polite");
    document.body.appendChild(toastRegion);
  }
  const toastElement = document.createElement("div");
  toastElement.className = "toast";
  toastElement.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${escapeHtml(messageText)}</span>`;
  toastElement.addEventListener("animationend", (animationEvent) => {
    if (animationEvent.animationName === "toast-out") toastElement.remove();
  });
  toastRegion.appendChild(toastElement);
}

/* Newsletter forms with front-end validation and success state. */
function initNewsletterForms() {
  document.querySelectorAll("[data-newsletter-form]").forEach((newsletterForm) => {
    const emailInput = newsletterForm.querySelector("input[type=email]");
    const feedbackElement = newsletterForm.querySelector("[data-newsletter-feedback]");
    newsletterForm.addEventListener("submit", (submitEvent) => {
      submitEvent.preventDefault();
      if (!EMAIL_PATTERN.test(emailInput.value.trim())) {
        feedbackElement.textContent = "Merci de saisir une adresse e-mail valide.";
        feedbackElement.className = "form-feedback form-feedback--error";
        emailInput.setAttribute("aria-invalid", "true");
        emailInput.focus();
        return;
      }
      emailInput.removeAttribute("aria-invalid");
      feedbackElement.textContent = `Merci ! Votre code de bienvenue NORDIK10 vient d'être envoyé à ${emailInput.value.trim()}.`;
      feedbackElement.className = "form-feedback form-feedback--success";
      newsletterForm.classList.add("is-subscribed");
      newsletterForm.reset();
    });
  });
}

/* Header: burger menu, sticky state and active link. */
function initHeader() {
  const navigationToggleButton = document.querySelector(".nav-toggle");
  const siteNavigationElement = document.querySelector(".site-nav");
  const headerElement = document.querySelector(".site-header");
  const scrollSentinelElement = document.querySelector(".scroll-sentinel");
  if (navigationToggleButton && siteNavigationElement) {
    navigationToggleButton.addEventListener("click", () => {
      const isOpen = navigationToggleButton.getAttribute("aria-expanded") === "true";
      navigationToggleButton.setAttribute("aria-expanded", String(!isOpen));
      siteNavigationElement.classList.toggle("is-open", !isOpen);
      document.body.classList.toggle("has-open-menu", !isOpen);
    });
  }
  if (headerElement && scrollSentinelElement) {
    const headerObserver = new IntersectionObserver(([sentinelEntry]) => headerElement.classList.toggle("is-scrolled", !sentinelEntry.isIntersecting));
    headerObserver.observe(scrollSentinelElement);
  }
  const currentPageName = document.body.dataset.page;
  const currentCategoryParameter = getQueryParameter("cat");
  document.querySelectorAll(".site-nav [data-nav]").forEach((navigationLink) => {
    const linkCategory = navigationLink.dataset.navCategory || null;
    if (navigationLink.dataset.nav === currentPageName && linkCategory === (currentPageName === "catalogue" ? currentCategoryParameter : null)) navigationLink.setAttribute("aria-current", "page");
  });
}

/* Scroll reveal for static and dynamically rendered content. */
const revealObserver = "IntersectionObserver" in window ? new IntersectionObserver((revealEntries) => {
  revealEntries.forEach((revealEntry) => {
    if (!revealEntry.isIntersecting) return;
    revealEntry.target.classList.add("is-visible");
    revealObserver.unobserve(revealEntry.target);
  });
}, { rootMargin: "0px 0px -40px 0px", threshold: 0.05 }) : null;

function observeRevealElements(rootElement = document) {
  rootElement.querySelectorAll(".reveal:not(.is-visible)").forEach((revealElement) => {
    if (revealObserver) revealObserver.observe(revealElement);
    else revealElement.classList.add("is-visible");
  });
}

/* Animated counters driven by requestAnimationFrame. */
function animateCounter(counterElement) {
  const targetValue = Number(counterElement.dataset.countTo);
  const counterSuffix = counterElement.dataset.countSuffix || "";
  if (prefersReducedMotion) {
    counterElement.textContent = targetValue.toLocaleString("fr-FR") + counterSuffix;
    return;
  }
  let animationStartTime = null;
  function renderCounterFrame(frameTime) {
    if (animationStartTime === null) animationStartTime = frameTime;
    const progressRatio = Math.min((frameTime - animationStartTime) / 1400, 1);
    counterElement.textContent = Math.round(targetValue * (1 - Math.pow(1 - progressRatio, 3))).toLocaleString("fr-FR") + counterSuffix;
    if (progressRatio < 1) requestAnimationFrame(renderCounterFrame);
  }
  requestAnimationFrame(renderCounterFrame);
}

function initAnimatedCounters() {
  const counterElements = document.querySelectorAll("[data-count-to]");
  if (!("IntersectionObserver" in window)) {
    counterElements.forEach(animateCounter);
    return;
  }
  const counterObserver = new IntersectionObserver((counterEntries) => {
    counterEntries.forEach((counterEntry) => {
      if (!counterEntry.isIntersecting) return;
      animateCounter(counterEntry.target);
      counterObserver.unobserve(counterEntry.target);
    });
  }, { threshold: 0.5 });
  counterElements.forEach((counterElement) => counterObserver.observe(counterElement));
}

/* Fade-out page transition: navigation happens on transitionend. */
function navigateWithTransition(destinationHref) {
  const bodyElement = document.body;
  if (prefersReducedMotion || bodyElement.classList.contains("is-leaving")) {
    window.location.href = destinationHref;
    return;
  }
  bodyElement.addEventListener("transitionend", function handleLeaveTransition(transitionEvent) {
    if (transitionEvent.target !== bodyElement || transitionEvent.propertyName !== "opacity") return;
    bodyElement.removeEventListener("transitionend", handleLeaveTransition);
    window.location.href = destinationHref;
  });
  bodyElement.classList.add("is-leaving");
}

function initPageTransitions() {
  document.addEventListener("click", (clickEvent) => {
    const linkElement = clickEvent.target.closest("a[href]");
    if (!linkElement || clickEvent.defaultPrevented || clickEvent.button !== 0 || clickEvent.metaKey || clickEvent.ctrlKey || clickEvent.shiftKey || clickEvent.altKey) return;
    if (linkElement.target === "_blank" || linkElement.hasAttribute("download")) return;
    const destinationUrl = new URL(linkElement.href, window.location.href);
    const isSamePageAnchor = destinationUrl.pathname === window.location.pathname && destinationUrl.search === window.location.search && destinationUrl.hash !== "";
    if (destinationUrl.origin !== window.location.origin || isSamePageAnchor || !/\.html$/.test(destinationUrl.pathname)) return;
    clickEvent.preventDefault();
    navigateWithTransition(destinationUrl.href);
  });
  window.addEventListener("pageshow", () => document.body.classList.remove("is-leaving"));
}

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initCartInteractions();
  initNewsletterForms();
  initPageTransitions();
  observeRevealElements();
  initAnimatedCounters();
});
