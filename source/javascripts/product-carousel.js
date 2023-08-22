const productSlideshowContainer = document.querySelector('.product-carousel');

if (productSlideshowContainer) {
  let desktopSplide = false;
  const slideshowClassNames = ['desktop-carousel', 'desktop-thumbnails', 'desktop-carousel_thumbs'];
  if (productSlideshowContainer && slideshowClassNames.some(className => productSlideshowContainer.parentElement.classList.contains(className))) {
    desktopSplide = true;
  }

  var splide = new Splide('.product-carousel', {
    rewind: true,
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

  let thumbnails = document.getElementsByClassName('product-thumbnails--item');
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
    const halfWidth = Math.round(thumbContainer.getBoundingClientRect().width / 2);

    const thumbnail = thumbnails[splide.index];
    const offsetLeft = (thumbnail.offsetLeft);
    if (offsetLeft > halfWidth) {
      thumbContainer.scrollTo({ left: offsetLeft - halfWidth, behavior: 'smooth' });
    }
    if (offsetLeft < halfWidth) {
      thumbContainer.scrollTo({ left: offsetLeft - halfWidth, behavior: 'smooth' });
    }
    if (thumbnail) {
      if (current) {
        current.classList.remove('is-active');
        current.removeAttribute('aria-current');
      }

      thumbnail.classList.add('is-active');
      current = thumbnail;
      thumbnail.setAttribute('aria-current', 'true');
    }
  });
  splide.mount();
}
const thumbScrollers = document.querySelectorAll('.thumb-scroller');
const thumbContainer = document.querySelector('.product-thumbnails--list');
thumbScrollers.forEach(thumbScroller => {
  thumbScroller.addEventListener('click', function () {
    const containerWidth = thumbContainer.getBoundingClientRect().width;
    const scrollLeft = Math.round(thumbContainer.scrollLeft);
    const scrollDirection = this.dataset.direction;
    let scrollPosition;
    if (scrollDirection === 'left') {
      scrollPosition = scrollLeft - containerWidth;
    }
    if (scrollDirection === 'right') {
      scrollPosition = scrollLeft + containerWidth;
    }
    thumbContainer.scrollTo({ left: scrollPosition, behavior: 'smooth' });
  });
});
thumbContainer?.addEventListener('scroll', function () {
  let scrollLeft = this.scrollLeft;
  const firstThumbnailWidth = document.getElementsByClassName('product-thumbnails--item')[1].offsetLeft;
  const scrollWidth = Math.round(this.scrollWidth);
  const displayWidth = Math.round(this.getBoundingClientRect().width);
  const scrollRight = scrollWidth - displayWidth;

  if (scrollLeft < firstThumbnailWidth) {
    document.querySelector('.thumb-scroller--left').setAttribute('disabled', 'true');
  }
  else {
    document.querySelector('.thumb-scroller--left').removeAttribute('disabled');
  }
  if (scrollLeft >= scrollRight) {
    document.querySelector('.thumb-scroller--right').setAttribute('disabled', 'true');
  }
  else {
    document.querySelector('.thumb-scroller--right').removeAttribute('disabled');
  }
});

function updateSlideContainer() {
  const thumbContainer = document.querySelector('.product-thumbnails--list');
  const displayWidth = Math.round(thumbContainer.getBoundingClientRect().width);
  const scrollWidth = Math.round(thumbContainer.scrollWidth);
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
previousSlideButton?.addEventListener('click', function () {
  splide.go(splide.index - 1);
});
nextSlideButton?.addEventListener('click', function () {
  splide.go(splide.index + 1);
});