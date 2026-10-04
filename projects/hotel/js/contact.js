/* ==========================================================================
   Azur Hôtel & Spa — contact page: accessible FAQ accordion where opening
   one answer closes the others. The contact form uses the shared handler.
   ========================================================================== */

const faqItemElements = Array.from(document.querySelectorAll('[data-faq-item]'));

/* Opens or closes a FAQ item and keeps its trigger state in sync */
function setFaqItemOpenState(faqItemElement, isOpen) {
  faqItemElement.classList.toggle('is-open', isOpen);
  faqItemElement.querySelector('.faq-item__trigger').setAttribute('aria-expanded', String(isOpen));
}

faqItemElements.forEach((faqItemElement) => {
  faqItemElement.querySelector('.faq-item__trigger').addEventListener('click', () => {
    const shouldOpen = !faqItemElement.classList.contains('is-open');
    faqItemElements.forEach((otherFaqItemElement) => setFaqItemOpenState(otherFaqItemElement, false));
    setFaqItemOpenState(faqItemElement, shouldOpen);
  });
});

if (faqItemElements.length) setFaqItemOpenState(faqItemElements[0], true);
