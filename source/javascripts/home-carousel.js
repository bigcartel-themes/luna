const homeSlideshow = document.querySelector(".home-slideshow");
if (homeSlideshow) {
  var homeSplide = new Splide('.home-slideshow', {
    rewind: true,
    keyboard: true,
    arrows: true,
    type: 'loop',
    pagination: true,
    lazyLoad: 'sequential',
  });
  homeSplide.mount();
}