/* Horizon Immobilier - property detail page: content, gallery lightbox, energy labels */

const ENERGY_CLASS_SCALE = [
  { letter: "A", range: "≤ 70", color: "#009c6d", textColor: "#ffffff" },
  { letter: "B", range: "71 à 110", color: "#52b153", textColor: "#ffffff" },
  { letter: "C", range: "111 à 180", color: "#78bd76", textColor: "#ffffff" },
  { letter: "D", range: "181 à 250", color: "#f4e70f", textColor: "#1b2622" },
  { letter: "E", range: "251 à 330", color: "#f0b50f", textColor: "#1b2622" },
  { letter: "F", range: "331 à 420", color: "#eb8235", textColor: "#ffffff" },
  { letter: "G", range: "> 420", color: "#d7221f", textColor: "#ffffff" }
];

const CLIMATE_CLASS_SCALE = [
  { letter: "A", range: "≤ 6", color: "#f6edfd", textColor: "#3c1a5b" },
  { letter: "B", range: "7 à 11", color: "#e4c7fb", textColor: "#3c1a5b" },
  { letter: "C", range: "12 à 30", color: "#d5aaf6", textColor: "#3c1a5b" },
  { letter: "D", range: "31 à 50", color: "#cb95f3", textColor: "#3c1a5b" },
  { letter: "E", range: "51 à 70", color: "#ba72ef", textColor: "#ffffff" },
  { letter: "F", range: "71 à 100", color: "#a74deb", textColor: "#ffffff" },
  { letter: "G", range: "> 100", color: "#8a19df", textColor: "#ffffff" }
];

const lightboxState = { images: [], currentIndex: 0, returnFocusElement: null, touchStartX: 0 };

/* Renders an energy or climate scale with the active class highlighted */
function renderEnergyScale(scaleListElement, classScale, activeLetter, unitLabel) {
  scaleListElement.innerHTML = classScale.map(function (energyClass, classIndex) {
    const isActive = energyClass.letter === activeLetter;
    return '<li class="energy-scale__bar' + (isActive ? " is-active" : "") + '" style="width:' + (34 + classIndex * 11) + "%;background:" + energyClass.color + ";color:" + energyClass.textColor + '" data-label="' + energyClass.range + " " + unitLabel + '"' + (isActive ? ' aria-current="true"' : "") + ">" + energyClass.letter + "</li>";
  }).join("");
  scaleListElement.setAttribute("aria-label", scaleListElement.getAttribute("aria-label") + " : " + activeLetter);
}

/* Renders the photo grid of the property */
function renderPropertyGallery(propertyListing) {
  const galleryElement = document.getElementById("property-gallery");
  const visibleImages = propertyListing.images.slice(0, 3);
  const hiddenImageCount = propertyListing.images.length - visibleImages.length;
  galleryElement.innerHTML = visibleImages.map(function (photoIdentifier, imageIndex) {
    const moreOverlay = imageIndex === visibleImages.length - 1 && hiddenImageCount > 0 ? '<span class="gallery__more">+ ' + hiddenImageCount + " photos</span>" : "";
    return '<button class="gallery__item" type="button" data-gallery-index="' + imageIndex + '" aria-label="Agrandir la photo ' + (imageIndex + 1) + " sur " + propertyListing.images.length + '">' +
      '<img src="' + buildPropertyImageUrl(photoIdentifier, imageIndex === 0 ? 1400 : 800) + '" alt="' + propertyListing.title + ", photo " + (imageIndex + 1) + '">' + moreOverlay + "</button>";
  }).join("");
  galleryElement.addEventListener("click", function (clickEvent) {
    const galleryItemElement = clickEvent.target.closest("[data-gallery-index]");
    if (galleryItemElement) {
      openPropertyLightbox(Number(galleryItemElement.dataset.galleryIndex), galleryItemElement);
    }
  });
}

/* Displays the lightbox image at the current index */
function showLightboxImage() {
  const lightboxImageElement = document.getElementById("lightbox-image");
  const currentImage = lightboxState.images[lightboxState.currentIndex];
  lightboxImageElement.classList.add("is-loading");
  lightboxImageElement.src = buildPropertyImageUrl(currentImage.photoIdentifier, 1600);
  lightboxImageElement.alt = currentImage.altText;
  document.getElementById("lightbox-caption").textContent = currentImage.altText + " — " + (lightboxState.currentIndex + 1) + " / " + lightboxState.images.length;
}

