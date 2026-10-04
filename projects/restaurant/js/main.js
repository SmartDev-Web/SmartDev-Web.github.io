/* ==========================================================================
   Maison Ambre — shared behaviours used on every page
   Header state, mobile navigation, page transitions, scroll reveal,
   animated counters, parallax and form validation helpers.
   ========================================================================== */

const prefersReducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

let sharedRevealObserver = null;

/* Toggles the compact header style once the page is scrolled */
function initializeStickyHeader() {
  const siteHeaderElement = document.querySelector('.site-header');
  if (!siteHeaderElement) return;
  const updateHeaderScrolledState = () => siteHeaderElement.classList.toggle('is-scrolled', window.scrollY > 40);
  updateHeaderScrolledState();
  window.addEventListener('scroll', updateHeaderScrolledState, { passive: true });
}

/* Opens and closes the full-screen navigation on small screens */
function initializeMobileNavigation() {
  const navigationToggleButton = document.querySelector('.nav-toggle');
  const primaryNavigationElement = document.querySelector('.primary-nav');
  if (!navigationToggleButton || !primaryNavigationElement) return;
  const setNavigationOpenState = (isNavigationOpen) => {
    navigationToggleButton.setAttribute('aria-expanded', String(isNavigationOpen));
    navigationToggleButton.setAttribute('aria-label', isNavigationOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.classList.toggle('nav-is-open', isNavigationOpen);
  };
  navigationToggleButton.addEventListener('click', () => {
    setNavigationOpenState(navigationToggleButton.getAttribute('aria-expanded') !== 'true');
  });
  primaryNavigationElement.addEventListener('click', (clickEvent) => {
    if (clickEvent.target.closest('a')) setNavigationOpenState(false);
  });
  document.addEventListener('keydown', (keyboardEvent) => {
    if (keyboardEvent.key === 'Escape' && document.body.classList.contains('nav-is-open')) {
      setNavigationOpenState(false);
      navigationToggleButton.focus();
    }
  });
  window.matchMedia('(min-width: 960px)').addEventListener('change', () => setNavigationOpenState(false));
}

/* Fades the page out before following internal links, navigating once the fade has finished */
function initializePageTransitions() {
  document.addEventListener('click', (clickEvent) => {
    const clickedLinkElement = clickEvent.target.closest('a[href]');
    if (!clickedLinkElement || clickEvent.defaultPrevented || clickEvent.button !== 0) return;
    if (clickEvent.metaKey || clickEvent.ctrlKey || clickEvent.shiftKey || clickEvent.altKey) return;
    const destinationUrl = new URL(clickedLinkElement.href, window.location.href);
    const isInternalDestination = destinationUrl.origin === window.location.origin && clickedLinkElement.target !== '_blank';
    const isSamePageAnchor = destinationUrl.pathname === window.location.pathname && destinationUrl.hash !== '';
    const isHtmlPage = /\.html$|\/$/.test(destinationUrl.pathname);
    if (!isInternalDestination || isSamePageAnchor || !isHtmlPage || prefersReducedMotionQuery.matches) return;
    clickEvent.preventDefault();
    document.body.addEventListener('transitionend', function navigateAfterFade(transitionEvent) {
      if (transitionEvent.target !== document.body || transitionEvent.propertyName !== 'opacity') return;
      document.body.removeEventListener('transitionend', navigateAfterFade);
      window.location.href = destinationUrl.href;
    });
    document.body.classList.add('is-leaving');
  });
  window.addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));
}

/* Reveals elements carrying the data-reveal attribute when they enter the viewport */
function registerRevealElements(elementsToReveal) {
  elementsToReveal.forEach((revealElement) => {
    if (sharedRevealObserver) sharedRevealObserver.observe(revealElement);
    else revealElement.classList.add('is-revealed');
  });
}

