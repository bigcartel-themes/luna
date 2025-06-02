$('body')
  .on( 'click', '.remove-item-button', function(e) {
    e.preventDefault();
    item_id = $(this).closest('.cart-item').data("item-id");
    new_val = 0;
    Cart.updateItem(item_id, new_val, function(cart) {
      processUpdate('', item_id, '', cart);
    });
  })
  .on('change','.option-quantity', function(e) {
    item_id = $(this).closest('.cart-item').data("item-id");
    new_val = $(this).val();
    input = $(this);
    Cart.updateItem(item_id, new_val, function(cart) {
      processUpdate(input, item_id, new_val, cart);
    });
  })
  .on('keydown','.option-quantity', function(e) {
    if (e.keyCode == 13) {
      item_id = $(this).closest('.cart-item').data("item-id");
      new_val = $(this).val();
      input = $(this);
      Cart.updateItem(item_id, new_val, function(cart) {
        processUpdate(input, item_id, new_val, cart);
      });
      e.preventDefault();
      return false;
    }
  });

const shouldUseWebShare = () => {
  const hasShareApi = 'share' in navigator;
  
  const isMobileUserAgentData = 'userAgentData' in navigator && navigator.userAgentData.mobile;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(navigator.userAgent);
  
  return hasShareApi && (isMobileUserAgentData || isIOS || isAndroid);
};

document.querySelector('.copy-cart-link')?.addEventListener('click', async (event) => {
  event.preventDefault();
  const link = event.currentTarget;
  const originalText = link.textContent;
  const text = link.dataset.clipboardText;

  if (shouldUseWebShare()) {
    try {
      await navigator.share({
        title: 'Check out this cart I saved',
        url: text
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn('Share failed:', error);
      }
    }
  } else {
    try {
      await navigator.clipboard.writeText(text);
      link.textContent = themeTranslations?.cart?.shareThisCartLinkCopySuccess || 'Link copied!';
      setTimeout(() => {
        link.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.warn('Clipboard copy failed:', error);
    }
  }
});

function updateShareableLink() {
  fetch('/cart/shareable_link.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (!data?.shareable_link) {
        throw new Error('Invalid response format');
      }
      const linkElement = document.querySelector('.copy-cart-link');
      if (linkElement) {
        linkElement.href = data.shareable_link;
        linkElement.dataset.clipboardText = data.shareable_link;
      }
    })
    .catch(error => {
      console.warn('Failed to update shareable cart link:', error);
      const linkElement = document.querySelector('.copy-cart-link');
      if (linkElement) {
        linkElement.style.display = 'none';
      }
    });
}

var processUpdate = function(input, item_id, new_val, cart) {
  var sub_total = strip_tags(formatMoney(cart.total, true, true));
  var item_count = cart.item_count;

  $('.cart-subtotal-amount').fadeOut(100, function() {
    $('.cart-subtotal-amount').html(sub_total);
    $('.cart-num-items').html(item_count);
    $('.cart-subtotal-amount').fadeIn(500);
  });

  updateShareableLink();

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
        formatted_item_price = strip_tags(formatMoney(item_price, true, true));
        item_price_element = $('.cart-item[data-item-id="'+item_id+'"]').find('.cart-item-details-price');
        item_price_element.fadeOut(100, function() {
          item_price_element.html(formatted_item_price);
          item_price_element.fadeIn(500);
        });
      }
    }

    showBnplMessaging(cart.total, { alignment: 'center', displayMode: 'flex', pageType: 'cart' });
  }
  else {
    $('.cart-item[data-item-id="'+item_id+'"]').slideUp('fast');
  }
  return false;
}

function strip_tags(string) {
  new_string = string.replace(/<(.|\n)*?>/g, '');
  return new_string;
}

document.addEventListener('DOMContentLoaded', () => {
  const isCartPage = document.body.getAttribute('data-bc-page-type') === 'cart';
  if (isCartPage) {
    Cart.refresh((cart) => {
      if (cart?.total) {
        showBnplMessaging(cart.total, { alignment: 'center', displayMode: 'flex', pageType: 'cart' });
      }
    });
  }
});