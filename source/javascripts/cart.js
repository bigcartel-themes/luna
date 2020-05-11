$('body')
  .on( 'click', '.remove-item-button', function(e) {
    e.preventDefault();
    item_id = $(this).closest('.cart-item').data("item-id");
    new_val = 0;
    Cart.updateItem(item_id, new_val, function(cart) {
      processUpdate('', item_id, '', cart);
    });
  })
  .on('blur','.option-quantity', function(e) {
    item_id = $(this).closest('.cart-item').data("item-id");
    new_val = $(this).val();
    input = $(this);
    Cart.updateItem(item_id, new_val, function(cart) {
      processUpdate(input, item_id, new_val, cart);
    });
  })


var processUpdate = function(input, item_id, new_val, cart) {
  var sub_total = Format.money(cart.total, true, true);
  var item_count = cart.item_count;

  $('.cart-subtotal-amount').fadeOut(300, function() {
    $('.cart-subtotal-amount').html(sub_total);
    $('.cart-subtotal-amount').fadeIn(300);
  });

  if (item_count == 0) {
    $('.cart-form').slideUp('fast',function() {
      $('.cart-container').addClass('empty-cart');
      $('html, body').animate({ scrollTop: 0 }, "fast");
    });
  }
  else {
    $('.errors').hide();
    if (input) {
      input.val(new_val);
    }
  }
  if (new_val > 0) {
    for (itemIndex = 0; itemIndex < cart.items.length; itemIndex++) {
      if (cart.items[itemIndex].id == item_id) {
        item_price = cart.items[itemIndex].price;
        formatted_item_price = Format.money(item_price, true, true);
        $('.cart-item[data-item-id="'+item_id+'"]').find('.cart-item-details-price').html(formatted_item_price)
      }
    }

  }
  else {
    $('.cart-item[data-item-id="'+item_id+'"]').slideUp('fast');
  }
  return false;
}