/**
 * SmartDev portfolio — interactions and animations.
 */
(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- Page transitions ---------- */

  /**
   * Reveals the page once the DOM is ready by sliding the transition overlay away.
   */
  function revealPageOnLoad() {
    requestAnimationFrame(() => document.body.classList.add("is-loaded"));
  }

  /**
   * Returns true when a click on the given anchor should trigger an animated page change.
   */
  function isAnimatedNavigationLink(anchorElement, clickEvent) {
    if (!anchorElement || clickEvent.defaultPrevented || clickEvent.button !== 0) return false;
    if (clickEvent.metaKey || clickEvent.ctrlKey || clickEvent.shiftKey || clickEvent.altKey) return false;
    if (anchorElement.target === "_blank" || anchorElement.hasAttribute("download")) return false;
    const destinationUrl = new URL(anchorElement.href, window.location.href);
    if (destinationUrl.origin !== window.location.origin) return false;
    const isSamePageAnchor = destinationUrl.pathname === window.location.pathname && destinationUrl.hash !== "";
    return !isSamePageAnchor && destinationUrl.protocol.startsWith("http");
  }

  /**
   * Covers the page with the overlay and navigates once the cover transition has finished.
   */
  function navigateWithTransition(destinationHref) {
    const overlayElement = document.querySelector(".page-transition");
    const handleOverlayCovered = (transitionEvent) => {
      if (transitionEvent.target !== overlayElement || transitionEvent.propertyName !== "transform") return;
      overlayElement.removeEventListener("transitionend", handleOverlayCovered);
      window.location.href = destinationHref;
    };
    if (prefersReducedMotion || !overlayElement || !document.body.classList.contains("is-loaded")) {
      window.location.href = destinationHref;
      return;
    }
    overlayElement.addEventListener("transitionend", handleOverlayCovered);
    document.body.classList.add("is-leaving");
  }

  function initializePageTransitions() {
    document.addEventListener("click", (clickEvent) => {
      const anchorElement = clickEvent.target.closest("a[href]");
      if (!isAnimatedNavigationLink(anchorElement, clickEvent)) return;
      clickEvent.preventDefault();
      navigateWithTransition(anchorElement.href);
    });
    window.addEventListener("pageshow", (pageShowEvent) => {
      if (pageShowEvent.persisted) document.body.classList.remove("is-leaving");
    });
  }

  /* ---------- Header, navigation and scroll progress ---------- */

  function initializeNavigationMenu() {
    const navigationToggleButton = document.getElementById("navToggle");
    const navigationLinksList = document.getElementById("navLinks");
    const setMenuOpenState = (shouldOpen) => {
      navigationToggleButton.setAttribute("aria-expanded", String(shouldOpen));
      navigationToggleButton.setAttribute("aria-label", shouldOpen ? "Fermer le menu" : "Ouvrir le menu");
      navigationLinksList.classList.toggle("is-open", shouldOpen);
      document.body.classList.toggle("is-menu-open", shouldOpen);
    };
    navigationToggleButton.addEventListener("click", () => {
      setMenuOpenState(navigationToggleButton.getAttribute("aria-expanded") !== "true");
    });
    navigationLinksList.addEventListener("click", (clickEvent) => {
      if (clickEvent.target.closest("a")) setMenuOpenState(false);
    });
    document.addEventListener("keydown", (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") setMenuOpenState(false);
    });
  }

  /**
   * Synchronizes every scroll-dependent visual (header state, progress bar, process timeline) in a single frame.
   */
  function initializeScrollEffects() {
    const headerElement = document.getElementById("siteHeader");
    const scrollProgressElement = document.querySelector(".scroll-progress");
    const processTimelineElement = document.getElementById("processTimeline");
    let previousScrollPosition = window.scrollY;
    let isFrameScheduled = false;
    const updateScrollEffects = () => {
      const currentScrollPosition = window.scrollY;
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const isScrollingDown = currentScrollPosition > previousScrollPosition;
      headerElement.classList.toggle("is-scrolled", currentScrollPosition > 30);
      headerElement.classList.toggle("is-hidden", isScrollingDown && currentScrollPosition > 500 && !document.body.classList.contains("is-menu-open"));
      scrollProgressElement.style.transform = `scaleX(${scrollableHeight > 0 ? currentScrollPosition / scrollableHeight : 0})`;
      const timelineBounds = processTimelineElement.getBoundingClientRect();
      const timelineProgress = (window.innerHeight * 0.6 - timelineBounds.top) / timelineBounds.height;
      processTimelineElement.style.setProperty("--timeline-progress", Math.min(Math.max(timelineProgress, 0), 1).toFixed(3));
      previousScrollPosition = currentScrollPosition;
      isFrameScheduled = false;
    };
    window.addEventListener("scroll", () => {
      if (isFrameScheduled) return;
      isFrameScheduled = true;
      requestAnimationFrame(updateScrollEffects);
    }, { passive: true });
    updateScrollEffects();
  }

  /**
   * Highlights the navigation link of the section currently in view.
   */
  function initializeActiveSectionTracking() {
    const navigationLinks = [...document.querySelectorAll(".nav__link[href^='#']")];
    const sectionObserver = new IntersectionObserver((observedEntries) => {
      observedEntries.forEach((observedEntry) => {
        if (!observedEntry.isIntersecting) return;
        navigationLinks.forEach((navigationLink) => {
          navigationLink.classList.toggle("is-current", navigationLink.getAttribute("href") === `#${observedEntry.target.id}`);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach((sectionElement) => sectionObserver.observe(sectionElement));
  }

  /* ---------- Reveal on scroll and counters ---------- */

  const revealObserver = new IntersectionObserver((observedEntries) => {
    observedEntries.forEach((observedEntry) => {
      if (!observedEntry.isIntersecting) return;
      observedEntry.target.classList.add("is-visible");
      revealObserver.unobserve(observedEntry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  /**
   * Registers elements for scroll reveal, staggering siblings that share the same parent.
   */
  function observeRevealElements(revealElements) {
    revealElements.forEach((revealElement) => {
      const siblingRevealElements = [...revealElement.parentElement.children].filter((childElement) => childElement.classList.contains("reveal"));
      revealElement.style.setProperty("--reveal-delay", `${Math.min(siblingRevealElements.indexOf(revealElement), 6) * 0.08}s`);
      revealObserver.observe(revealElement);
    });
  }

  /**
   * Animates a numeric counter from zero to its data-target value with an ease-out curve.
   */
  function animateCounter(counterElement) {
    const targetValue = Number(counterElement.dataset.target);
    const animationDuration = prefersReducedMotion ? 1 : 1600;
    let animationStartTime = null;
    const renderCounterFrame = (frameTimestamp) => {
      animationStartTime ??= frameTimestamp;
      const animationProgress = Math.min((frameTimestamp - animationStartTime) / animationDuration, 1);
      const easedProgress = 1 - Math.pow(1 - animationProgress, 3);
      counterElement.textContent = Math.round(targetValue * easedProgress).toString();
      if (animationProgress < 1) requestAnimationFrame(renderCounterFrame);
    };
    requestAnimationFrame(renderCounterFrame);
  }

  function initializeCounters() {
    const counterObserver = new IntersectionObserver((observedEntries) => {
      observedEntries.forEach((observedEntry) => {
        if (!observedEntry.isIntersecting) return;
        animateCounter(observedEntry.target);
        counterObserver.unobserve(observedEntry.target);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll(".counter").forEach((counterElement) => counterObserver.observe(counterElement));
  }

  /* ---------- Hero: rotating words ---------- */

  /**
   * Rotates the hero keywords; each rotation is driven by the iteration event of a CSS animation acting as the clock.
   */
  function initializeHeroRotator() {
    const rotatorElement = document.getElementById("heroRotator");
    const rotatorWords = [...rotatorElement.querySelectorAll(".hero__rotator-word")];
    let activeWordIndex = 0;
    if (prefersReducedMotion) return;
    const showNextWord = () => {
      const leavingWord = rotatorWords[activeWordIndex];
      activeWordIndex = (activeWordIndex + 1) % rotatorWords.length;
      const enteringWord = rotatorWords[activeWordIndex];
      leavingWord.classList.replace("is-active", "is-leaving");
      enteringWord.classList.remove("is-leaving");
      enteringWord.classList.add("is-active");
    };
    rotatorElement.classList.add("is-rotating");
    rotatorElement.addEventListener("animationiteration", showNextWord);
    rotatorWords.forEach((rotatorWord) => {
      rotatorWord.addEventListener("transitionend", () => {
        if (rotatorWord.classList.contains("is-leaving")) rotatorWord.classList.remove("is-leaving");
      });
    });
  }

  /* ---------- Hero: particle network canvas ---------- */

  /**
   * Draws an interactive constellation of particles that react to the pointer.
   * Rendering pauses automatically when the hero leaves the viewport.
   */
  function initializeHeroCanvas() {
    const canvasElement = document.getElementById("heroCanvas");
    const drawingContext = canvasElement.getContext("2d");
    const pointerPosition = { x: -9999, y: -9999 };
    const linkDistance = 130;
    let particleList = [];
    let canvasWidth = 0;
    let canvasHeight = 0;
    let animationFrameIdentifier = null;
    const createParticles = () => {
      const particleCount = Math.round(Math.min(canvasWidth * canvasHeight / 14000, 110));
      particleList = Array.from({ length: particleCount }, () => ({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        velocityX: (Math.random() - 0.5) * 0.4,
        velocityY: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.6 + 0.6
      }));
    };
    const resizeCanvas = () => {
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvasWidth = canvasElement.clientWidth;
      canvasHeight = canvasElement.clientHeight;
      canvasElement.width = canvasWidth * devicePixelRatio;
      canvasElement.height = canvasHeight * devicePixelRatio;
      drawingContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      createParticles();
    };
    const renderFrame = () => {
      drawingContext.clearRect(0, 0, canvasWidth, canvasHeight);
      particleList.forEach((particle, particleIndex) => {
        const pointerDeltaX = particle.x - pointerPosition.x;
        const pointerDeltaY = particle.y - pointerPosition.y;
        const pointerDistance = Math.hypot(pointerDeltaX, pointerDeltaY);
        if (pointerDistance < 120 && pointerDistance > 0) {
          particle.x += (pointerDeltaX / pointerDistance) * 1.2;
          particle.y += (pointerDeltaY / pointerDistance) * 1.2;
        }
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        if (particle.x < 0 || particle.x > canvasWidth) particle.velocityX *= -1;
        if (particle.y < 0 || particle.y > canvasHeight) particle.velocityY *= -1;
        drawingContext.beginPath();
        drawingContext.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        drawingContext.fillStyle = "rgba(200, 205, 255, 0.7)";
        drawingContext.fill();
        for (let neighborIndex = particleIndex + 1; neighborIndex < particleList.length; neighborIndex++) {
          const neighborParticle = particleList[neighborIndex];
          const neighborDistance = Math.hypot(particle.x - neighborParticle.x, particle.y - neighborParticle.y);
          if (neighborDistance > linkDistance) continue;
          const linkOpacity = (1 - neighborDistance / linkDistance) * 0.35;
          drawingContext.strokeStyle = `rgba(124, 92, 255, ${linkOpacity})`;
          drawingContext.lineWidth = 1;
          drawingContext.beginPath();
          drawingContext.moveTo(particle.x, particle.y);
          drawingContext.lineTo(neighborParticle.x, neighborParticle.y);
          drawingContext.stroke();
        }
      });
      animationFrameIdentifier = requestAnimationFrame(renderFrame);
    };
    const startRendering = () => {
      if (animationFrameIdentifier === null) animationFrameIdentifier = requestAnimationFrame(renderFrame);
    };
    const stopRendering = () => {
      cancelAnimationFrame(animationFrameIdentifier);
      animationFrameIdentifier = null;
    };
    new ResizeObserver(resizeCanvas).observe(canvasElement);
    canvasElement.parentElement.addEventListener("pointermove", (pointerEvent) => {
      const canvasBounds = canvasElement.getBoundingClientRect();
      pointerPosition.x = pointerEvent.clientX - canvasBounds.left;
      pointerPosition.y = pointerEvent.clientY - canvasBounds.top;
    });
    canvasElement.parentElement.addEventListener("pointerleave", () => {
      pointerPosition.x = -9999;
      pointerPosition.y = -9999;
    });
    if (prefersReducedMotion) {
      resizeCanvas();
      renderFrame();
      stopRendering();
      return;
    }
    new IntersectionObserver(([heroEntry]) => {
      if (heroEntry.isIntersecting) startRendering();
      else stopRendering();
    }).observe(canvasElement);
  }

  /* ---------- Pointer effects: glow, tilt, magnetic buttons ---------- */

  function initializeCursorGlow() {
    const cursorGlowElement = document.querySelector(".cursor-glow");
    let isFrameScheduled = false;
    let latestPointerX = 0;
    let latestPointerY = 0;
    if (!hasFinePointer || prefersReducedMotion) return;
    window.addEventListener("pointermove", (pointerEvent) => {
      latestPointerX = pointerEvent.clientX;
      latestPointerY = pointerEvent.clientY;
      document.body.classList.add("has-pointer");
      if (isFrameScheduled) return;
      isFrameScheduled = true;
      requestAnimationFrame(() => {
        cursorGlowElement.style.transform = `translate3d(${latestPointerX - 210}px, ${latestPointerY - 210}px, 0)`;
        isFrameScheduled = false;
      });
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => document.body.classList.remove("has-pointer"));
  }

  /**
   * Applies a 3D tilt that follows the pointer and exposes its position as CSS variables for spotlight effects.
   */
  function attachTiltEffect(tiltElement) {
    if (!hasFinePointer || prefersReducedMotion) return;
    tiltElement.addEventListener("pointermove", (pointerEvent) => {
      const elementBounds = tiltElement.getBoundingClientRect();
      const relativeX = (pointerEvent.clientX - elementBounds.left) / elementBounds.width;
      const relativeY = (pointerEvent.clientY - elementBounds.top) / elementBounds.height;
      tiltElement.style.transform = `perspective(900px) rotateX(${(0.5 - relativeY) * 8}deg) rotateY(${(relativeX - 0.5) * 8}deg) translateY(-4px)`;
      tiltElement.style.setProperty("--pointer-x", `${relativeX * 100}%`);
      tiltElement.style.setProperty("--pointer-y", `${relativeY * 100}%`);
    });
    tiltElement.addEventListener("pointerleave", () => {
      tiltElement.style.transform = "";
    });
  }

  /**
   * Makes buttons drift slightly toward the pointer.
   */
  function attachMagneticEffect(magneticElement) {
    if (!hasFinePointer || prefersReducedMotion) return;
    magneticElement.addEventListener("pointermove", (pointerEvent) => {
      const elementBounds = magneticElement.getBoundingClientRect();
      const offsetX = pointerEvent.clientX - (elementBounds.left + elementBounds.width / 2);
      const offsetY = pointerEvent.clientY - (elementBounds.top + elementBounds.height / 2);
      magneticElement.style.transform = `translate(${offsetX * 0.25}px, ${offsetY * 0.35}px)`;
    });
    magneticElement.addEventListener("pointerleave", () => {
      magneticElement.style.transform = "";
    });
  }

  /* ---------- Projects grid and filters ---------- */

  const arrowIconMarkup = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  /**
   * Builds the markup of a single project card.
   */
  function createProjectCardElement(projectData, projectIndex) {
    const cardElement = document.createElement("article");
    cardElement.className = "project-card reveal";
    cardElement.dataset.category = projectData.category;
    cardElement.style.setProperty("--card-accent", projectData.accentColor);
    cardElement.innerHTML = `
      <div class="project-card__media">
        <img src="${projectData.imageUrl}" alt="Aperçu du site ${projectData.title}" loading="lazy" width="900" height="563">
        <span class="project-card__index">${String(projectIndex + 1).padStart(2, "0")}</span>
        <span class="project-card__category">${projectData.categoryLabel}</span>
      </div>
      <div class="project-card__body">
        <h3 class="project-card__title">${projectData.title}</h3>
        <p class="project-card__description">${projectData.description}</p>
        <ul class="project-card__tags">${projectData.tags.map((tagLabel) => `<li>${tagLabel}</li>`).join("")}</ul>
        <a class="project-card__link" href="projects/${projectData.slug}/index.html" aria-label="Explorer le site ${projectData.title}">Explorer le site ${arrowIconMarkup}</a>
      </div>`;
    attachTiltEffect(cardElement);
    return cardElement;
  }

  function renderProjectCards() {
    const projectsGridElement = document.getElementById("projectsGrid");
    const projectCardElements = PORTFOLIO_PROJECTS.map(createProjectCardElement);
    projectsGridElement.replaceChildren(...projectCardElements);
    observeRevealElements(projectCardElements);
  }

  /**
   * Moves the pill indicator under the active filter button.
   */
  function moveFilterIndicator(activeFilterButton) {
    const filterIndicatorElement = document.querySelector(".project-filters__indicator");
    filterIndicatorElement.style.width = `${activeFilterButton.offsetWidth}px`;
    filterIndicatorElement.style.height = `${activeFilterButton.offsetHeight}px`;
    filterIndicatorElement.style.transform = `translate(${activeFilterButton.offsetLeft}px, ${activeFilterButton.offsetTop}px)`;
  }

  /**
   * Filters the project cards and animates the layout change with the FLIP technique.
   */
  function applyProjectFilter(selectedCategory) {
    const projectCardElements = [...document.querySelectorAll(".project-card")];
    const initialPositions = new Map(projectCardElements.filter((cardElement) => !cardElement.hidden).map((cardElement) => [cardElement, cardElement.getBoundingClientRect()]));
    projectCardElements.forEach((cardElement) => {
      cardElement.hidden = selectedCategory !== "all" && cardElement.dataset.category !== selectedCategory;
      cardElement.classList.add("is-visible");
    });
    if (prefersReducedMotion) return;
    projectCardElements.filter((cardElement) => !cardElement.hidden).forEach((cardElement) => {
      const initialPosition = initialPositions.get(cardElement);
      const finalPosition = cardElement.getBoundingClientRect();
      if (!initialPosition) {
        cardElement.animate([{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "scale(1)" }], { duration: 500, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
        return;
      }
      const deltaX = initialPosition.left - finalPosition.left;
      const deltaY = initialPosition.top - finalPosition.top;
      if (deltaX === 0 && deltaY === 0) return;
      cardElement.animate([{ transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: "translate(0, 0)" }], { duration: 600, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    });
  }

  function initializeProjectFilters() {
    const filterContainerElement = document.getElementById("projectFilters");
    const filterButtons = [...filterContainerElement.querySelectorAll(".project-filters__button")];
    filterContainerElement.addEventListener("click", (clickEvent) => {
      const clickedFilterButton = clickEvent.target.closest(".project-filters__button");
      if (!clickedFilterButton || clickedFilterButton.classList.contains("is-active")) return;
      filterButtons.forEach((filterButton) => {
        const isSelected = filterButton === clickedFilterButton;
        filterButton.classList.toggle("is-active", isSelected);
        filterButton.setAttribute("aria-selected", String(isSelected));
      });
      moveFilterIndicator(clickedFilterButton);
      applyProjectFilter(clickedFilterButton.dataset.filter);
    });
    new ResizeObserver(() => moveFilterIndicator(filterContainerElement.querySelector(".is-active"))).observe(filterContainerElement);
  }

  /* ---------- Contact form ---------- */

  const contactValidationRules = {
    name: (fieldValue) => fieldValue.trim().length >= 2 || "Indiquez votre nom (2 caractères minimum).",
    email: (fieldValue) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fieldValue.trim()) || "Saisissez une adresse e-mail valide.",
    projectType: (fieldValue) => fieldValue !== "" || "Choisissez un type de projet.",
    message: (fieldValue) => fieldValue.trim().length >= 20 || "Détaillez un peu votre besoin (20 caractères minimum)."
  };

  /**
   * Validates one form field against its rule and displays the matching error message.
   */
  function validateContactField(fieldElement) {
    const validationResult = contactValidationRules[fieldElement.name](fieldElement.value);
    const fieldWrapperElement = fieldElement.closest(".field");
    const isFieldValid = validationResult === true;
    fieldWrapperElement.classList.toggle("has-error", !isFieldValid);
    fieldWrapperElement.querySelector(".field__error").textContent = isFieldValid ? "" : validationResult;
    fieldElement.setAttribute("aria-invalid", String(!isFieldValid));
    return isFieldValid;
  }

  function initializeContactForm() {
    const contactFormElement = document.getElementById("contactForm");
    const contactSuccessElement = document.getElementById("contactSuccess");
    const contactFieldElements = [...contactFormElement.querySelectorAll("input, select, textarea")];
    contactFieldElements.forEach((fieldElement) => {
      fieldElement.addEventListener("blur", () => validateContactField(fieldElement));
      fieldElement.addEventListener("input", () => {
        if (fieldElement.closest(".field").classList.contains("has-error")) validateContactField(fieldElement);
      });
    });
    contactFormElement.addEventListener("submit", (submitEvent) => {
      submitEvent.preventDefault();
      const invalidFieldElements = contactFieldElements.filter((fieldElement) => !validateContactField(fieldElement));
      if (invalidFieldElements.length > 0) {
        invalidFieldElements[0].focus();
        return;
      }
      const formValues = Object.fromEntries(new FormData(contactFormElement));
      const mailSubject = encodeURIComponent(`[${formValues.projectType}] Demande de ${formValues.name}`);
      const mailBody = encodeURIComponent(`${formValues.message}\n\n${formValues.name} — ${formValues.email}`);
      contactSuccessElement.hidden = false;
      window.location.href = `mailto:contact@smartdev.fr?subject=${mailSubject}&body=${mailBody}`;
      contactFormElement.reset();
    });
  }

  /* ---------- Bootstrap ---------- */

  document.getElementById("currentYear").textContent = new Date().getFullYear();
  renderProjectCards();
  observeRevealElements([...document.querySelectorAll(".reveal")].filter((revealElement) => !revealElement.classList.contains("project-card")));
  document.querySelectorAll(".tilt").forEach(attachTiltEffect);
  document.querySelectorAll(".magnetic").forEach(attachMagneticEffect);
  initializePageTransitions();
  initializeNavigationMenu();
  initializeScrollEffects();
  initializeActiveSectionTracking();
  initializeCounters();
  initializeHeroRotator();
  initializeHeroCanvas();
  initializeCursorGlow();
  initializeProjectFilters();
  initializeContactForm();
  revealPageOnLoad();
})();
