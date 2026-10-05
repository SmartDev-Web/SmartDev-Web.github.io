/* Product page: gallery with thumbnails, hover zoom and lightbox, options, quantity, add to cart and related products. */
const productPageElements = {
  pageRoot: document.querySelector("[data-product-page]"),
  breadcrumbCategory: document.querySelector("[data-breadcrumb-category]"),
  breadcrumbCurrent: document.querySelector("[data-breadcrumb-current]"),
  relatedSection: document.querySelector("[data-related-section]"),
  relatedGrid: document.querySelector("[data-related-grid]"),
  lightboxDialog: document.querySelector("#lightbox"),
  lightboxImage: document.querySelector("[data-lightbox-image]")
};

const requestedProductId = getQueryParameter("id");
const currentProduct = NordikCatalog.getProductById(requestedProductId);
const productSelection = { imageIndex: 0, color: "", size: "", quantity: 1 };

function renderProductDetail(product) {
  const category = NordikCatalog.getCategoryById(product.category);
  const stockMessage = product.stock <= LOW_STOCK_THRESHOLD ? `Plus que ${product.stock} en stock, commandez vite` : "En stock, expédié sous 48 h";
  const sizeFieldset = product.sizes.length ? `
    <fieldset class="option-group">
      <legend class="field-label">Taille : <span data-selected-size>${escapeHtml(product.sizes[0].label)}</span></legend>
      <div class="size-options">
        ${product.sizes.map((size, sizeIndex) => `<label class="size-option"><input type="radio" name="product-size" value="${escapeHtml(size.label)}" ${sizeIndex === 0 ? "checked" : ""}><span>${escapeHtml(size.label)}${size.priceDelta ? `<small>+${formatPrice(size.priceDelta)}</small>` : ""}</span></label>`).join("")}
      </div>
    </fieldset>` : "";
  productPageElements.pageRoot.innerHTML = `
    <section class="product-gallery" aria-label="Galerie photos">
      <figure class="gallery-main" data-gallery-main>
        <img decoding="async" src="${escapeHtml(product.gallery[0].src)}" alt="${escapeHtml(product.gallery[0].alt)}" width="1200" height="1400" data-gallery-image>
        ${renderProductBadges(product)}
        <button type="button" class="gallery-main__expand" data-open-lightbox aria-label="Agrandir la photo">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
        <figcaption class="gallery-main__hint">Survolez pour zoomer</figcaption>
      </figure>
      <div class="gallery-thumbs" role="group" aria-label="Choisir une photo">
        ${product.gallery.map((galleryImage, imageIndex) => `<button type="button" class="gallery-thumb" data-gallery-index="${imageIndex}" aria-pressed="${imageIndex === 0}" aria-label="Photo ${imageIndex + 1} : ${escapeHtml(galleryImage.alt)}"><img decoding="async" src="${escapeHtml(galleryImage.src.replace("w=1200&h=1400", "w=240&h=280"))}" alt="" width="240" height="280" loading="lazy"></button>`).join("")}
      </div>
    </section>
    <section class="product-info" aria-labelledby="product-title">
      <p class="eyebrow"><a href="catalogue.html?cat=${encodeURIComponent(category.id)}">${escapeHtml(category.name)}</a> · ${escapeHtml(product.designer)}</p>
      <h1 id="product-title">${escapeHtml(product.name)}</h1>
      <p class="product-info__rating">${renderRatingStars(product.rating)} <a href="#avis">${String(product.rating).replace(".", ",")} · ${product.reviewCount} avis vérifiés</a></p>
      <p class="product-info__price" data-product-price>${renderPriceMarkup(product)}</p>
      <p class="product-info__description">${escapeHtml(product.description)}</p>
      <form class="product-form" data-product-form novalidate>
        <fieldset class="option-group">
          <legend class="field-label">Coloris : <span data-selected-color>${escapeHtml(product.colors[0].name)}</span></legend>
          <div class="swatch-group">
            ${product.colors.map((color, colorIndex) => `<label class="swatch swatch--large" style="--swatch:${color.hex}"><input type="radio" name="product-color" value="${escapeHtml(color.name)}" ${colorIndex === 0 ? "checked" : ""}><span class="visually-hidden">${escapeHtml(color.name)}</span></label>`).join("")}
          </div>
        </fieldset>
        ${sizeFieldset}
        <div class="purchase-row">
          <div class="quantity-stepper quantity-stepper--large" role="group" aria-label="Quantité">
            <button type="button" data-product-quantity="-1" aria-label="Diminuer la quantité">−</button>
            <input type="number" id="product-quantity" min="1" max="${NordikCart.getMaximumQuantity(product)}" value="1" aria-label="Quantité" data-product-quantity-input>
            <button type="button" data-product-quantity="1" aria-label="Augmenter la quantité">+</button>
          </div>
          <button type="submit" class="button button--primary button--block">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.3 11.2a2 2 0 01-2 1.8H8.3a2 2 0 01-2-1.8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 8V6a3 3 0 016 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
            Ajouter au panier · <span data-add-total>${formatPrice(product.price)}</span>
          </button>
        </div>
        <p class="stock-info${product.stock <= LOW_STOCK_THRESHOLD ? " stock-info--low" : ""}"><span class="stock-info__dot" aria-hidden="true"></span>${stockMessage}</p>
      </form>
      <ul class="product-perks">
        <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7" cy="17.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="17.5" r="1.7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>Livraison offerte dès ${formatPrice(NordikCart.FREE_SHIPPING_THRESHOLD)}</li>
        <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>Retours gratuits sous 30 jours</li>
        <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>Garantie artisan 2 ans</li>
      </ul>
      <div class="accordion">
        <details open>
          <summary>Détails et dimensions</summary>
          <ul>${product.details.map((detailText) => `<li>${escapeHtml(detailText)}</li>`).join("")}</ul>
        </details>
        <details>
          <summary>Livraison et retours</summary>
          <p>Préparation et expédition depuis notre entrepôt de Lille. Livraison standard en ${escapeHtml(NordikCart.shippingMethods.standard.delay)} (${formatExactPrice(NordikCart.shippingMethods.standard.price)}, offerte dès ${formatPrice(NordikCart.FREE_SHIPPING_THRESHOLD)}) ou express en ${escapeHtml(NordikCart.shippingMethods.express.delay)} (${formatExactPrice(NordikCart.shippingMethods.express.price)}). Les meubles volumineux sont livrés en pièce de vie sur rendez-vous.</p>
        </details>
        <details>
          <summary>Entretien</summary>
          <p>Dépoussiérez avec un chiffon doux et sec. Évitez l'exposition prolongée au soleil direct et les produits ménagers abrasifs. Pour les textiles, suivez les indications de l'étiquette.</p>
        </details>
      </div>
    </section>
    <section class="product-reviews" id="avis" aria-labelledby="reviews-title">
      <h2 id="reviews-title">Ils l'ont adopté</h2>
      <div class="review-grid">
        <blockquote class="review-card reveal"><p>« Encore plus beau en vrai. La qualité des finitions est remarquable et la livraison a été très soignée. »</p><footer>${renderRatingStars(5)} Camille R., Nantes</footer></blockquote>
        <blockquote class="review-card reveal"><p>« Exactement la touche scandinave qu'il manquait à notre salon. Le coloris correspond parfaitement aux photos. »</p><footer>${renderRatingStars(5)} Hugo L., Annecy</footer></blockquote>
        <blockquote class="review-card reveal"><p>« Très satisfaite, emballage sans plastique et service client réactif quand j'ai eu une question. »</p><footer>${renderRatingStars(4)} Mathilde B., Rennes</footer></blockquote>
      </div>
    </section>`;
  productSelection.color = product.colors[0].name;
  productSelection.size = product.sizes.length ? product.sizes[0].label : "";
}

