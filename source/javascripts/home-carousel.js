const homeSlideshow = document.querySelector(".splide.home-slideshow");
if (homeSlideshow) {
  var homeSplide = new Splide('.splide.home-slideshow', {
    rewind: true,
    keyboard: true,
    arrows: true,
    type: 'loop',
    pagination: true,
    lazyLoad: 'sequential',
  });
  homeSplide.mount();
}