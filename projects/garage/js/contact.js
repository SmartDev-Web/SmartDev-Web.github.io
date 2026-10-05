/* ==========================================================================
   Atelier Méca Rivière — contact form
   Live character counter, field validation and success state
   ========================================================================== */

const CONTACT_PHONE_PATTERN = /^(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/;
const CONTACT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Returns [field, error message] pairs for the whole form */
function collectContactFieldErrors(contactFormElement) {
  const formFields = contactFormElement.elements;
  return [
    [formFields.contactName, formFields.contactName.value.trim().length >= 2 ? "" : "Indiquez votre nom."],
    [formFields.contactPhone, CONTACT_PHONE_PATTERN.test(formFields.contactPhone.value.trim()) ? "" : "Numéro de téléphone français invalide."],
    [formFields.contactEmail, CONTACT_EMAIL_PATTERN.test(formFields.contactEmail.value.trim()) ? "" : "Adresse e-mail invalide."],
    [formFields.contactSubject, formFields.contactSubject.value ? "" : "Choisissez un sujet."],
    [formFields.contactMessage, formFields.contactMessage.value.trim().length >= 15 ? "" : "Votre message doit contenir au moins 15 caractères."],
    [formFields.contactConsent, formFields.contactConsent.checked ? "" : "Votre accord est nécessaire."]
  ];
}

function initializeContactForm() {
  const contactFormElement = document.querySelector("[data-contact-form]");
  const contactSuccessElement = document.querySelector("[data-contact-success]");
  const characterCounterElement = document.querySelector("[data-character-counter]");
  const messageFieldElement = contactFormElement.elements.contactMessage;
  messageFieldElement.addEventListener("input", () => {
    characterCounterElement.textContent = `${messageFieldElement.value.length} / ${messageFieldElement.maxLength} caractères`;
  });
  contactFormElement.addEventListener("change", (changeEvent) => {
    const matchingCheck = collectContactFieldErrors(contactFormElement).find(([fieldElement]) => fieldElement === changeEvent.target);
    if (matchingCheck) setFieldErrorState(matchingCheck[0], matchingCheck[1]);
  });
  contactFormElement.addEventListener("submit", (submitEvent) => {
    submitEvent.preventDefault();
    const fieldErrorChecks = collectContactFieldErrors(contactFormElement);
    fieldErrorChecks.forEach(([fieldElement, errorMessage]) => setFieldErrorState(fieldElement, errorMessage));
    const firstInvalidCheck = fieldErrorChecks.find(([, errorMessage]) => errorMessage);
    if (firstInvalidCheck) {
      firstInvalidCheck[0].focus();
      return;
    }
    const formFields = contactFormElement.elements;
    contactSuccessElement.querySelector("[data-contact-summary]").textContent = `Merci ${formFields.contactName.value.trim()}, votre message «\u00a0${formFields.contactSubject.value}\u00a0» a bien été transmis à l'atelier. Nous vous répondons à ${formFields.contactEmail.value.trim()} sous 4 heures ouvrées.`;
    contactFormElement.hidden = true;
    contactSuccessElement.hidden = false;
    contactSuccessElement.focus();
  });
}

document.addEventListener("DOMContentLoaded", initializeContactForm);
