/* ==========================================================================
   IronPulse — free trial form
   Field validation, date constraints and success state
   ========================================================================== */

const FRENCH_PHONE_PATTERN = /^(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/;
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAXIMUM_TRIAL_DAYS_AHEAD = 30;

function formatDateForInput(dateValue) {
  return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}-${String(dateValue.getDate()).padStart(2, "0")}`;
}

/* Restricts the date picker to the bookable trial window */
function configureTrialDateLimits(trialDateInputElement) {
  const todayDate = new Date();
  const latestTrialDate = new Date();
  latestTrialDate.setDate(todayDate.getDate() + MAXIMUM_TRIAL_DAYS_AHEAD);
  trialDateInputElement.min = formatDateForInput(todayDate);
  trialDateInputElement.max = formatDateForInput(latestTrialDate);
}

/* Returns an error message for a given field, or an empty string when valid */
function getTrialFieldError(trialFormElement, fieldName) {
  const formFields = trialFormElement.elements;
  const trimmedValue = (fieldValue) => String(fieldValue || "").trim();
  switch (fieldName) {
    case "firstName":
      return trimmedValue(formFields.firstName.value).length < 2 ? "Indiquez votre prénom." : "";
    case "lastName":
      return trimmedValue(formFields.lastName.value).length < 2 ? "Indiquez votre nom." : "";
    case "emailAddress":
      return EMAIL_ADDRESS_PATTERN.test(trimmedValue(formFields.emailAddress.value)) ? "" : "Adresse e-mail invalide.";
    case "phoneNumber":
      return FRENCH_PHONE_PATTERN.test(trimmedValue(formFields.phoneNumber.value)) ? "" : "Numéro français attendu, ex. 06 12 34 56 78.";
    case "trialDate": {
      const selectedDateValue = formFields.trialDate.value;
      if (!selectedDateValue) return "Choisissez une date.";
      return selectedDateValue < formFields.trialDate.min || selectedDateValue > formFields.trialDate.max ? `Date entre aujourd'hui et J+${MAXIMUM_TRIAL_DAYS_AHEAD}.` : "";
    }
    case "trialSlot":
      return formFields.trialSlot.value ? "" : "Choisissez un créneau.";
    case "mainGoal":
      return formFields.mainGoal.value ? "" : "Sélectionnez un objectif.";
    case "privacyConsent":
      return formFields.privacyConsent.checked ? "" : "Votre accord est nécessaire.";
    default:
      return "";
  }
}

/* Validates one field and reflects the result in the interface */
function validateTrialField(trialFormElement, fieldName) {
  const fieldErrorMessage = getTrialFieldError(trialFormElement, fieldName);
  const fieldElement = trialFormElement.elements[fieldName];
  const referenceInputElement = fieldElement instanceof RadioNodeList ? fieldElement[0] : fieldElement;
  setFieldErrorState(referenceInputElement, fieldErrorMessage);
  return !fieldErrorMessage;
}

function initializeTrialForm() {
  const trialFormElement = document.querySelector("[data-trial-form]");
  const trialSuccessElement = document.querySelector("[data-trial-success]");
  const validatedFieldNames = ["firstName", "lastName", "emailAddress", "phoneNumber", "trialDate", "trialSlot", "mainGoal", "privacyConsent"];
  configureTrialDateLimits(trialFormElement.elements.trialDate);
  trialFormElement.addEventListener("change", (changeEvent) => {
    if (validatedFieldNames.includes(changeEvent.target.name)) validateTrialField(trialFormElement, changeEvent.target.name);
  });
  trialFormElement.addEventListener("focusout", (focusEvent) => {
    const fieldName = focusEvent.target.name;
    if (fieldName && focusEvent.target.type !== "radio" && focusEvent.target.value && validatedFieldNames.includes(fieldName)) validateTrialField(trialFormElement, fieldName);
  });
  trialFormElement.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    const fieldValidationResults = validatedFieldNames.map((fieldName) => validateTrialField(trialFormElement, fieldName));
    if (fieldValidationResults.includes(false)) {
      const firstInvalidElement = trialFormElement.querySelector("[aria-invalid='true']");
      if (firstInvalidElement) firstInvalidElement.focus();
      return;
    }
    const formFields = trialFormElement.elements;
    const formattedTrialDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${formFields.trialDate.value}T12:00:00`));
    trialSuccessElement.querySelector("[data-trial-summary]").textContent = `Merci ${formFields.firstName.value.trim()} ! Votre séance d'essai est pré-réservée le ${formattedTrialDate}, créneau ${formFields.trialSlot.value.toLowerCase()}. Objectif : ${formFields.mainGoal.value.toLowerCase()}. Un coach vous confirme le rendez-vous par SMS au ${formFields.phoneNumber.value.trim()}.`;
    trialFormElement.hidden = true;
    trialSuccessElement.hidden = false;
    trialSuccessElement.focus();
  });
  trialSuccessElement.querySelector("[data-trial-reset]").addEventListener("click", () => {
    trialFormElement.reset();
    trialSuccessElement.hidden = true;
    trialFormElement.hidden = false;
    trialFormElement.elements.firstName.focus();
  });
}

document.addEventListener("DOMContentLoaded", initializeTrialForm);
