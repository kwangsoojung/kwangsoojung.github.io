const siteNav = document.querySelector(".site-nav");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".nav-menu a");
const sections = document.querySelectorAll("main section[id]");
const yearTarget = document.getElementById("current-year");

const dialog = document.getElementById("case-study-dialog");
const dialogTitle = document.getElementById("dialog-title");
const dialogYear = document.getElementById("dialog-year");
const dialogRole = document.getElementById("dialog-role");
const dialogSummary = document.getElementById("dialog-summary");
const dialogCopy = document.getElementById("dialog-copy");
const dialogClose = document.querySelector(".dialog-close");
const caseStudyTriggers = document.querySelectorAll(".case-study-trigger");

if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

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

caseStudyTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => {
    if (!dialog) {
      return;
    }

    dialogTitle.textContent = trigger.dataset.project || "";
    dialogYear.textContent = trigger.dataset.year || "";
    dialogRole.textContent = trigger.dataset.role || "";
    dialogSummary.textContent = trigger.dataset.summary || "";
    dialogCopy.textContent = trigger.dataset.caseStudy || "";
    dialog.showModal();
  });
});

if (dialogClose && dialog) {
  dialogClose.addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    const isOutsideDialog =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;

    if (isOutsideDialog) {
      dialog.close();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && dialog?.open) {
    dialog.close();
  }
});
