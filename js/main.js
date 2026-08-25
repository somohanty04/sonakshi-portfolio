// Typewriter effect for the home hero (matches the original Wix site:
// cycles through designer / researcher / strategist)
(function () {
  const el = document.getElementById("typewriter-text");
  if (!el) return;

  const words = ["designer.", "researcher.", "strategist."];
  let wordIdx = 0;
  let charIdx = 0;
  let deleting = false;

  function tick() {
    const word = words[wordIdx];

    if (!deleting) {
      charIdx++;
      el.textContent = word.slice(0, charIdx);
      if (charIdx === word.length) {
        deleting = true;
        setTimeout(tick, 1600);
        return;
      }
      setTimeout(tick, 140);
    } else {
      charIdx--;
      el.textContent = word.slice(0, charIdx);
      if (charIdx === 0) {
        deleting = false;
        wordIdx = (wordIdx + 1) % words.length;
        setTimeout(tick, 350);
        return;
      }
      setTimeout(tick, 70);
    }
  }

  tick();
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
