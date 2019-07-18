
function processProduct(product) {
  if (product.has_option_groups) {
    disableAddButton();
    if (product.option_groups.length == 1) {
      disableSingleSoldOptions(product);
    }

    $('.product_option_group').on('change',function() {
      disableAddButton();
      $('#option').val(0);
    });
  }
}

function disableSingleSoldOptions(product) {
  var product_options = product.options;
  var product_option_groups = product.option_groups;
  for (var POGIndex = 0; POGIndex < product_option_groups.length; POGIndex ++) {
    var product_option_group = product_option_groups[POGIndex];
    var select = $(".product_option_group[name='option_group[" + product_option_group.id + "]']");
    var sold_text = select.attr("data-sold-text");
    select.find('option').each(function(index,element) {
      if (element.value > 0) {
        var matching_option = findProductOptionBySingleValue(product_options, element.value);
        if (matching_option.sold_out) {
          $(element).attr("disabled",true);
          $(element).text(element.text + ' ' + sold_text);
        }
      }
    });
  };
}

function findProductOptionBySingleValue(product_options, value) {
  for (var POIndex = 0; POIndex < product_options.length; POIndex ++) {
    var group_values = product_options[POIndex].option_group_values;
    for (var GVIndex = 0; GVIndex < group_values.length; GVIndex ++) {
      var group_value = group_values[GVIndex];
      if (group_value.id == value) {
        return product_options[POIndex];
      }
    };
  };
}