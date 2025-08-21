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