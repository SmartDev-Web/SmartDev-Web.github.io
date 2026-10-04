/* ==========================================================================
   Azur Hôtel & Spa — home page: quick availability bar that pre-fills the
   booking page with valid arrival and departure dates.
   ========================================================================== */

/* Formats a Date as the yyyy-mm-dd value expected by date inputs */
function formatQuickBookingDate(dateValue) {
  const monthPart = String(dateValue.getMonth() + 1).padStart(2, '0');
  const dayPart = String(dateValue.getDate()).padStart(2, '0');
  return `${dateValue.getFullYear()}-${monthPart}-${dayPart}`;
}

/* Returns a copy of a date shifted by a number of days */
function addDaysToDate(baseDate, numberOfDays) {
  const shiftedDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  shiftedDate.setDate(shiftedDate.getDate() + numberOfDays);
  return shiftedDate;
}

/* Keeps departure strictly after arrival and sets sensible defaults */
function initializeQuickBookingBar() {
  const quickBookingFormElement = document.querySelector('[data-quick-booking]');
  if (!quickBookingFormElement) return;
  const arrivalInputElement = quickBookingFormElement.querySelector('#quick-arrival');
  const departureInputElement = quickBookingFormElement.querySelector('#quick-departure');
  const todayDate = new Date();
  arrivalInputElement.min = formatQuickBookingDate(todayDate);
  arrivalInputElement.value = formatQuickBookingDate(addDaysToDate(todayDate, 7));
  departureInputElement.min = formatQuickBookingDate(addDaysToDate(todayDate, 1));
  departureInputElement.value = formatQuickBookingDate(addDaysToDate(todayDate, 10));
  arrivalInputElement.addEventListener('change', () => {
    if (!arrivalInputElement.value) return;
    const [yearPart, monthPart, dayPart] = arrivalInputElement.value.split('-').map(Number);
    const minimumDepartureValue = formatQuickBookingDate(addDaysToDate(new Date(yearPart, monthPart - 1, dayPart), 1));
    departureInputElement.min = minimumDepartureValue;
    if (!departureInputElement.value || departureInputElement.value < minimumDepartureValue) departureInputElement.value = minimumDepartureValue;
  });
}

initializeQuickBookingBar();
