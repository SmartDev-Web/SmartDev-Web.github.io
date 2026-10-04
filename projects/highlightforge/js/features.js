/* ==========================================================================
   HighlightForge — audience tabs on the features page
   ========================================================================== */

/* Activates one audience tab and shows its matching panel. */
function selectAudienceTab(tabButtonElements, selectedTabElement) {
  tabButtonElements.forEach((tabButtonElement) => {
    const isSelected = tabButtonElement === selectedTabElement;
    tabButtonElement.setAttribute("aria-selected", String(isSelected));
    tabButtonElement.tabIndex = isSelected ? 0 : -1;
    document.getElementById(tabButtonElement.getAttribute("aria-controls")).hidden = !isSelected;
  });
}

/* Wires click and arrow-key navigation on the audience tab list. */
function initializeAudienceTabs() {
  const tabListElement = document.querySelector("[data-audience-tabs]");
  if (!tabListElement) return;
  const tabButtonElements = Array.from(tabListElement.querySelectorAll("[role='tab']"));
  tabButtonElements.forEach((tabButtonElement, tabIndex) => {
    tabButtonElement.addEventListener("click", () => selectAudienceTab(tabButtonElements, tabButtonElement));
    tabButtonElement.addEventListener("keydown", (keyboardEvent) => {
      if (keyboardEvent.key !== "ArrowRight" && keyboardEvent.key !== "ArrowLeft") return;
      const directionOffset = keyboardEvent.key === "ArrowRight" ? 1 : -1;
      const nextTabElement = tabButtonElements[(tabIndex + directionOffset + tabButtonElements.length) % tabButtonElements.length];
      selectAudienceTab(tabButtonElements, nextTabElement);
      nextTabElement.focus();
    });
  });
}

document.addEventListener("DOMContentLoaded", initializeAudienceTabs);
