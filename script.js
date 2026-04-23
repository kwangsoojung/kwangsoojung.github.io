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
const dialogGallery = document.getElementById("dialog-gallery");
const dialogClose = document.querySelector(".dialog-close");
const modalTriggers = document.querySelectorAll(".case-study-trigger, .brand-trigger");

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

setImageFallback(portraitImage, portraitMedia);

projectCovers.forEach((image) => {
  setImageFallback(image, image.closest(".media-surface"));
});

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
};

const createDialogMedia = (src, alt) => {
  const figure = document.createElement("figure");
  figure.className = "dialog-media is-missing";

  if (!src) {
    return figure;
  }

  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;
  image.loading = "lazy";

  image.addEventListener("load", () => {
    figure.classList.remove("is-missing");
    syncDialogGallery();
  });

  image.addEventListener("error", () => {
    figure.classList.add("is-missing");
    syncDialogGallery();
  });

  figure.append(image);
  return figure;
};

const renderDialogImages = (trigger) => {
  if (!dialogGallery) {
    return;
  }

  dialogGallery.innerHTML = "";

  // Update these data-image paths in index.html when you add final assets.
  const images = [trigger.dataset.imageOne, trigger.dataset.imageTwo].filter(Boolean);

  images.forEach((src, index) => {
    const title = trigger.dataset.project || "Project";
    const media = createDialogMedia(src, `${title} image ${index + 1}`);
    dialogGallery.append(media);
  });

  syncDialogGallery();
};

const openDialog = (trigger) => {
  if (!dialog || !trigger) {
    return;
  }

  const modalType = trigger.dataset.modalType || "case-study";
  const summary =
    modalType === "brand"
      ? trigger.dataset.summary || "Selected collaboration reference."
      : trigger.dataset.summary || "";
  const copy = modalType === "brand" ? "" : trigger.dataset.caseStudy || "";

  setDialogField(dialogTitle, trigger.dataset.project || "");
  setDialogField(dialogYear, trigger.dataset.year || "");
  setDialogField(dialogRole, trigger.dataset.role || "");
  setDialogField(dialogSummary, summary);
  setDialogField(dialogCopy, copy);
  renderDialogImages(trigger);

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }

  dialog.setAttribute("open", "open");
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
  trigger.addEventListener("click", () => openDialog(trigger));
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && dialog?.open) {
    closeDialog();
  }
});