function updatePriceDisplay(product) {
  const unitPrice = NordikCatalog.getUnitPrice(product, productSelection.size);
  productPageElements.pageRoot.querySelector("[data-product-price]").innerHTML = renderPriceMarkup(product, unitPrice);
  productPageElements.pageRoot.querySelector("[data-add-total]").textContent = formatPrice(unitPrice * productSelection.quantity);
}

function showGalleryImage(product, imageIndex) {
  const galleryImageElement = productPageElements.pageRoot.querySelector("[data-gallery-image]");
  productSelection.imageIndex = (imageIndex + product.gallery.length) % product.gallery.length;
  galleryImageElement.src = product.gallery[productSelection.imageIndex].src;
  galleryImageElement.alt = product.gallery[productSelection.imageIndex].alt;
  productPageElements.pageRoot.querySelectorAll("[data-gallery-index]").forEach((thumbButton) => thumbButton.setAttribute("aria-pressed", String(Number(thumbButton.dataset.galleryIndex) === productSelection.imageIndex)));
}

function setProductQuantity(product, requestedQuantity) {
  productSelection.quantity = Math.min(Math.max(Math.round(Number(requestedQuantity)) || 1, 1), NordikCart.getMaximumQuantity(product));
  productPageElements.pageRoot.querySelector("[data-product-quantity-input]").value = String(productSelection.quantity);
  updatePriceDisplay(product);
}

