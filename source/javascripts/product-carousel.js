var productSlideshowContainer = document.querySelector('.product-carousel');

if (productSlideshowContainer) {
  var splide = new Splide( '.product-carousel', {
    rewind: false,
    keyboard: true,
    arrows: true,
    pagination: true,
  });

  var thumbnails = document.getElementsByClassName( 'product-thumbnails--item' );
  var current;

  for ( var i = 0; i < thumbnails.length; i++ ) {
    initThumbnail( thumbnails[ i ], i );
  }

  function initThumbnail( thumbnail, index ) {
    thumbnail.addEventListener('click', function () {
      splide.go( index );
    });
  }

  splide.on( 'mounted move', function () {
    let thumbContainer = document.querySelector('.product-thumbnails--list');
    let displayWidth = Math.ceil(thumbContainer.getBoundingClientRect().width);
    let scrollWidth = Math.ceil(thumbContainer.scrollWidth);

    if (scrollWidth > displayWidth) {
      thumbContainer.classList.add('is-overflow');
    }
    else {
      thumbContainer.classList.remove('is-overflow');
    }

    var thumbnail = thumbnails[ splide.index ];

    if (thumbnail) {
      if (current) {
        current.classList.remove('is-active');
      }
      thumbnail.classList.add('is-active');
      current = thumbnail;
    }
  });

  splide.mount();
}
