const productSlideshowContainer = document.querySelector('.product-carousel');

if (productSlideshowContainer) {
  let desktopSplide = false;
  const slideshowClassNames = ['desktop-carousel', 'desktop-thumbnails', 'desktop-carousel_thumbs'];
  if (productSlideshowContainer && slideshowClassNames.some(className => productSlideshowContainer.parentElement.classList.contains(className))) {
    desktopSplide = true;
  }

  var splide = new Splide('.product-carousel', {
    rewind: false,
    keyboard: true,
    arrows: desktopSplide,
    type: themeOptions.desktopProductPageImages == 'carousel' ? 'loop' : 'fade',
    pagination: false,
    lazyLoad: 'sequential',
    mediaQuery: 'min',
    breakpoints: {
      767: {
        destroy: !desktopSplide,
        pagination: false,
      },
    }
  });

  const thumbnails = document.getElementsByClassName('product-thumbnails--item');
  let current;

  for (let i = 0; i < thumbnails.length; i++) {
    initThumbnail(thumbnails[i], i);
  }

  function initThumbnail(thumbnail, index) {
    thumbnail.addEventListener('click', function () {
      splide.go(index);
    });
  }
  splide.on('resize', function () {
    updateSlideContainer();
  });
  splide.on('mounted move', function () {

    updateSlideContainer();

    const thumbContainer = document.querySelector('.product-thumbnails--list');
    const scrollContainer = document.querySelector('.product-thumbnails--inner');
    const halfWidth = Math.ceil(thumbContainer.getBoundingClientRect().width / 2);
    const scrollWidth = Math.ceil(thumbContainer.scrollWidth);

    const thumbnail = thumbnails[splide.index];
    const offsetLeft = (thumbnail.offsetLeft);
    if (offsetLeft > halfWidth) {
      scrollContainer.scrollTo({ left: offsetLeft - halfWidth, behavior: 'smooth' });
    }
    if (offsetLeft < halfWidth) {
      scrollContainer.scrollTo({ left: offsetLeft - halfWidth, behavior: 'smooth' });
    }
    if (thumbnail) {
      if (current) {
        current.classList.remove('is-active');
        thumbnail.removeAttribute('aria-current');
      }
      thumbnail.setAttribute('aria-current', 'true');
      thumbnail.classList.add('is-active');
      current = thumbnail;
    }
  });
  splide.mount();
}
const thumbScrollers = document.querySelectorAll('.thumb-scroller');
thumbScrollers.forEach(thumbScroller => {
  thumbScroller.addEventListener('click', function () {
    const scrollContainer = document.querySelector('.product-thumbnails--inner');
    const containerWidth = scrollContainer.getBoundingClientRect().width;
    let scrollLeft = Math.ceil(scrollContainer.scrollLeft);
    const scrollDirection = this.dataset.direction;
    let scrollPosition;
    if (scrollDirection === 'left') {
      scrollPosition = scrollLeft - containerWidth;
    }
    if (scrollDirection === 'right') {
      scrollPosition = scrollLeft + containerWidth;
    }
    scrollContainer.scrollTo({ left: scrollPosition, behavior: 'smooth' });
  });
});

function updateSlideContainer() {
  const thumbContainer = document.querySelector('.product-thumbnails--list');
  const displayWidth = Math.ceil(thumbContainer.getBoundingClientRect().width);
  const scrollWidth = Math.ceil(thumbContainer.scrollWidth);
  const thumbScrollers = document.querySelectorAll('.thumb-scroller');
  const currentSlideSpans = document.querySelectorAll('.current-slide-number');
  if (scrollWidth > displayWidth) {
    thumbContainer.classList.add('is-overflow');
    thumbScrollers.forEach(thumbScroller => {
      thumbScroller.classList.remove('hidden');
    });
  }
  else {
    thumbContainer.classList.remove('is-overflow');
    thumbScrollers.forEach(thumbScroller => {
      thumbScroller.classList.add('hidden');
    });
  }
  currentSlideSpans.forEach(currentSlideSpan => {
    currentSlideSpan.textContent = `${splide.index + 1}`;
  });
}

const previousSlideButton = document.querySelector('.previous-slide');
const nextSlideButton = document.querySelector('.next-slide');
previousSlideButton.addEventListener('click', function () {
  splide.go(splide.index - 1);
});
nextSlideButton.addEventListener('click', function () {
  splide.go(splide.index + 1);
});