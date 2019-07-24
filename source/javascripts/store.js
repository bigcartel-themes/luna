
var inPreview = (/\/admin\/design/.test(top.location.pathname));

var isGreaterThanZero = function(currentValue) {
  return currentValue > 0;
}

function array_includes(k) {
  for(var i=0; i < this.length; i++){
    if( this[i] === k || ( this[i] !== this[i] && k !== k ) ){
      return true;
    }
  }
  return false;
}

function unique(item, index, array) {
  return array.indexOf(item) == index;
}

Array.prototype.equals = function (array) {
  if (!array)
    return false;
  if (this.length != array.length)
    return false;
  for (var i = 0, l=this.length; i < l; i++) {
    if (this[i] instanceof Array && array[i] instanceof Array) {
      if (!this[i].equals(array[i]))
        return false;
    }
    else if (this[i] != array[i]) {
      return false;
    }
  }
  return true;
}

Array.prototype.count = function(filterMethod) {
  return this.reduce((count, item) => filterMethod(item)? count + 1 : count, 0);
}

function stripHtml(html) {
  var tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash;
};

function setCookie(name,value,days) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + (days*24*60*60*1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}

function eraseCookie(name) {
  document.cookie = name+'=; Max-Age=-99999999;';
}
function getRandomIndex(elements) {
  return Math.floor(Math.random() * elements.length);
}

if ($('.announcement-message-text').length) {
  var announcementMessage = $('.announcement-message-text').html();
  var hashedMessage = announcementMessage.hashCode();
  var cookieValue = getCookie('hide-announcement-message');
  if (cookieValue) {
    if (cookieValue != hashedMessage) {
      $('body').addClass('has-announcement-message');
    }
  }
  else {
    $('body').addClass('has-announcement-message');
  }
}

$('.announcement-message-close').click(function(e) {
  $('.announcement-message').slideUp('fast', function() {
    $('body').removeClass('has-announcement-message');
    setCookie('hide-announcement-message',hashedMessage,7);
  });
})

$(document).ready(function() {
  if ($('.all-similar-products').length) {
    var num_products = $('.all-similar-products > a').length;
    var elements = $('.all-similar-products').children().toArray();
    var num_to_display = 3;
    for (var i=1; i<=num_to_display; i++) {
      var randomIndex = getRandomIndex(elements);
      $('.similar-product-list').append($('.all-similar-products').children().eq(randomIndex));
      elements.splice(randomIndex, 1);
      $('.similar-product-list .similar-product-list-image').each(function() {
        $(this).attr("src",$(this).data("src"));
      })
    }
    $('.all-similar-products').remove();
  }
});


$('.home-slideshow').flexslider({
  animation: "slide"
});
$('.flexslider').on('touchmove', function (e) { e.stopPropagation(); });
var width = $(window).width();

if ($('.product-images-slideshow').length && width <= 768 && !inPreview) {
  $('.product-images-slideshow').addClass('flexslider');
  $('.product-images-slideshow').flexslider({
    animation: 'slide',
    animationLoop: false,
    controlsContainer: 'canvas',
    directionNav: false
  });
}

$('.open-search').click(function(e) {
  e.preventDefault();
  $('.search-input').show().focus();
  $(this).hide();
});

$('.search-input').blur(function(event) {
  event.preventDefault();
  $(this).hide();
  $('.open-search').show();
});

$('.cart-item-remove').click(function(e) {
  $(this).closest('li').find('input.option-quantity').val(0).closest('form').submit();
  return false;
});

$('.option-quantity').on('change',function(){
  $(this).closest('form').submit();
  return false;
});

if ($('.product_option_select').length) {
  $('.add-to-cart-button').attr("disabled",true);
}
$('.product_option_select').on('change',function() {
  var option_price = $(this).find("option:selected").attr("data-price");
  enableAddButton(option_price);
});
var enableAddButton = function(updated_price) {
  var addButton = $('.add-to-cart-button');
  var addButtonTitle = addButton.attr('data-add-title');
  addButton.attr("disabled",false);
  addButton.html(addButtonTitle + ' - ' + Format.money(updated_price, true, true));
}

var disableAddButton = function(type) {
  var addButton = $('.add-to-cart-button');
  var addButtonTitle = addButton.attr('data-add-title');
  if (type == "sold-out") {
    var addButtonTitle = addButton.attr('data-sold-title');
  }
  if (!addButton.is(":disabled")) {
    addButton.attr("disabled","disabled");
  }
  addButton.html(addButtonTitle);
}

var enableSelectOption = function(select_option) {
  select_option.removeAttr("disabled");
  select_option.text(select_option.attr("data-name"));
}
var disableSelectOption = function(select_option) {
  var sold_text = select_option.parent().attr("data-sold-text");
  if (select_option.val() > 0) {
    var name = select_option.attr("data-name");
    select_option.attr("disabled",true);
    select_option.text(name + ' ' + sold_text);
  }
}
