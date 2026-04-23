const siteNav = document.querySelector(".site-nav");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".nav-menu a");
const sections = document.querySelectorAll("main section[id]");
const yearTarget = document.getElementById("current-year");

const portraitImage = document.querySelector(".portrait-image");
const portraitMedia = document.querySelector(".portrait-media");
const projectCovers = document.querySelectorAll(".project-cover");

const dialog = document.getElementById("case-study-dialog");
const dialogTitle = document.getElementById("dialog-title");
const dialogYear = document.getElementById("dialog-year");
const dialogRole = document.getElementById("dialog-role");
const dialogSummary = document.getElementById("dialog-summary");
const dialogCopy = document.getElementById("dialog-copy");
const dialogShell = document.getElementById("dialog-shell");
const dialogContent = document.getElementById("dialog-content");
const dialogGallery = document.getElementById("dialog-gallery");
const dialogGalleryEmpty = document.getElementById("dialog-gallery-empty");
const dialogClose = document.querySelector(".dialog-close");
const modalTriggers = document.querySelectorAll(".case-study-trigger, .brand-trigger");
const backToTopLink = document.querySelector("[data-back-to-top]");

const lightbox = document.getElementById("lightbox-dialog");
const lightboxStage = document.getElementById("lightbox-stage");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxClose = document.querySelector(".lightbox-close");
const lightboxPrev = document.querySelector(".lightbox-nav--prev");
const lightboxNext = document.querySelector(".lightbox-nav--next");

const GALLERY_MANIFEST_PATH = "assets/gallery-manifest.json";
const SWIPE_THRESHOLD = 48;

