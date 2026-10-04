/* ==========================================================================
   Atelier Méca Rivière — services page
   Opens the accordion item targeted by the URL hash or the summary links
   and highlights the summary entry of the section being read
   ========================================================================== */

/* Opens the accordion item matching a hash such as "#freinage" */
function openAccordionItemFromHash(hashValue) {
  if (!hashValue || hashValue.length < 2) return;
  const targetItemElement = document.getElementById(decodeURIComponent(hashValue.slice(1)));
  if (targetItemElement && targetItemElement.classList.contains("accordion__item")) setAccordionItemState(targetItemElement, true);
}

/* Marks the summary link of the accordion item closest to the top of the viewport */
function initializeServicesIndexHighlight() {
  const indexLinkElements = [...document.querySelectorAll("[data-services-index] a")];
  const sectionObserver = new IntersectionObserver((observedEntries) => {
    observedEntries.forEach((observedEntry) => {
      if (!observedEntry.isIntersecting) return;
      indexLinkElements.forEach((indexLinkElement) => {
        indexLinkElement.classList.toggle("is-active", indexLinkElement.getAttribute("href") === `#${observedEntry.target.id}`);
      });
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  document.querySelectorAll(".accordion__item").forEach((accordionItemElement) => sectionObserver.observe(accordionItemElement));
}

function initializeServicesPage() {
  openAccordionItemFromHash(window.location.hash);
  window.addEventListener("hashchange", () => openAccordionItemFromHash(window.location.hash));
  document.querySelector("[data-services-index]").addEventListener("click", (clickEvent) => {
    const indexLinkElement = clickEvent.target.closest("a");
    if (indexLinkElement) openAccordionItemFromHash(indexLinkElement.getAttribute("href"));
  });
  initializeServicesIndexHighlight();
}

document.addEventListener("DOMContentLoaded", initializeServicesPage);
