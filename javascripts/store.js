var Store = {
  
  defaults: {
    cutoffWidth: 768
  },
  
  init: function(page, options) {
    var win = $(window);
    var width = $(document).width();
    
    options = $.extend(this.defaults, options);

    // Resize store name on resize

    win.on('resize', function() {
      $('#store_name').quickfit({ max: 42, min: 26, truncate: false });
    }).trigger('resize');

    // Set the viewport content width to 720 for iPad

    if(width == options.cutoffWidth) {
      $('meta[name=viewport]').attr({ content: 'width=720' });  
    }

    // Vertically center product thumbnails

    $('.product_thumb').each(function() {
      $(this).children('img').load(function() {
        var imgHeight = $(this).height();
        var imgHeightDiff = (280 - imgHeight) / 2;

        if(imgHeight < 280 && width > 480) {
          $(this).css({ position: 'relative', top: imgHeightDiff });  
        }
      });
    });

    // Set the slideshow for Products if viewport is less than cutoffWidth

    if(page == 'product' && width <= options.cutoffWidth) {
      $('#product_images').flexslider({
        animation: 'slide',
        animationLoop: false, 
        controlsContainer: 'canvas',
        directionNav: false
      });
    }

    // Position the cart sidebar to top of container
    // Set up the update cart button to activate after cart-option selection is made
    
    if(page == 'cart') {
      win.on('resize', function() {
        var topOffset = $('#cart_items').height();

        if(width <= options.cutoffWidth) {
          $('#cart_summary').css({ position: 'relative', top: '0' });  
        } else if(options.shippingEnabled || options.discountEnabled) {    
          $('#cart_summary').css({ position: 'relative', top: -(topOffset + 1) });
        };    
      }).trigger('resize');
      
      $('#country, #cart_discount_code').change(function(event) {
        $('#update-btn-footer').removeClass('disabled');
      });
    }

    // Set up search toggle on click
    
    if(options.showSearch) {
      $('#search a').click(function() {
        $('#search input').show().focus();
        $(this).hide();
        return false;
      });

      $('#search input').blur(function() {
        $(this).hide();
        $('#search a').show();
        return false;
      });
    }
  }
};