function initGalleryInteractions(product) {
  const galleryMainElement = productPageElements.pageRoot.querySelector("[data-gallery-main]");
  const galleryImageElement = galleryMainElement.querySelector("[data-gallery-image]");
  const supportsHoverZoom = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  productPageElements.pageRoot.querySelector(".gallery-thumbs").addEventListener("click", (clickEvent) => {
    const thumbButton = clickEvent.target.closest("[data-gallery-index]");
    if (thumbButton) showGalleryImage(product, Number(thumbButton.dataset.galleryIndex));
  });
  productPageElements.pageRoot.querySelector(".gallery-thumbs").addEventListener("keydown", (keyboardEvent) => {
    if (keyboardEvent.key !== "ArrowRight" && keyboardEvent.key !== "ArrowLeft") return;
    showGalleryImage(product, productSelection.imageIndex + (keyboardEvent.key === "ArrowRight" ? 1 : -1));
    productPageElements.pageRoot.querySelector(`[data-gallery-index="${productSelection.imageIndex}"]`).focus();
  });
  if (supportsHoverZoom && !prefersReducedMotion) {
    let galleryBounds = null;
    galleryMainElement.addEventListener("pointerenter", () => {
      galleryBounds = galleryMainElement.getBoundingClientRect();
    });
    window.addEventListener("scroll", () => {
      galleryBounds = null;
    }, { passive: true });
    galleryMainElement.addEventListener("pointermove", (pointerEvent) => {
      if (!galleryBounds) galleryBounds = galleryMainElement.getBoundingClientRect();
      const horizontalPercent = ((pointerEvent.clientX - galleryBounds.left) / galleryBounds.width) * 100;
      const verticalPercent = ((pointerEvent.clientY - galleryBounds.top) / galleryBounds.height) * 100;
      galleryImageElement.style.transformOrigin = `${horizontalPercent}% ${verticalPercent}%`;
      galleryMainElement.classList.add("is-zoomed");
    });
    galleryMainElement.addEventListener("pointerleave", () => {
      galleryBounds = null;
      galleryMainElement.classList.remove("is-zoomed");
    });
  }
  const showLightboxImage = (imageIndex) => {
    showGalleryImage(product, imageIndex);
    productPageElements.lightboxImage.src = product.gallery[productSelection.imageIndex].src.replace("w=1200&h=1400", "w=1600&h=1870");
    productPageElements.lightboxImage.alt = product.gallery[productSelection.imageIndex].alt;
  };
  galleryMainElement.addEventListener("click", () => {
    showLightboxImage(productSelection.imageIndex);
    productPageElements.lightboxDialog.showModal();
  });
  productPageElements.lightboxDialog.addEventListener("keydown", (keyboardEvent) => {
    if (keyboardEvent.key !== "ArrowRight" && keyboardEvent.key !== "ArrowLeft") return;
    keyboardEvent.preventDefault();
    showLightboxImage(productSelection.imageIndex + (keyboardEvent.key === "ArrowRight" ? 1 : -1));
  });
  productPageElements.lightboxDialog.addEventListener("click", (clickEvent) => {
    const navigationButton = clickEvent.target.closest("[data-lightbox-step]");
    if (navigationButton) {
      showLightboxImage(productSelection.imageIndex + Number(navigationButton.dataset.lightboxStep));
      return;
    }
    if (clickEvent.target === productPageElements.lightboxDialog || clickEvent.target.closest("[data-close-lightbox]")) productPageElements.lightboxDialog.close();
  });
}

