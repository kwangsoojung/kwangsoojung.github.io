const siteNav = document.querySelector(".site-nav");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".nav-menu a");
const sections = document.querySelectorAll("main section[id]");
const yearTarget = document.getElementById("current-year");

const portraitImage = document.querySelector(".portrait-image");
const portraitMedia = document.querySelector(".portrait-media");
const projectCovers = document.querySelectorAll(".project-cover");
const modalTriggers = document.querySelectorAll(".case-study-trigger, .brand-trigger");
const backToTopLink = document.querySelector("[data-back-to-top]");

const caseStudyRoot = document.getElementById("case-study-modal-root");
const lightboxRoot = document.getElementById("lightbox-root");

const GALLERY_MANIFEST_PATH = "assets/gallery-manifest.json";
const SWIPE_THRESHOLD = 48;
const TAP_MOVE_THRESHOLD = 10;
const WHEEL_THRESHOLD = 42;
const WHEEL_COOLDOWN_MS = 420;

const state = {
  galleryManifest: null,
  galleryManifestPromise: null,
  currentCaseStudy: null,
  currentGallery: [],
  currentImageIndex: 0,
  isCaseStudyOpen: false,
  isLightboxOpen: false,
  activeTrigger: null,
  lastWheelNavigationTime: 0,
  touchSession: null
};

if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

const setImageFallback = (image, container) => {
  if (!image || !container) {
    return;
  }

  const markMissing = () => {
    container.classList.add("is-missing");
  };

  const markReady = () => {
    container.classList.remove("is-missing");
  };

  if (image.complete && image.naturalWidth === 0) {
    markMissing();
  }

  image.addEventListener("error", markMissing);
  image.addEventListener("load", markReady);
};

const warnManifestLoad = (error) => {
  if (window.location.protocol === "file:") {
    console.warn(
      "[gallery] assets/gallery-manifest.json could not be loaded from file://. Open the site through a local server or GitHub Pages.",
      error
    );
    return;
  }

  console.warn("[gallery] Failed to load assets/gallery-manifest.json.", error);
};