let galleryManifest = null;
let galleryManifestPromise = null;
let activeGalleryImages = [];
let activeLightboxIndex = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchCurrentX = 0;
let touchCurrentY = 0;
let touchMoved = false;
let lastWheelNavigationTime = 0;
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
  if (galleryManifest) {
    return galleryManifest;
  }

  if (!galleryManifestPromise) {
    galleryManifestPromise = fetch(GALLERY_MANIFEST_PATH)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${GALLERY_MANIFEST_PATH}: ${response.status}`);
        }

        return response.json();
      })
      .then((data) => {
        galleryManifest = data;
        return data;
      })
      .catch((error) => {
        warnManifestLoad(error);
        galleryManifest = { projects: {}, brands: {} };
        return galleryManifest;
      });
  }

  return galleryManifestPromise;
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

const setDialogField = (element, value) => {
  if (!element) {
    return;
  }

  const hasValue = Boolean(value);
  element.textContent = value || "";
  element.hidden = !hasValue;
};

const syncDialogGallery = () => {
  if (!dialogGallery) {
    return;
  }

  const visibleItems = [...dialogGallery.children].filter(
    (item) => !item.classList.contains("is-missing")
  );

  dialogGallery.hidden = visibleItems.length === 0;
  dialogGallery.classList.toggle("dialog-gallery--single", visibleItems.length === 1);

  if (dialogGalleryEmpty) {
    dialogGalleryEmpty.hidden = visibleItems.length > 0;
  }
};

const resetDialogScroll = () => {
  dialog?.scrollTo?.(0, 0);
  dialogShell?.scrollTo?.(0, 0);
  dialogContent?.scrollTo?.(0, 0);
};

const updateLightboxControls = () => {
  const disableControls = activeGalleryImages.length <= 1;

  if (lightboxPrev) {
    lightboxPrev.disabled = disableControls;
  }

  if (lightboxNext) {
    lightboxNext.disabled = disableControls;
  }
};

const showLightboxImage = (index) => {
  if (!lightboxImage || activeGalleryImages.length === 0) {
    return;
  }

  activeLightboxIndex = index;
  const item = activeGalleryImages[activeLightboxIndex];

  if (lightboxStage) {
    lightboxStage.scrollTop = 0;
    lightboxStage.scrollLeft = 0;
  }

  lightboxImage.removeAttribute("width");
  lightboxImage.removeAttribute("height");
  lightboxImage.src = item.src;
  lightboxImage.alt = item.alt;
  updateLightboxControls();
};

const openLightbox = (images, index) => {
  if (!lightbox || !images.length) {
    console.warn("[gallery] No valid image available for the lightbox.");
    return;
  }

  activeGalleryImages = images;
  lightbox.hidden = false;
  lightbox.classList.add("is-open");

  requestAnimationFrame(() => {
    showLightboxImage(index);
  });
};

const closeLightbox = () => {
  if (!lightbox) {
    return;
  }
  lightbox.classList.remove("is-open");
  lightbox.hidden = true;
};

const stepLightbox = (direction) => {
  if (activeGalleryImages.length <= 1) {
    return;
  }

  const nextIndex =
    (activeLightboxIndex + direction + activeGalleryImages.length) %
    activeGalleryImages.length;

  showLightboxImage(nextIndex);
};

const createDialogMedia = (item, index, galleryItems) => {
  const figure = document.createElement("figure");
  figure.className = "dialog-media";

  const button = document.createElement("button");
  button.className = "dialog-media-button";
  button.type = "button";
  button.setAttribute("aria-label", `Open ${item.alt} in larger view`);

  const image = document.createElement("img");
  image.src = item.src;
  image.alt = item.alt;
  image.loading = "lazy";

  button.addEventListener("click", () => {
    openLightbox(galleryItems, index);
  });

  button.append(image);
  figure.append(button);
  return figure;
};

const renderDialogImages = async (trigger) => {
  if (!dialogGallery) {
    return;
  }

  dialogGallery.innerHTML = "";
  if (dialogGalleryEmpty) {
    dialogGalleryEmpty.hidden = true;
  }

  const galleryType = trigger.dataset.galleryType || "project";
  const galleryKey = trigger.dataset.galleryKey || "";
  const entry = await getGalleryEntry(galleryType, galleryKey);

  if (!entry) {
    console.warn(`[gallery] Missing manifest entry for ${galleryType}:${galleryKey}.`);
    syncDialogGallery();
    return;
  }

  const imageList = Array.isArray(entry.images) ? entry.images : [];
  const title = trigger.dataset.project || "Project";

  const loadedImages = await Promise.all(
    imageList.map((src, index) =>
      preloadImage(src, `${galleryType}:${galleryKey}:${index + 1}`).then((result) => {
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

  const galleryItems = loadedImages.filter(Boolean);

  if (galleryItems.length === 0) {
    console.warn(`[gallery] No loadable images found for ${galleryType}:${galleryKey}.`);
    syncDialogGallery();
    return;
  }

  galleryItems.forEach((item, index) => {
    const media = createDialogMedia(item, index, galleryItems);
    dialogGallery.append(media);
  });

  syncDialogGallery();
};

const openDialog = async (trigger) => {
  if (!dialog || !trigger) {
    return;
  }

  const modalType = trigger.dataset.modalType || "case-study";
  const summary =
    modalType === "brand"
      ? trigger.dataset.summary || "Selected collaboration and campaign reference."
      : trigger.dataset.summary || "";
  const copy = modalType === "brand" ? "" : trigger.dataset.caseStudy || "";

  setDialogField(dialogTitle, trigger.dataset.project || "");
  setDialogField(dialogYear, trigger.dataset.year || "");
  setDialogField(dialogRole, trigger.dataset.role || "");
  setDialogField(dialogSummary, summary);
  setDialogField(dialogCopy, copy);

  await renderDialogImages(trigger);

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    requestAnimationFrame(() => {
      resetDialogScroll();
    });
    return;
  }

  dialog.setAttribute("open", "open");
  requestAnimationFrame(() => {
    resetDialogScroll();
  });
};

const closeDialog = () => {
  if (!dialog) {
    return;
  }

  if (typeof dialog.close === "function") {
    dialog.close();
    return;
  }

  dialog.removeAttribute("open");
};

modalTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    openDialog(trigger);
  });
});

if (dialogClose && dialog) {
  dialogClose.addEventListener("click", closeDialog);

  dialog.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    const isOutsideDialog =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;

    if (isOutsideDialog) {
      closeDialog();
    }
  });
}

if (lightboxClose && lightbox) {
  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrev?.addEventListener("click", () => stepLightbox(-1));
  lightboxNext?.addEventListener("click", () => stepLightbox(1));

  lightbox.addEventListener("click", (event) => {
    const bounds = lightbox.getBoundingClientRect();
    const isOutsideLightbox =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;

    if (isOutsideLightbox) {
      closeLightbox();
    }
  });
}

if (lightboxStage) {
  lightboxStage.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchCurrentX = touch.clientX;
      touchCurrentY = touch.clientY;
      touchMoved = false;
    },
    { passive: true }
  );

  lightboxStage.addEventListener(
    "touchmove",
    (event) => {
      const touch = event.touches[0];
      touchCurrentX = touch.clientX;
      touchCurrentY = touch.clientY;
      touchMoved = true;
    },
    { passive: true }
  );

  lightboxStage.addEventListener(
    "touchend",
    (event) => {
      const touch = event.changedTouches[0];
      const endX = touchCurrentX || touch.clientX;
      const endY = touchCurrentY || touch.clientY;
      const deltaX = endX - touchStartX;
      const deltaY = endY - touchStartY;

      if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) {
        const isTouchMode = window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 760;
        if (!isTouchMode || touchMoved) {
          return;
        }

        const viewportWidth = window.innerWidth;
        const tapX = touch.clientX;
        const leftZone = viewportWidth * 0.28;
        const rightZone = viewportWidth * 0.72;

        if (tapX <= leftZone && activeGalleryImages.length > 1) {
          stepLightbox(-1);
          return;
        }

        if (tapX >= rightZone && activeGalleryImages.length > 1) {
          stepLightbox(1);
          return;
        }

        closeLightbox();
        return;
      }

      if (deltaX < 0) {
        stepLightbox(1);
        return;
      }

      stepLightbox(-1);
    },
    { passive: true }
  );

  lightboxStage.addEventListener(
    "wheel",
    (event) => {
      if (window.matchMedia("(pointer: coarse)").matches || activeGalleryImages.length <= 1) {
        return;
      }

      const now = Date.now();
      const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY);

      if (!horizontalIntent || Math.abs(event.deltaX) < 42 || now - lastWheelNavigationTime < 420) {
        return;
      }

      lastWheelNavigationTime = now;

      if (event.deltaX > 0) {
        stepLightbox(1);
        return;
      }

      stepLightbox(-1);
    },
    { passive: true }
  );
}

document.addEventListener("keydown", (event) => {
  if (lightbox && !lightbox.hidden) {
    if (event.key === "Escape") {
      closeLightbox();
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

  if (event.key === "Escape" && dialog?.open) {
    closeDialog();
  }
});
