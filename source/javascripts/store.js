"use strict";

document.addEventListener("DOMContentLoaded", function () {
  document.body.classList.remove("preloader");
  let contactFields = document.querySelectorAll(".contact-form input, .contact-form textarea");
  contactFields.forEach(function (contactField) {
    contactField.removeAttribute("tabindex");
  });
  const numShades = 5;

  let cssProperties = [];

  for (const themeColor in themeColors) {
    const hexValue = themeColors[themeColor];
    var hsl = tinycolor(hexValue).toHsl();
    for (var i = numShades - 1; i >= 0; i -= 1) {
      hsl.l = (i + 0.5) / numShades;
      cssProperties.push(`--${camelCaseToDash(themeColor)}-${((i * 100) / 1000) * 200}: ${tinycolor(hsl).toRgbString()};`);
    }
    numColor = tinycolor(hexValue).toRgb();
    cssProperties.push(`--${camelCaseToDash(themeColor)}-rgb: ${numColor["r"]}, ${numColor["g"]}, ${numColor["b"]};`);
  }

  const headTag = document.getElementsByTagName("head")[0];
  const styleTag = document.createElement("style");

  styleTag.innerHTML = `
    :root {
      ${cssProperties.join("\n")}
    }
  `;
  headTag.appendChild(styleTag);

  // Make slideshow clickable if homepageSlideshowLink is configured
  const isHomePage = document.body.getAttribute('data-bc-page-type') === 'home';
  const slideshowLink = themeOptions.homepageSlideshowLink && themeOptions.homepageSlideshowLink.trim() !== '' ? themeOptions.homepageSlideshowLink : null;
  if (isHomePage && slideshowLink) {
    const slideshow = document.querySelector(".home-slideshow");
    if (slideshow) {
      const slides = slideshow.querySelectorAll('.splide__slide');
      
      // Add styling and accessibility attributes to individual slides
      slides.forEach(slide => {
        slide.classList.add("slideshow-clickable");
        slide.setAttribute("role", "button");
        slide.setAttribute("aria-label", "Navigate to " + slideshowLink);
      });
      
      // Use single event delegation listener on slideshow container
      slideshow.addEventListener("click", function(event) {
        // Find the clicked slide using event delegation
        const clickedSlide = event.target.closest('.splide__slide');
        
        // Only handle clicks on slides, not on controls
        if (clickedSlide && !event.target.closest('.splide__arrow, .splide__pagination')) {
          event.preventDefault();
          event.stopPropagation();
          if (isExternalLink(slideshowLink)) {
            window.open(slideshowLink, '_blank', 'noopener,noreferrer');
          } else {
            window.location.href = slideshowLink;
          }
        }
      });
    }
  }
});

window.addEventListener("load", () => {
  document.body.classList.remove("transition-preloader");
});

// Hybrid announcement pause: hover on desktop, tap-to-toggle on mobile, focus for keyboard
document.addEventListener('DOMContentLoaded', () => {
  const announcement = document.querySelector('.announcement-message--scrolling');

  if (!announcement) return;

  const scrollContent = announcement.querySelector('.announcement-message__scroll-content');
  const firstText = announcement.querySelector('.announcement-message__text');

  // Calculate exact scroll distance for seamless looping
  function updateScrollDistance() {
    if (scrollContent && firstText) {
      // Get the width of one text block including its spacing
      const textWidth = firstText.offsetWidth;

      // Set CSS variable with exact pixel distance to scroll
      // This ensures perfectly seamless looping regardless of content length
      scrollContent.style.setProperty('--scroll-distance', `-${textWidth}px`);
    }
  }

  // Initial calculation
  updateScrollDistance();

  // Recalculate on resize (debounced to avoid performance issues)
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateScrollDistance, 150);
  });

  // Add tap-to-toggle for all devices (primarily for touch devices)
  // Desktop users can still use hover (handled by CSS), but click also works as backup
  let isPaused = false;

  announcement.addEventListener('click', (e) => {
    // Don't toggle if user clicked a link - let the link work normally
    if (e.target.closest('a')) return;

    // Toggle pause state
    isPaused = !isPaused;
    announcement.classList.toggle('is-paused', isPaused);
  });
});
