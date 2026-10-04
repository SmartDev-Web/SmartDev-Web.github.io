/* ==========================================================================
   HighlightForge — monthly / yearly billing switch with animated prices
   ========================================================================== */

/* Applies a billing period to every plan card and animates the price change. */
function applyBillingPeriod(billingPeriod) {
  document.querySelectorAll("[data-plan]").forEach((planElement) => {
    const amountElement = planElement.querySelector("[data-plan-amount]");
    const noteElement = planElement.querySelector("[data-plan-note]");
    const currentAmount = parseFloat(amountElement.textContent) || 0;
    const targetAmount = parseFloat(planElement.dataset[billingPeriod + "Price"]);
    animateNumericValue(currentAmount, targetAmount, 600, (animatedAmount) => {
      amountElement.textContent = String(Math.round(animatedAmount));
    });
    noteElement.textContent = noteElement.dataset[billingPeriod + "Note"];
  });
  document.querySelectorAll("[data-billing-label]").forEach((labelElement) => {
    labelElement.classList.toggle("is-active", labelElement.dataset.billingLabel === billingPeriod);
  });
}

/* Wires the billing switch and its clickable labels. */
function initializeBillingSwitch() {
  const billingSwitchElement = document.querySelector("[data-billing-switch]");
  if (!billingSwitchElement) return;
  const setYearlyBilling = (isYearly) => {
    billingSwitchElement.setAttribute("aria-checked", String(isYearly));
    applyBillingPeriod(isYearly ? "yearly" : "monthly");
  };
  billingSwitchElement.addEventListener("click", () => {
    setYearlyBilling(billingSwitchElement.getAttribute("aria-checked") !== "true");
  });
  document.querySelectorAll("[data-billing-label]").forEach((labelElement) => {
    labelElement.addEventListener("click", () => setYearlyBilling(labelElement.dataset.billingLabel === "yearly"));
  });
}

document.addEventListener("DOMContentLoaded", initializeBillingSwitch);
