/* ==========================================================================
   IronPulse — coaches page
   Specialty filtering and accessible 3D flip cards
   ========================================================================== */

/* Flips a coach card and moves keyboard focus to the visible face */
function setCoachCardFlipState(coachCardElement, shouldFlip) {
  const frontFaceElement = coachCardElement.querySelector(".coach-card__face--front");
  const backFaceElement = coachCardElement.querySelector(".coach-card__face--back");
  coachCardElement.classList.toggle("is-flipped", shouldFlip);
  frontFaceElement.setAttribute("aria-hidden", String(shouldFlip));
  backFaceElement.setAttribute("aria-hidden", String(!shouldFlip));
  frontFaceElement.querySelectorAll("a, button").forEach((focusableElement) => focusableElement.setAttribute("tabindex", shouldFlip ? "-1" : "0"));
  backFaceElement.querySelectorAll("a, button").forEach((focusableElement) => focusableElement.setAttribute("tabindex", shouldFlip ? "0" : "-1"));
  frontFaceElement.querySelector("[data-flip-coach]").setAttribute("aria-expanded", String(shouldFlip));
  const faceToFocusElement = shouldFlip ? backFaceElement : frontFaceElement;
  faceToFocusElement.querySelector("[data-flip-coach]").focus({ preventScroll: true });
}

/* Shows only the coaches matching the selected specialty */
function applySpecialtyFilter(selectedSpecialty) {
  let visibleCoachCount = 0;
  document.querySelectorAll("[data-specialty-filter]").forEach((filterButtonElement) => {
    filterButtonElement.setAttribute("aria-pressed", String(filterButtonElement.dataset.specialtyFilter === selectedSpecialty));
  });
  document.querySelectorAll("[data-coach-specialties]").forEach((coachCardElement) => {
    const coachSpecialties = coachCardElement.dataset.coachSpecialties.split(" ");
    const isCoachVisible = selectedSpecialty === "all" || coachSpecialties.includes(selectedSpecialty);
    coachCardElement.hidden = !isCoachVisible;
    if (isCoachVisible) {
      visibleCoachCount += 1;
      coachCardElement.classList.add("is-visible");
    }
  });
  document.querySelector("[data-coach-count]").textContent = `${visibleCoachCount} coach${visibleCoachCount > 1 ? "s" : ""}`;
}

function initializeCoachesPage() {
  document.querySelector("[data-coach-grid]").addEventListener("click", (clickEvent) => {
    const flipButtonElement = clickEvent.target.closest("[data-flip-coach]");
    if (!flipButtonElement) return;
    const coachCardElement = flipButtonElement.closest(".coach-card");
    setCoachCardFlipState(coachCardElement, !coachCardElement.classList.contains("is-flipped"));
  });
  document.querySelector("[data-specialty-filter-group]").addEventListener("click", (clickEvent) => {
    const filterButtonElement = clickEvent.target.closest("[data-specialty-filter]");
    if (filterButtonElement) applySpecialtyFilter(filterButtonElement.dataset.specialtyFilter);
  });
}

document.addEventListener("DOMContentLoaded", initializeCoachesPage);
