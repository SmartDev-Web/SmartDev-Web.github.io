/* ==========================================================================
   HighlightForge — login / sign-up tabs and front-end form validation
   ========================================================================== */

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const strengthLevels = [
  { label: "Très faible", color: "#ff4d6d" },
  { label: "Faible", color: "#ff8a4d" },
  { label: "Correct", color: "#ffb547" },
  { label: "Solide", color: "#b6ff3b" },
  { label: "Excellent", color: "#00f0ff" }
];

/* Shows the requested auth form and updates the tab state. */
function showAuthTab(tabName) {
  const tabListElement = document.querySelector("[data-auth-tabs]");
  tabListElement.dataset.activeTab = tabName;
  document.querySelectorAll("[data-auth-tab]").forEach((tabButtonElement) => {
    const isSelected = tabButtonElement.dataset.authTab === tabName;
    tabButtonElement.setAttribute("aria-selected", String(isSelected));
    tabButtonElement.tabIndex = isSelected ? 0 : -1;
  });
  document.querySelectorAll("[data-auth-form]").forEach((formElement) => {
    formElement.hidden = formElement.dataset.authForm !== tabName;
  });
  document.querySelector("[data-auth-success]").hidden = true;
}

/* Scores a password from 0 to 4 based on length and character variety. */
function getPasswordStrengthScore(passwordValue) {
  let strengthScore = 0;
  if (passwordValue.length >= 8) strengthScore += 1;
  if (/[A-Z]/.test(passwordValue) && /[a-z]/.test(passwordValue)) strengthScore += 1;
  if (/\d/.test(passwordValue)) strengthScore += 1;
  if (/[^A-Za-z0-9]/.test(passwordValue) || passwordValue.length >= 14) strengthScore += 1;
  return passwordValue ? strengthScore : 0;
}

/* Updates the strength meter below the sign-up password field. */
function renderPasswordStrength(passwordValue) {
  const strengthMeterElement = document.querySelector("[data-strength-meter]");
  const strengthTextElement = document.querySelector("[data-strength-text]");
  const strengthScore = getPasswordStrengthScore(passwordValue);
  const strengthLevel = strengthLevels[strengthScore];
  strengthMeterElement.querySelectorAll("span").forEach((segmentElement, segmentIndex) => {
    segmentElement.style.background = passwordValue && segmentIndex < Math.max(strengthScore, 1) ? strengthLevel.color : "";
  });
  strengthTextElement.textContent = passwordValue ? "Robustesse : " + strengthLevel.label : "8 caractères minimum, avec une majuscule et un chiffre.";
  strengthTextElement.style.color = passwordValue ? strengthLevel.color : "";
}

/* Returns the validation error message for a field, or an empty string. */
function getFieldErrorMessage(fieldElement) {
  const fieldValue = fieldElement.type === "checkbox" ? fieldElement.checked : fieldElement.value.trim();
  const validationRule = fieldElement.dataset.validate;
  if (validationRule === "checkbox") return fieldValue ? "" : "Vous devez accepter les conditions pour continuer.";
  if (!fieldValue) return "Ce champ est obligatoire.";
  if (validationRule === "email" && !emailPattern.test(fieldValue)) return "Saisissez une adresse e-mail valide.";
  if (validationRule === "pseudo" && !/^[A-Za-z0-9_À-ÿ-]{3,24}$/.test(fieldValue)) return "3 à 24 caractères : lettres, chiffres, tiret ou underscore.";
  if (validationRule === "password" && (fieldValue.length < 8 || !/[A-Z]/.test(fieldValue) || !/\d/.test(fieldValue))) return "8 caractères minimum, dont une majuscule et un chiffre.";
  if (validationRule === "confirm" && fieldValue !== document.getElementById("signup-password").value.trim()) return "Les deux mots de passe ne correspondent pas.";
  return "";
}

