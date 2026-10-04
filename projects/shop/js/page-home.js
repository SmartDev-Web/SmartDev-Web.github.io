/* Home page: featured collections and bestseller grid rendered from the catalogue. */
const collectionGridElement = document.querySelector("[data-collections]");
const bestsellerGridElement = document.querySelector("[data-bestsellers]");

function renderCollectionTiles() {
  collectionGridElement.innerHTML = NordikCatalog.categories.map((category, categoryIndex) => {
    const productCount = NordikCatalog.products.filter((product) => product.category === category.id).length;
    return `
      <a class="collection-tile reveal${categoryIndex === 0 ? " collection-tile--large" : ""}" href="catalogue.html?cat=${encodeURIComponent(category.id)}" style="--reveal-delay:${categoryIndex * 80}ms">
        <img src="${NordikCatalog.buildImageUrl(category.photoId, { width: 900, height: 1100 })}" alt="" loading="lazy" width="900" height="1100">
        <span class="collection-tile__text">
          <span class="collection-tile__count">${productCount} pièces</span>
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

renderCollectionTiles();
renderBestsellerGrid();
