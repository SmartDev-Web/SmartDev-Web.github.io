/* Home page: shoppable hero, featured collections, bestseller and new arrival grids rendered from the catalogue. */
const HERO_ROOM_PRODUCT_IDS = ["lampadaire-fjord", "coussin-hygge", "plaid-lofoten"];
const heroProductListElement = document.querySelector("[data-hero-products]");
const collectionGridElement = document.querySelector("[data-collections]");
const bestsellerGridElement = document.querySelector("[data-bestsellers]");
const newArrivalGridElement = document.querySelector("[data-new-arrivals]");

function renderHeroRoomProducts() {
  heroProductListElement.innerHTML = HERO_ROOM_PRODUCT_IDS.map(NordikCatalog.getProductById).filter(Boolean).map((product) => `
    <li class="hero-shop__item">
      <a class="hero-shop__link" href="produit.html?id=${encodeURIComponent(product.id)}">
        <img decoding="async" src="${escapeHtml(product.thumbnail)}" alt="" width="480" height="600" loading="lazy">
        <span><span class="hero-shop__name">${escapeHtml(product.name)}</span>${renderPriceMarkup(product)}</span>
      </a>
      <button type="button" class="product-card__add hero-shop__add" data-quick-add="${escapeHtml(product.id)}" aria-label="Ajouter ${escapeHtml(product.name)} au panier">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
    </li>`).join("");
}

function renderCollectionTiles() {
  collectionGridElement.innerHTML = NordikCatalog.categories.map((category, categoryIndex) => {
    const productCount = NordikCatalog.products.filter((product) => product.category === category.id).length;
    return `
      <a class="collection-tile reveal${categoryIndex === 0 ? " collection-tile--large" : ""}" href="catalogue.html?cat=${encodeURIComponent(category.id)}" style="--reveal-delay:${categoryIndex * 80}ms">
        <img decoding="async" src="${escapeHtml(NordikCatalog.buildImageUrl(category.photoId, { width: 900, height: 1100 }))}" alt="" loading="lazy" width="900" height="1100">
        <span class="collection-tile__text">
          <span class="collection-tile__count">${productCount} pièce${productCount > 1 ? "s" : ""}</span>
          <span class="collection-tile__name">${escapeHtml(category.name)}</span>
          <span class="collection-tile__tagline">${escapeHtml(category.tagline)}</span>
        </span>
      </a>`;
  }).join("");
}

function renderBestsellerGrid() {
  const bestsellerProducts = NordikCatalog.products.filter((product) => product.bestseller).sort((firstProduct, secondProduct) => secondProduct.reviewCount - firstProduct.reviewCount).slice(0, 8);
  bestsellerGridElement.innerHTML = bestsellerProducts.map((product) => renderProductCard(product)).join("");
}

function renderNewArrivalGrid() {
  const newArrivalProducts = NordikCatalog.products.filter((product) => product.isNew).sort((firstProduct, secondProduct) => secondProduct.rating - firstProduct.rating).slice(0, 4);
  newArrivalGridElement.innerHTML = newArrivalProducts.map((product) => renderProductCard(product)).join("");
}

renderHeroRoomProducts();
renderCollectionTiles();
renderBestsellerGrid();
renderNewArrivalGrid();