/* Validates one field and displays its error message. */
function validateField(fieldElement) {
  const formFieldElement = fieldElement.closest(".form-field");
  const errorElement = formFieldElement.querySelector(".field-error");
  const errorMessage = getFieldErrorMessage(fieldElement);
  formFieldElement.classList.toggle("has-error", Boolean(errorMessage));
  fieldElement.setAttribute("aria-invalid", String(Boolean(errorMessage)));
  errorElement.textContent = errorMessage;
  return !errorMessage;
}

/* Displays the success panel after a valid submission. */
function showAuthSuccess(formElement) {
  const successElement = document.querySelector("[data-auth-success]");
  const isSignup = formElement.dataset.authForm === "signup";
  const pseudoValue = isSignup ? formElement.querySelector("#signup-name").value.trim() : "";
  successElement.querySelector("[data-success-title]").textContent = isSignup ? `Bienvenue, ${pseudoValue} !` : "Connexion réussie";
  successElement.querySelector("[data-success-message]").textContent = isSignup
    ? "Votre compte est créé et l'offre Pro est activée pour 14 jours. Un e-mail de confirmation vient de partir."
    : "Ravi de vous revoir. Vos VOD et votre file d'export sont prêtes dans le studio.";
  formElement.hidden = true;
  formElement.reset();
  renderPasswordStrength("");
  successElement.hidden = false;
  successElement.querySelector("a").focus();
}

/* Wires validation, password helpers and submission on both forms. */
function initializeAuthForms() {
  document.querySelectorAll("[data-auth-form]").forEach((formElement) => {
    const validatedFields = formElement.querySelectorAll("[data-validate]");
    validatedFields.forEach((fieldElement) => {
      fieldElement.addEventListener("blur", () => validateField(fieldElement));
      fieldElement.addEventListener("input", () => {
        if (fieldElement.closest(".form-field").classList.contains("has-error")) validateField(fieldElement);
      });
    });
    formElement.addEventListener("submit", (submitEvent) => {
      submitEvent.preventDefault();
      const validationResults = Array.from(validatedFields).map(validateField);
      if (validationResults.every(Boolean)) {
        showAuthSuccess(formElement);
        return;
      }
      formElement.querySelector("[aria-invalid='true']").focus();
    });
  });
  document.querySelectorAll("[data-password-toggle]").forEach((toggleButtonElement) => {
    toggleButtonElement.addEventListener("click", () => {
      const passwordInputElement = toggleButtonElement.parentElement.querySelector("input");
      const isHidden = passwordInputElement.type === "password";
      passwordInputElement.type = isHidden ? "text" : "password";
      toggleButtonElement.setAttribute("aria-label", isHidden ? "Masquer le mot de passe" : "Afficher le mot de passe");
    });
  });
  const strengthSourceElement = document.querySelector("[data-strength-source]");
  strengthSourceElement.addEventListener("input", () => renderPasswordStrength(strengthSourceElement.value));
  document.querySelectorAll("[data-social-login]").forEach((socialButtonElement) => {
    socialButtonElement.addEventListener("click", () => {
      showToastMessage(`Connexion via ${socialButtonElement.dataset.socialLogin} indisponible dans cette démonstration.`);
    });
  });
}

/* Wires the tab buttons and opens the sign-up tab from the URL hash. */
function initializeAuthTabs() {
  const tabButtonElements = Array.from(document.querySelectorAll("[data-auth-tab]"));
  tabButtonElements.forEach((tabButtonElement) => {
    tabButtonElement.addEventListener("click", () => showAuthTab(tabButtonElement.dataset.authTab));
    tabButtonElement.addEventListener("keydown", (keyboardEvent) => {
      if (keyboardEvent.key !== "ArrowRight" && keyboardEvent.key !== "ArrowLeft") return;
      const otherTabElement = tabButtonElements.find((candidateElement) => candidateElement !== tabButtonElement);
      showAuthTab(otherTabElement.dataset.authTab);
      otherTabElement.focus();
    });
  });
  const applyHashTab = () => showAuthTab(window.location.hash === "#inscription" ? "signup" : "login");
  applyHashTab();
  window.addEventListener("hashchange", applyHashTab);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector("[data-auth-tabs]")) return;
  initializeAuthTabs();
  initializeAuthForms();
});