function initProductForm(product) {
  const productFormElement = productPageElements.pageRoot.querySelector("[data-product-form]");
  productFormElement.addEventListener("change", (changeEvent) => {
    if (changeEvent.target.name === "product-color") {
      productSelection.color = changeEvent.target.value;
      productFormElement.querySelector("[data-selected-color]").textContent = changeEvent.target.value;
    }
    if (changeEvent.target.name === "product-size") {
      productSelection.size = changeEvent.target.value;
      productFormElement.querySelector("[data-selected-size]").textContent = changeEvent.target.value;
      updatePriceDisplay(product);
    }
    if (changeEvent.target.matches("[data-product-quantity-input]")) setProductQuantity(product, changeEvent.target.value);
  });
  productFormElement.addEventListener("click", (clickEvent) => {
    const quantityButton = clickEvent.target.closest("[data-product-quantity]");
    if (quantityButton) setProductQuantity(product, productSelection.quantity + Number(quantityButton.dataset.productQuantity));
  });
  productFormElement.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    addProductToCart({ productId: product.id, color: productSelection.color, size: productSelection.size, quantity: productSelection.quantity });
    setProductQuantity(product, 1);
  });
}

function renderRelatedProducts(product) {
  const sameCategoryProducts = NordikCatalog.products.filter((candidate) => candidate.category === product.category && candidate.id !== product.id);
  const complementaryProducts = NordikCatalog.products.filter((candidate) => candidate.category !== product.category && candidate.bestseller);
  productPageElements.relatedGrid.innerHTML = sameCategoryProducts.concat(complementaryProducts).slice(0, 4).map((relatedProduct) => renderProductCard(relatedProduct)).join("");
}

function renderUnknownProduct() {
  document.title = "Produit introuvable · Nordik Store";
  productPageElements.breadcrumbCategory.remove();
  productPageElements.breadcrumbCurrent.textContent = "Produit introuvable";
  productPageElements.pageRoot.classList.add("product-layout--empty");
  productPageElements.pageRoot.innerHTML = `
    <div class="empty-results reveal">
      <h1>Ce produit n'est plus disponible</h1>
      <p>${requestedProductId ? "Le lien que vous avez suivi est incomplet, ou cette pièce a quitté notre collection." : "Aucun produit n'a été précisé dans l'adresse."} Découvrez nos best-sellers ci-dessous.</p>
      <a class="button button--primary" href="catalogue.html">Parcourir le catalogue</a>
    </div>`;
  productPageElements.relatedSection.querySelector("h2").textContent = "Nos best-sellers";
  productPageElements.relatedGrid.innerHTML = NordikCatalog.products.filter((product) => product.bestseller).slice(0, 4).map((product) => renderProductCard(product)).join("");
}

if (currentProduct) {
  const productCategory = NordikCatalog.getCategoryById(currentProduct.category);
  document.title = `${currentProduct.name} · Nordik Store`;
  document.querySelector('meta[name="description"]').setAttribute("content", `${currentProduct.name} (${productCategory.name}), par ${currentProduct.designer} : ${formatPrice(currentProduct.price)}. ${currentProduct.description}`.slice(0, 300));
  productPageElements.breadcrumbCategory.innerHTML = `<a href="catalogue.html?cat=${encodeURIComponent(productCategory.id)}">${escapeHtml(productCategory.name)}</a>`;
  productPageElements.breadcrumbCurrent.textContent = currentProduct.name;
  renderProductDetail(currentProduct);
  initGalleryInteractions(currentProduct);
  initProductForm(currentProduct);
  renderRelatedProducts(currentProduct);
} else {
  renderUnknownProduct();
}