function initializeScrollReveal() {
  const supportsObserver = 'IntersectionObserver' in window;
  if (supportsObserver && !prefersReducedMotionQuery.matches) {
    sharedRevealObserver = new IntersectionObserver((observedEntries, observer) => {
      observedEntries.forEach((observedEntry) => {
        if (!observedEntry.isIntersecting) return;
        observedEntry.target.classList.add('is-revealed');
        observer.unobserve(observedEntry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  }
  registerRevealElements(document.querySelectorAll('[data-reveal]'));
}

/* Animates numeric counters from zero to their target value when visible */
function animateCounterElement(counterElement) {
  const counterTargetValue = Number(counterElement.dataset.counterTarget);
  const counterSuffix = counterElement.dataset.counterSuffix || '';
  const animationDurationMs = 1800;
  if (prefersReducedMotionQuery.matches) {
    counterElement.textContent = counterTargetValue.toLocaleString('fr-FR') + counterSuffix;
    return;
  }
  const animationStartTime = performance.now();
  const renderCounterFrame = (currentTime) => {
    const progressRatio = Math.min((currentTime - animationStartTime) / animationDurationMs, 1);
    const easedProgress = 1 - Math.pow(1 - progressRatio, 3);
    counterElement.textContent = Math.round(counterTargetValue * easedProgress).toLocaleString('fr-FR') + counterSuffix;
    if (progressRatio < 1) requestAnimationFrame(renderCounterFrame);
  };
  requestAnimationFrame(renderCounterFrame);
}

function initializeAnimatedCounters() {
  const counterElements = document.querySelectorAll('[data-counter-target]');
  if (!counterElements.length) return;
  if (!('IntersectionObserver' in window)) {
    counterElements.forEach(animateCounterElement);
    return;
  }
  const counterObserver = new IntersectionObserver((observedEntries, observer) => {
    observedEntries.forEach((observedEntry) => {
      if (!observedEntry.isIntersecting) return;
      animateCounterElement(observedEntry.target);
      observer.unobserve(observedEntry.target);
    });
  }, { threshold: 0.6 });
  counterElements.forEach((counterElement) => counterObserver.observe(counterElement));
}

/* Moves parallax layers at a fraction of the scroll speed */
function initializeParallaxLayers() {
  const parallaxElements = document.querySelectorAll('[data-parallax-speed]');
  if (!parallaxElements.length || prefersReducedMotionQuery.matches) return;
  let isFrameRequested = false;
  const applyParallaxOffsets = () => {
    parallaxElements.forEach((parallaxElement) => {
      const parallaxSpeed = Number(parallaxElement.dataset.parallaxSpeed);
      parallaxElement.style.transform = `translate3d(0, ${(window.scrollY * parallaxSpeed).toFixed(1)}px, 0)`;
    });
    isFrameRequested = false;
  };
  window.addEventListener('scroll', () => {
    if (isFrameRequested) return;
    isFrameRequested = true;
    requestAnimationFrame(applyParallaxOffsets);
  }, { passive: true });
  applyParallaxOffsets();
}

/* Returns the validation message for a single field, or an empty string when valid */
function getFieldValidationMessage(fieldElement) {
  const fieldValue = fieldElement.value.trim();
  if (fieldElement.type === 'checkbox') return fieldElement.required && !fieldElement.checked ? 'Merci de cocher cette case pour continuer.' : '';
  if (fieldElement.required && !fieldValue) return fieldElement.dataset.requiredMessage || 'Ce champ est obligatoire.';
  if (fieldValue && fieldElement.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fieldValue)) return 'Merci d’indiquer une adresse e-mail valide.';
  if (fieldValue && fieldElement.type === 'tel' && !/^(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(fieldValue)) return 'Format attendu : 06 12 34 56 78.';
  if (fieldValue && fieldElement.type === 'date' && ((fieldElement.min && fieldValue < fieldElement.min) || (fieldElement.max && fieldValue > fieldElement.max))) return fieldElement.dataset.rangeMessage || 'Cette date n’est pas disponible.';
  if (fieldValue && fieldElement.minLength > 0 && fieldValue.length < fieldElement.minLength) return `Merci d’écrire au moins ${fieldElement.minLength} caractères.`;
  return '';
}

/* Displays or clears the inline error of a field and reports whether it is valid */
function updateFieldErrorState(fieldElement) {
  const validationMessage = getFieldValidationMessage(fieldElement);
  const errorMessageElement = document.querySelector(`[data-error-for="${fieldElement.id}"]`);
  fieldElement.setAttribute('aria-invalid', String(Boolean(validationMessage)));
  if (errorMessageElement) errorMessageElement.textContent = validationMessage;
  return !validationMessage;
}

/* Validates every field flagged with data-validate inside a form and focuses the first invalid one */
function validateFormFields(formElement) {
  const validatedFieldElements = Array.from(formElement.querySelectorAll('[data-validate]'));
  const invalidFieldElements = validatedFieldElements.filter((fieldElement) => !updateFieldErrorState(fieldElement));
  if (invalidFieldElements.length) invalidFieldElements[0].focus();
  return invalidFieldElements.length === 0;
}

/* Re-validates fields live once they have been flagged as invalid */
function initializeLiveValidation() {
  document.addEventListener('input', (inputEvent) => {
    const fieldElement = inputEvent.target;
    if (fieldElement.matches && fieldElement.matches('[data-validate][aria-invalid="true"]')) updateFieldErrorState(fieldElement);
  });
  document.addEventListener('change', (changeEvent) => {
    const fieldElement = changeEvent.target;
    if (fieldElement.matches && fieldElement.matches('[data-validate][aria-invalid="true"]')) updateFieldErrorState(fieldElement);
  });
}

/* Generic contact-style forms: validate, then replace the form by its success message */
function initializeSimpleForms() {
  document.querySelectorAll('[data-simple-form]').forEach((simpleFormElement) => {
    simpleFormElement.addEventListener('submit', (submitEvent) => {
      submitEvent.preventDefault();
      if (!validateFormFields(simpleFormElement)) return;
      const successElement = document.getElementById(simpleFormElement.dataset.successTarget);
      const senderNameField = simpleFormElement.querySelector('[name="name"]');
      const successNameElement = successElement && successElement.querySelector('[data-success-name]');
      if (successNameElement && senderNameField) successNameElement.textContent = senderNameField.value.trim().split(' ')[0];
      simpleFormElement.hidden = true;
      if (successElement) {
        successElement.hidden = false;
        successElement.focus();
      }
    });
  });
  document.querySelectorAll('[data-reset-form]').forEach((resetButtonElement) => {
    resetButtonElement.addEventListener('click', () => {
      const targetFormElement = document.getElementById(resetButtonElement.dataset.resetForm);
      targetFormElement.reset();
      targetFormElement.hidden = false;
      resetButtonElement.closest('[tabindex]').hidden = true;
      targetFormElement.querySelector('input, textarea, select').focus();
    });
  });
}

/* Writes the current year in the footer */
function renderCurrentYear() {
  document.querySelectorAll('[data-current-year]').forEach((yearElement) => {
    yearElement.textContent = String(new Date().getFullYear());
  });
}

initializeStickyHeader();
initializeMobileNavigation();
initializePageTransitions();
initializeScrollReveal();
initializeAnimatedCounters();
initializeParallaxLayers();
initializeLiveValidation();
initializeSimpleForms();
renderCurrentYear();
