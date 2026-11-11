// Typewriter effect for the home hero: types "product designer." once and stops.
(function () {
  const el = document.getElementById("typewriter-text");
  if (!el) return;

  const word = "product designer.";
  const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    el.textContent = word;
    return;
  }

  let charIdx = 0;
  function tick() {
    charIdx++;
    el.textContent = word.slice(0, charIdx);
    if (charIdx < word.length) setTimeout(tick, 110);
  }

  setTimeout(tick, 400);
})();

// Mobile nav toggle
(function () {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => nav.classList.toggle("open"));
})();

// Contact form (front-end only)
(function () {
  const form = document.querySelector(".contact-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    form.reset();
    const note = form.querySelector(".form-note");
    if (note) note.style.display = "block";
  });
})();
