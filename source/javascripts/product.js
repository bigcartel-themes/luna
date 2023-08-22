if (themeOptions.productImageZoom === 'true') {
  let carouselImages = document.querySelector('.splide__list');
  let galleryElement = '.product-images';
  let galleryChildren = '.gallery-link';
  if (carouselImages) {
    galleryElement = '.splide__list';
    galleryChildren = '.splide__slide:not(.splide__slide--clone) a'
  }
  var lightbox = new PhotoSwipeLightbox({
    gallery: galleryElement,
    children: galleryChildren,
    loop: true,
    showHideAnimationType: 'fade',
    paddingFn: (viewportSize) => {
      let paddingVal = 100;
      if (viewportSize.x < 768) {
        paddingVal = 16;
      }
      return {
        top: paddingVal,
        bottom: paddingVal,
        left: paddingVal,
        right: paddingVal
      };
    },
    bgOpacity: 1,
    pswpModule: PhotoSwipe
  });
  lightbox.init();
}