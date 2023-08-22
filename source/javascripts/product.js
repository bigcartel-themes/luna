if (themeOptions.productImageZoom === 'true') {
  var lightbox = new PhotoSwipeLightbox({
    gallery: '.splide__list',
    children: '.splide__slide:not(.splide__slide--clone) a',
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