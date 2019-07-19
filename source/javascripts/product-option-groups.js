function processProduct(product) {
  if (product.has_option_groups) {
    disableAddButton();

    if (product.option_groups.length === 1) {
      disableSingleSoldOptions(product);
    }
    if (product.option_groups.length > 1) {
      findSoldOutOptionGroupValues(product);
    }

    $('.product_option_group').on('change',function() {
      disableAddButton();
      $('#option').val(0);
      processAvailableDropdownOptions(product);
    });
  }
}

function processAvailableDropdownOptions(product) {
  selected_values = getSelectedValues();
  num_selected = selected_values.count(item => item > 0);
  allSelected = selected_values.every(isGreaterThanZero);
  num_option_groups = product.option_groups.length;
  if (allSelected) {
    processAddToCartButton(product.options, selected_values);
  }
}


function findSoldOutOptionGroupValues(product) {
  product_option_groups = product.option_groups;
  for (var POGIndex = 0; POGIndex < product_option_groups.length; POGIndex ++) {
    product_option_group_values = product_option_groups[POGIndex].values;
    for (var POGVIndex = 0; POGVIndex < product_option_group_values.length; POGVIndex ++) {
      product_option_group_value = product_option_group_values[POGVIndex];
      product_option_group_value_id = product_option_group_value.id
      is_sold_out = checkIfAllValuesAreSoldOut(product.options,product_option_group_value_id);
      if (is_sold_out) {
        disableSelectOption($('.product_option_group').find('option[value="' + product_option_group_value_id + '"]'));
      }
    }
  };
}

function checkIfAllValuesAreSoldOut(product_options, product_option_group_value_id) {
  all_sold_out = true;
  for (var productOptionsIndex = 0; productOptionsIndex < product_options.length; productOptionsIndex ++) {
    option_group_values = product_options[productOptionsIndex].option_group_values;
    for (var OptionGroupValuesIndex = 0; OptionGroupValuesIndex < option_group_values.length; OptionGroupValuesIndex ++) {
      option_group_value = option_group_values[OptionGroupValuesIndex];
      if (option_group_value.id === product_option_group_value_id) {
        if (!product_options[productOptionsIndex].sold_out) {
          all_sold_out = false;
        }
      }
    }
  };
  return all_sold_out;
}

function processAddToCartButton(product_options, selected_values) {
  product_option = findProductOptionBySelectedValues(product_options, selected_values);
  if (product_option) {
    matching_price = product_option.price;
    sold_out = product_option.sold_out;
    if (!sold_out && product_option.id > 0) {
      $('#option').val(product_option.id);
      enableAddButton(product_option.price);
    }
    else {
      disableAddButton("sold-out");
    }
  }
  else {
    disableAddButton("sold-out");
  }
}

function disableSingleSoldOptions(product) {
  product_options = product.options;
  product_option_groups = product.option_groups;
  for (var POGIndex = 0; POGIndex < product_option_groups.length; POGIndex ++) {
    product_option_group = product_option_groups[POGIndex];
    select = $(".product_option_group[name='option_group[" + product_option_group.id + "]']");
    select.find('option').each(function(index,select_option) {
      if (select_option.value > 0) {
        matching_option = findProductOptionBySingleValue(product_options, select_option.value);
        if (matching_option) {
          if (matching_option.sold_out) {
            disableSelectOption($(select_option));
          }
        }
        else {
          $(select_option).remove();
        }
      }
    });
  };
}

function findProductOptionBySingleValue(product_options, value) {
  for (var POIndex = 0; POIndex < product_options.length; POIndex ++) {
    group_values = product_options[POIndex].option_group_values;
    for (var GVIndex = 0; GVIndex < group_values.length; GVIndex ++) {
      group_value = group_values[GVIndex];
      if (group_value.id == value) {
        return product_options[POIndex];
      }
    };
  };
}

function findProductOptionBySelectedValues(product_options, selected_values) {
  for (var productOptionsIndex = 0; productOptionsIndex < product_options.length; productOptionsIndex ++) {
    option_group_values = product_options[productOptionsIndex].option_group_values;
    option_ids = [];
    option_group_values.forEach(function(option_group_value) {
      option_ids.push(option_group_value.id);
    });
    if (option_ids.equals(selected_values)) {
      return product_options[productOptionsIndex];
    }
  };
}

function getSelectedValues() {
  selected_values = [];
  $('.product_option_group').each(function(i, object) {
    selected_values.push(object.value);
  });
  return selected_values;
};