const loadGalleryManifest = async () => {
  if (state.galleryManifest) {
    return state.galleryManifest;
  }

  if (!state.galleryManifestPromise) {
    state.galleryManifestPromise = fetch(GALLERY_MANIFEST_PATH)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${GALLERY_MANIFEST_PATH}: ${response.status}`);
        }

        return response.json();
      })
      .then((data) => {
        state.galleryManifest = data;
        return data;
      })
      .catch((error) => {
        warnManifestLoad(error);
        state.galleryManifest = { projects: {}, brands: {} };
        return state.galleryManifest;
      });
  }

  return state.galleryManifestPromise;
};

const getGalleryEntry = async (type, key) => {
  const manifest = await loadGalleryManifest();
  const collection = type === "brand" ? manifest.brands : manifest.projects;
  return collection?.[key] || null;
};

const preloadImage = (src, contextLabel) =>
  new Promise((resolve) => {
    if (!src) {
      resolve({ ok: false, src, error: new Error("Missing src") });
      return;
    }

    const image = new Image();

    image.onload = () => {
      resolve({
        ok: true,
        src,
        width: image.naturalWidth,
        height: image.naturalHeight
      });
    };

    image.onerror = () => {
      console.warn(`[gallery] Failed to load image for ${contextLabel}: ${src}`);
      resolve({ ok: false, src, error: new Error(`Failed to load ${src}`) });
    };

    image.src = src;
  });

const applyProjectCovers = async () => {
  const manifest = await loadGalleryManifest();

  projectCovers.forEach(async (image) => {
    const key = image.dataset.galleryKey;
    const cover = manifest.projects?.[key]?.cover;
    const container = image.closest(".media-surface");

    if (!cover || !container) {
      console.warn(`[gallery] Missing cover entry for project key "${key}".`);
      container?.classList.add("is-missing");
      return;
    }

    const result = await preloadImage(cover, `cover:${key}`);
    if (!result.ok) {
      container.classList.add("is-missing");
      return;
    }

    setImageFallback(image, container);
    image.src = cover;
  });
};

const syncBodyLock = () => {
  document.body.classList.toggle(
    "is-overlay-open",
    state.isCaseStudyOpen || state.isLightboxOpen
  );
};

const isTouchMode = () =>
  window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 760;

const resetScrollPosition = (element) => {
  if (!element) {
    return;
  }

  element.scrollTop = 0;
  element.scrollLeft = 0;
};

const createButton = (className, label, text) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.setAttribute("aria-label", label);
  button.textContent = text;
  return button;
};

const buildGalleryItems = async ({ type, key, title }) => {
  const entry = await getGalleryEntry(type, key);

  if (!entry) {
    console.warn(`[gallery] Missing manifest entry for ${type}:${key}.`);
    return [];
  }

  const imageList = Array.isArray(entry.images) ? entry.images : [];
  const loadedImages = await Promise.all(
    imageList.map((src, index) =>
      preloadImage(src, `${type}:${key}:${index + 1}`).then((result) => {
        if (!result.ok) {
          return null;
        }

        return {
          src,
          alt: `${title} image ${index + 1}`,
          width: result.width,
          height: result.height
        };
      })
    )
  );

  return loadedImages.filter(Boolean);
};

const closeLightbox = ({ returnFocus = false } = {}) => {
  if (!state.isLightboxOpen) {
    return;
  }

  state.isLightboxOpen = false;
  lightboxRoot.innerHTML = "";
  syncBodyLock();

  if (returnFocus) {
    const caseCloseButton = caseStudyRoot.querySelector("[data-case-close]");
    caseCloseButton?.focus();
  }
};

const closeCaseStudy = () => {
  if (!state.isCaseStudyOpen) {
    return;
  }

  closeLightbox();
  state.isCaseStudyOpen = false;
  state.currentCaseStudy = null;
  state.currentGallery = [];
  state.currentImageIndex = 0;
  caseStudyRoot.innerHTML = "";
  syncBodyLock();
  state.activeTrigger?.focus();
};

const stepLightbox = (direction) => {
  if (!state.isLightboxOpen || state.currentGallery.length <= 1) {
    return;
  }

  state.currentImageIndex =
    (state.currentImageIndex + direction + state.currentGallery.length) %
    state.currentGallery.length;

  updateLightboxView();
};

const updateLightboxView = () => {
  if (!state.isLightboxOpen) {
    return;
  }

  const image = lightboxRoot.querySelector("[data-lightbox-image]");
  const counter = lightboxRoot.querySelector("[data-lightbox-counter]");
  const prevButton = lightboxRoot.querySelector("[data-lightbox-prev]");
  const nextButton = lightboxRoot.querySelector("[data-lightbox-next]");
  const stage = lightboxRoot.querySelector("[data-lightbox-stage]");

  const activeItem = state.currentGallery[state.currentImageIndex];
  if (!image || !activeItem) {
    return;
  }

  image.src = activeItem.src;
  image.alt = activeItem.alt;
  image.removeAttribute("width");
  image.removeAttribute("height");

  if (counter) {
    counter.textContent = `${state.currentImageIndex + 1} / ${state.currentGallery.length}`;
    counter.hidden = state.currentGallery.length <= 1;
  }

  if (prevButton) {
    prevButton.disabled = state.currentGallery.length <= 1;
  }

  if (nextButton) {
    nextButton.disabled = state.currentGallery.length <= 1;
  }

  resetScrollPosition(stage);
};

const handleLightboxTap = (clientX) => {
  if (!state.isLightboxOpen || !isTouchMode()) {
    return;
  }

  const stage = lightboxRoot.querySelector("[data-lightbox-stage]");
  if (!stage) {
    return;
  }

  const rect = stage.getBoundingClientRect();
  const relativeX = clientX - rect.left;
  const ratio = relativeX / rect.width;

  if (ratio <= 0.28 && state.currentGallery.length > 1) {
    stepLightbox(-1);
    return;
  }

  if (ratio >= 0.72 && state.currentGallery.length > 1) {
    stepLightbox(1);
    return;
  }

  closeLightbox({ returnFocus: true });
};

const bindLightboxEvents = () => {
  const overlay = lightboxRoot.querySelector("[data-lightbox-overlay]");
  const closeButton = lightboxRoot.querySelector("[data-lightbox-close]");
  const prevButton = lightboxRoot.querySelector("[data-lightbox-prev]");
  const nextButton = lightboxRoot.querySelector("[data-lightbox-next]");
  const stage = lightboxRoot.querySelector("[data-lightbox-stage]");

  overlay?.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.lightboxBackdrop === "true") {
      closeLightbox({ returnFocus: true });
    }
  });

  closeButton?.addEventListener("click", () => closeLightbox({ returnFocus: true }));
  prevButton?.addEventListener("click", () => stepLightbox(-1));
  nextButton?.addEventListener("click", () => stepLightbox(1));

  stage?.addEventListener(
    "touchstart",
    (event) => {
      if (!isTouchMode()) {
        return;
      }

      const touch = event.touches[0];
      state.touchSession = {
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY
      };
    },
    { passive: true }
  );

  stage?.addEventListener(
    "touchmove",
    (event) => {
      if (!state.touchSession) {
        return;
      }

      const touch = event.touches[0];
      state.touchSession.lastX = touch.clientX;
      state.touchSession.lastY = touch.clientY;
    },
    { passive: true }
  );

  stage?.addEventListener(
    "touchend",
    (event) => {
      if (!state.touchSession || !isTouchMode()) {
        state.touchSession = null;
        return;
      }

      const touch = event.changedTouches[0];
      const endX = state.touchSession.lastX ?? touch.clientX;
      const endY = state.touchSession.lastY ?? touch.clientY;
      const deltaX = endX - state.touchSession.startX;
      const deltaY = endY - state.touchSession.startY;

      state.touchSession = null;

      if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) {
          stepLightbox(1);
          return;
        }

        stepLightbox(-1);
        return;
      }

      if (Math.abs(deltaX) <= TAP_MOVE_THRESHOLD && Math.abs(deltaY) <= TAP_MOVE_THRESHOLD) {
        handleLightboxTap(touch.clientX);
      }
    },
    { passive: true }
  );

  stage?.addEventListener(
    "wheel",
    (event) => {
      if (isTouchMode() || state.currentGallery.length <= 1) {
        return;
      }

      const now = Date.now();
      const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY);

      if (
        !horizontalIntent ||
        Math.abs(event.deltaX) < WHEEL_THRESHOLD ||
        now - state.lastWheelNavigationTime < WHEEL_COOLDOWN_MS
      ) {
        return;
      }

      state.lastWheelNavigationTime = now;

      if (event.deltaX > 0) {
        stepLightbox(1);
        return;
      }

      stepLightbox(-1);
    },
    { passive: true }
  );
};

const renderLightbox = () => {
  if (!state.isLightboxOpen || !state.currentGallery.length) {
    return;
  }

  lightboxRoot.innerHTML = `
    <div class="lightbox-overlay" data-lightbox-overlay>
      <div class="lightbox-overlay__backdrop" data-lightbox-backdrop="true"></div>
      <section class="lightbox-viewer" role="dialog" aria-modal="true" aria-label="Expanded gallery image">
        <div class="lightbox-toolbar">
          <button class="lightbox-nav lightbox-nav--prev" type="button" aria-label="Previous image" data-lightbox-prev>‹</button>
          <span class="lightbox-counter" data-lightbox-counter></span>
          <div class="lightbox-toolbar__actions">
            <button class="lightbox-close" type="button" aria-label="Close enlarged image" data-lightbox-close>×</button>
            <button class="lightbox-nav lightbox-nav--next" type="button" aria-label="Next image" data-lightbox-next>›</button>
          </div>
        </div>
        <div class="lightbox-stage" data-lightbox-stage>
          <div class="lightbox-media">
            <img class="lightbox-image" data-lightbox-image alt="" />
          </div>
        </div>
      </section>
    </div>
  `;

  bindLightboxEvents();
  updateLightboxView();
  syncBodyLock();
};

const openLightbox = (index) => {
  if (!state.currentGallery.length) {
    console.warn("[gallery] No valid image available for the lightbox.");
    return;
  }

  state.currentImageIndex = index;
  state.isLightboxOpen = true;
  renderLightbox();
};

const bindCaseStudyEvents = () => {
  const overlay = caseStudyRoot.querySelector("[data-case-overlay]");
  const closeButton = caseStudyRoot.querySelector("[data-case-close]");
  const scrollArea = caseStudyRoot.querySelector("[data-case-scroll]");
  const galleryButtons = caseStudyRoot.querySelectorAll("[data-gallery-index]");

  overlay?.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.caseBackdrop === "true") {
      closeCaseStudy();
    }
  });

  closeButton?.addEventListener("click", closeCaseStudy);

  galleryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.galleryIndex || 0);
      openLightbox(index);
    });
  });

  requestAnimationFrame(() => {
    resetScrollPosition(scrollArea);
    resetScrollPosition(overlay);
  });
};

const renderCaseStudy = () => {
  if (!state.currentCaseStudy) {
    return;
  }

  const { title, year, role, summary, copy, galleryType } = state.currentCaseStudy;

  caseStudyRoot.innerHTML = `
    <div class="case-overlay" data-case-overlay>
      <div class="case-overlay__backdrop" data-case-backdrop="true"></div>
      <section class="case-modal" role="dialog" aria-modal="true" aria-labelledby="case-study-title">
        <div class="case-modal__panel">
          <header class="case-modal__header">
            <div class="case-modal__header-copy">
              <p class="case-modal__eyebrow">${galleryType === "brand" ? "Brand Collaboration Reference" : "Case Study"}</p>
              <h3 id="case-study-title"></h3>
              <p class="case-modal__meta" data-case-meta></p>
            </div>
            <button class="case-modal__close" type="button" aria-label="Close case study" data-case-close>×</button>
          </header>
          <div class="case-modal__scroll" data-case-scroll>
            <p class="case-modal__summary" data-case-summary></p>
            <div class="case-modal__copy" data-case-copy></div>
            <div class="case-gallery" data-case-gallery></div>
            <p class="case-modal__empty" data-case-empty hidden>Gallery images can be added here later.</p>
          </div>
        </div>
      </section>
    </div>
  `;

  const titleElement = caseStudyRoot.querySelector("#case-study-title");
  const metaElement = caseStudyRoot.querySelector("[data-case-meta]");
  const summaryElement = caseStudyRoot.querySelector("[data-case-summary]");
  const copyElement = caseStudyRoot.querySelector("[data-case-copy]");
  const galleryElement = caseStudyRoot.querySelector("[data-case-gallery]");
  const emptyElement = caseStudyRoot.querySelector("[data-case-empty]");

  if (titleElement) {
    titleElement.textContent = title;
  }

  if (metaElement) {
    const metaParts = [year, role].filter(Boolean);
    metaElement.textContent = metaParts.join(" / ");
    metaElement.hidden = metaParts.length === 0;
  }

  if (summaryElement) {
    summaryElement.textContent = summary || "";
    summaryElement.hidden = !summary;
  }

  if (copyElement) {
    if (copy) {
      const paragraph = document.createElement("p");
      paragraph.textContent = copy;
      copyElement.replaceChildren(paragraph);
      copyElement.hidden = false;
    } else {
      copyElement.replaceChildren();
      copyElement.hidden = true;
    }
  }

  if (galleryElement) {
    galleryElement.classList.toggle("case-gallery--single", state.currentGallery.length === 1);

    if (state.currentGallery.length === 0) {
      galleryElement.hidden = true;
      if (emptyElement) {
        emptyElement.hidden = false;
      }
    } else {
      galleryElement.hidden = false;
      if (emptyElement) {
        emptyElement.hidden = true;
      }

      state.currentGallery.forEach((item, index) => {
        const article = document.createElement("article");
        article.className = "case-gallery__item";

        const button = document.createElement("button");
        button.className = "case-gallery__button";
        button.type = "button";
        button.dataset.galleryIndex = String(index);
        button.setAttribute("aria-label", `Open ${item.alt} in larger view`);

        const frame = document.createElement("span");
        frame.className = "case-gallery__frame";

        const image = document.createElement("img");
        image.className = "case-gallery__image";
        image.src = item.src;
        image.alt = item.alt;
        image.loading = "lazy";

        const label = document.createElement("span");
        label.className = "case-gallery__label";
        label.textContent = "Click to enlarge";

        frame.append(image, label);
        button.append(frame);
        article.append(button);
        galleryElement.append(article);
      });
    }
  }

  bindCaseStudyEvents();
  syncBodyLock();
};

const openCaseStudy = async (trigger) => {
  if (!trigger) {
    return;
  }

  const galleryType = trigger.dataset.galleryType || "project";
  const galleryKey = trigger.dataset.galleryKey || "";
  const title = trigger.dataset.project || "Project";

  state.activeTrigger = trigger;
  state.currentGallery = await buildGalleryItems({
    type: galleryType,
    key: galleryKey,
    title
  });

  state.currentCaseStudy = {
    title,
    year: trigger.dataset.year || "",
    role: trigger.dataset.role || "",
    summary:
      galleryType === "brand"
        ? trigger.dataset.summary || "Selected collaboration and campaign reference."
        : trigger.dataset.summary || "",
    copy: galleryType === "brand" ? "" : trigger.dataset.caseStudy || "",
    galleryType
  };

  state.isCaseStudyOpen = true;
  renderCaseStudy();
};

setImageFallback(portraitImage, portraitMedia);
applyProjectCovers();

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (!siteNav || !siteNav.classList.contains("is-open")) {
      return;
    }

    siteNav.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const currentId = entry.target.getAttribute("id");

        navLinks.forEach((link) => {
          const target = link.getAttribute("href");
          const isActive = target === `#${currentId}`;

          link.classList.toggle("is-active", isActive);
          if (isActive) {
            link.setAttribute("aria-current", "page");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      });
    },
    {
      rootMargin: "-35% 0px -50% 0px",
      threshold: 0.1
    }
  );

  sections.forEach((section) => sectionObserver.observe(section));
}

if (backToTopLink) {
  backToTopLink.addEventListener("click", (event) => {
    event.preventDefault();
    const heroSection = document.getElementById("hero");

    if (heroSection) {
      heroSection.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

modalTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    openCaseStudy(trigger);
  });
});

document.addEventListener("keydown", (event) => {
  if (state.isLightboxOpen) {
    if (event.key === "Escape") {
      closeLightbox({ returnFocus: true });
      return;
    }

    if (event.key === "ArrowRight") {
      stepLightbox(1);
      return;
    }

    if (event.key === "ArrowLeft") {
      stepLightbox(-1);
      return;
    }
  }

  if (state.isCaseStudyOpen && event.key === "Escape") {
    closeCaseStudy();
  }
});
