/* Good Enough Garage Doors — vanilla JS: mobile nav, footer price reveal,
   sticky CTA hide-on-footer, and progressive form UX. No dependencies. */
(function () {
  "use strict";

  // ---- mobile nav toggle ----
  var header = document.getElementById("siteHeader");
  var toggle = document.getElementById("navToggle");
  if (header && toggle) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    // close the menu when a link is tapped
    header.querySelectorAll(".nav__links a").forEach(function (a) {
      a.addEventListener("click", function () {
        header.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ---- footer price reveal (accessible, degrades to visible w/o JS) ----
  var pBtn = document.getElementById("priceToggle");
  var pPanel = document.getElementById("pricePanel");
  if (pBtn && pPanel) {
    pBtn.addEventListener("click", function () {
      var open = pPanel.hasAttribute("hidden");
      if (open) { pPanel.removeAttribute("hidden"); } else { pPanel.setAttribute("hidden", ""); }
      pBtn.setAttribute("aria-expanded", open ? "true" : "false");
      pBtn.lastChild && (pBtn.childNodes[pBtn.childNodes.length - 1].nodeType === 3
        ? (pBtn.childNodes[pBtn.childNodes.length - 1].nodeValue = open ? " Hide spring prices" : " See our spring prices")
        : null);
    });
  }

  // ---- hide sticky CTA when the footer is in view (avoid covering footer CTAs) ----
  var sticky = document.querySelector(".sticky-cta");
  var foot = document.querySelector(".site-footer");
  if (sticky && foot && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        sticky.style.transform = e.isIntersecting ? "translateY(120%)" : "translateY(0)";
      });
    }, { rootMargin: "0px 0px -40% 0px" }).observe(foot);
  }

  // ---- light client-side form guard (honeypot + required) ----
  document.querySelectorAll("form[action='/form-handler.php']").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      var hp = form.querySelector(".hp");
      if (hp && hp.value) { e.preventDefault(); return; } // bot filled honeypot
      var btn = form.querySelector("button[type=submit]");
      if (btn) { btn.disabled = true; btn.style.opacity = ".7"; btn.textContent = "Sending…"; }
    });
  });
})();