/* Opens the lightbox on a given photo */
function openPropertyLightbox(imageIndex, triggerElement) {
  const lightboxElement = document.getElementById("property-lightbox");
  lightboxState.currentIndex = imageIndex;
  lightboxState.returnFocusElement = triggerElement;
  showLightboxImage();
  lightboxElement.classList.add("is-open");
  lightboxElement.setAttribute("aria-hidden", "false");
  document.body.classList.add("scroll-is-locked");
  lightboxElement.querySelector("[data-lightbox-close]").focus();
}

/* Closes the lightbox and restores focus */
function closePropertyLightbox() {
  const lightboxElement = document.getElementById("property-lightbox");
  lightboxElement.classList.remove("is-open");
  lightboxElement.setAttribute("aria-hidden", "true");
  document.body.classList.remove("scroll-is-locked");
  if (lightboxState.returnFocusElement) {
    lightboxState.returnFocusElement.focus();
  }
}

/* Moves the lightbox forward or backward with wrap-around */
function stepPropertyLightbox(stepDirection) {
  const imageCount = lightboxState.images.length;
  lightboxState.currentIndex = (lightboxState.currentIndex + stepDirection + imageCount) % imageCount;
  showLightboxImage();
}

/* Wires buttons, keyboard and swipe gestures of the lightbox */
function initializePropertyLightbox(propertyListing) {
  const lightboxElement = document.getElementById("property-lightbox");
  const lightboxImageElement = document.getElementById("lightbox-image");
  lightboxState.images = propertyListing.images.map(function (photoIdentifier, imageIndex) {
    return { photoIdentifier: photoIdentifier, altText: propertyListing.title + ", photo " + (imageIndex + 1) };
  });
  lightboxImageElement.addEventListener("load", function () { lightboxImageElement.classList.remove("is-loading"); });
  lightboxElement.addEventListener("click", function (clickEvent) {
    const stepButtonElement = clickEvent.target.closest("[data-lightbox-step]");
    if (stepButtonElement) {
      stepPropertyLightbox(Number(stepButtonElement.dataset.lightboxStep));
    } else if (clickEvent.target.closest("[data-lightbox-close]") || clickEvent.target === lightboxElement) {
      closePropertyLightbox();
    }
  });
  document.addEventListener("keydown", function (keyboardEvent) {
    if (!lightboxElement.classList.contains("is-open")) {
      return;
    }
    if (keyboardEvent.key === "Escape") {
      closePropertyLightbox();
    } else if (keyboardEvent.key === "ArrowRight") {
      stepPropertyLightbox(1);
    } else if (keyboardEvent.key === "ArrowLeft") {
      stepPropertyLightbox(-1);
    } else if (keyboardEvent.key === "Tab") {
      const focusableElements = lightboxElement.querySelectorAll("button");
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      if (keyboardEvent.shiftKey && document.activeElement === firstFocusable) {
        keyboardEvent.preventDefault();
        lastFocusable.focus();
      } else if (!keyboardEvent.shiftKey && document.activeElement === lastFocusable) {
        keyboardEvent.preventDefault();
        firstFocusable.focus();
      }
    }
  });
  lightboxElement.addEventListener("touchstart", function (touchEvent) {
    lightboxState.touchStartX = touchEvent.changedTouches[0].clientX;
  }, { passive: true });
  lightboxElement.addEventListener("touchend", function (touchEvent) {
    const horizontalDistance = touchEvent.changedTouches[0].clientX - lightboxState.touchStartX;
    if (Math.abs(horizontalDistance) > 50) {
      stepPropertyLightbox(horizontalDistance < 0 ? 1 : -1);
    }
  });
}

/* Renders the characteristics tiles */
function renderPropertySpecs(propertyListing) {
  const specificationEntries = [
    ["Surface", propertyListing.surface + " m²"],
    ["Pièces", propertyListing.rooms],
    ["Chambres", propertyListing.bedrooms || "—"],
    ["Salles d'eau", propertyListing.bathrooms],
    ["Terrain", propertyListing.landSurface ? formatNumber(propertyListing.landSurface) + " m²" : "—"],
    ["Niveau", propertyListing.floorLabel],
    ["Construction", propertyListing.yearBuilt],
    ["Prix / m²", propertyListing.transaction === "vente" ? formatEuros(Math.round(propertyListing.price / propertyListing.surface)) : formatEuros(Math.round(propertyListing.price / propertyListing.surface * 10) / 10, 1)]
  ];
  document.getElementById("property-specs").innerHTML = specificationEntries.map(function (specificationEntry) {
    return '<div class="spec-tile"><dt>' + specificationEntry[0] + "</dt><dd>" + specificationEntry[1] + "</dd></div>";
  }).join("");
}

