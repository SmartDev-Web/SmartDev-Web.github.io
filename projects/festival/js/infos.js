/* ==========================================================================
   Echoes Festival — FAQ category filter
   ========================================================================== */

/* Shows only the FAQ items of the selected category. */
function applyFaqFilter(selectedCategory) {
  document.querySelectorAll("[data-faq-category]").forEach((faqItemElement) => {
    faqItemElement.hidden = selectedCategory !== "all" && faqItemElement.dataset.faqCategory !== selectedCategory;
  });
  document.querySelectorAll("[data-faq-filter]").forEach((filterButtonElement) => {
    filterButtonElement.setAttribute("aria-pressed", String(filterButtonElement.dataset.faqFilter === selectedCategory));
  });
}

/* Wires the FAQ category buttons. */
function initializeFaqFilters() {
  const faqFiltersElement = document.querySelector("[data-faq-filters]");
  if (!faqFiltersElement) return;
  faqFiltersElement.addEventListener("click", (clickEvent) => {
    const filterButtonElement = clickEvent.target.closest("[data-faq-filter]");
    if (filterButtonElement) applyFaqFilter(filterButtonElement.dataset.faqFilter);
  });
}

document.addEventListener("DOMContentLoaded", initializeFaqFilters);
