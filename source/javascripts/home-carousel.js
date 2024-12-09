const homeSlideshow = document.querySelector(".splide.home-slideshow");
if (homeSlideshow) {
  var homeSplide = new Splide('.splide.home-slideshow', {
    rewind: true,
    keyboard: true,
    arrows: true,
    type: 'loop',
    pagination: true,
    lazyLoad: 'sequential',
    autoplay: themeOptions.homepageSlideshowAutoplay,
    interval: themeOptions.homepageSlideshowSpeed,
    speed: 1500
  });
  homeSplide.mount();
}