/* Renders the financing or rental hint in the sidebar */
function renderMonthlyHint(propertyListing) {
  const monthlyHintElement = document.getElementById("monthly-hint");
  if (propertyListing.transaction === "location") {
    monthlyHintElement.innerHTML = "Revenus conseillés : <strong>" + formatEuros(propertyListing.price * 3) + "</strong> nets / mois. Dossier locataire complet requis.";
    monthlyHintElement.href = "agence.html";
    return;
  }
  const defaultDeposit = Math.round(propertyListing.price * 0.1 / 5000) * 5000;
  const estimatedMonthlyPayment = computeMonthlyLoanPayment(propertyListing.price - defaultDeposit, 3.35, 20);
  monthlyHintElement.innerHTML = "À partir de <strong>" + formatEuros(Math.round(estimatedMonthlyPayment)) + " / mois</strong><br>sur 20 ans à 3,35 % avec 10 % d'apport. Ajuster la simulation →";
  monthlyHintElement.href = "simulateur.html?prix=" + propertyListing.price + "&apport=" + defaultDeposit;
}

/* Renders up to three comparable listings */
function renderSimilarListings(propertyListing) {
  const similarListings = PROPERTY_LISTINGS.filter(function (candidateListing) {
    return candidateListing.id !== propertyListing.id && candidateListing.transaction === propertyListing.transaction;
  }).sort(function (firstListing, secondListing) {
    return Math.abs(firstListing.price - propertyListing.price) - Math.abs(secondListing.price - propertyListing.price);
  }).slice(0, 3);
  document.getElementById("similar-listings").innerHTML = similarListings.map(createListingCardMarkup).join("");
}

/* Displays a not-found message when the identifier is unknown */
function renderMissingProperty() {
  document.getElementById("property-title").textContent = "Ce bien n'est plus disponible";
  document.getElementById("property-location").textContent = "Il a peut-être déjà trouvé preneur. Découvrez nos autres annonces.";
  document.getElementById("property-content").innerHTML = '<div class="container"><div class="empty-state"><h3>Annonce introuvable</h3><p>La référence demandée n\'existe pas ou a été retirée.</p><a class="button button--forest" href="annonces.html">Voir toutes les annonces</a></div></div>';
  document.getElementById("property-gallery").remove();
}

/* Fills the page with the listing referenced in the URL */
function initializePropertyPage() {
  const propertyListing = findListingById(new URLSearchParams(window.location.search).get("id"));
  if (!propertyListing) {
    renderMissingProperty();
    return;
  }
  const transactionLabel = propertyListing.transaction === "location" ? "À louer" : "À vendre";
  document.title = propertyListing.title + " — " + propertyListing.city + " | Horizon Immobilier";
  document.getElementById("property-banner-image").src = buildPropertyImageUrl(propertyListing.images[0], 1600);
  document.getElementById("property-breadcrumb").textContent = propertyListing.title;
  document.getElementById("property-eyebrow").textContent = transactionLabel + " · Réf. " + propertyListing.id;
  document.getElementById("property-title").textContent = propertyListing.title;
  document.getElementById("property-location").textContent = propertyListing.city + " — " + propertyListing.district + " · " + PROPERTY_TYPE_LABELS[propertyListing.type] + " de " + propertyListing.surface + " m²";
  document.getElementById("property-price").innerHTML = formatListingPrice(propertyListing) + (propertyListing.transaction === "vente" ? "<small>Honoraires à la charge du vendeur</small>" : "");
  document.getElementById("property-description").textContent = propertyListing.description;
  document.getElementById("property-features").innerHTML = propertyListing.features.map(function (featureLabel) { return "<li>" + featureLabel + "</li>"; }).join("");
  document.getElementById("property-favorite-button").dataset.favoriteId = propertyListing.id;
  document.getElementById("visit-message").value = "Bonjour, je souhaite visiter le bien réf. " + propertyListing.id + " (" + propertyListing.title + ").";
  renderPropertyGallery(propertyListing);
  renderPropertySpecs(propertyListing);
  renderEnergyScale(document.getElementById("energy-scale"), ENERGY_CLASS_SCALE, propertyListing.energyClass, "kWh");
  renderEnergyScale(document.getElementById("climate-scale"), CLIMATE_CLASS_SCALE, propertyListing.climateClass, "kg");
  renderMonthlyHint(propertyListing);
  renderSimilarListings(propertyListing);
  initializePropertyLightbox(propertyListing);
  refreshFavoriteIndicators();
}

document.addEventListener("DOMContentLoaded", initializePropertyPage);
