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

    // Set up the update cart button to activate after cart-option selection is made
    
    if(page == 'cart') {
      
      var cartForm = $('#cart-form');
      
      $('#checkout-btn').click(function(event) {
        event.preventDefault();
        cartForm.append('<input type="hidden" name="checkout" value="1">').submit();
      });
      
      $('.remove_item').click(function(event) {
        event.preventDefault();
        $(this).closest('li').find('.quantity_input input').val(0);
        cartForm.submit();
      });
      
      $('#country, #cart_discount_code').change(function(event) {
        $('#update-btn-footer').removeClass('disabled');
      });
    }

    // Set up search toggle on click
    
    if(options.showSearch) {
      $('#search a').click(function(event) {
        event.preventDefault();
        $('#search input').show().focus();
        $(this).hide();
      });

      $('#search input').blur(function(event) {
        event.preventDefault();
        $(this).hide();
        $('#search a').show();
      });
    }
  }
};
