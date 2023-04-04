function processProduct(product) {
  if (product.has_option_groups) {
    disableAddButton("add-to-cart");
    if (product.option_groups.length === 1) {
      disableSingleSoldOptions(product);
    }
    if (product.option_groups.length > 1) {
      findSoldOutOptionGroupValues(product);
    }
    $(".product_option_group").on('change',function() {
      disableAddButton("add-to-cart");
      $('#option').val(0);
      processAvailableDropdownOptions(product, $(this));
    });
    if ($('#option').val() > 0) {
      enableAddButton();
    }
  }
}

function processAvailableDropdownOptions(product, changed_dropdown) {
  selected_values = getSelectedValues();
  num_selected = selected_values.count(item => item > 0);
  allSelected = selected_values.every(isGreaterThanZero);
  num_option_groups = product.option_groups.length;
  selected_value = [];
  selected_value.push(parseInt(changed_dropdown.val()));
  this_group_id = changed_dropdown.attr("data-group-id");
  $(".product_option_group").not(changed_dropdown).find('option').each(function(index,element) {
    if (element.value > 0) {
      enableSelectOption($(element));
    }
  });
  if (num_selected < num_option_groups && num_option_groups > 1) {
    if (num_selected === 2 && num_option_groups === 3) {
      $(".product_option_group").each(function(index,element) {
        if (element.value == 0) {
          $(element).find('option').each(function(index2,element2) {
            if (element2.value > 0) {
              available_values = [];
              for (i = 0; i < selected_values.length; i++) {
                if (selected_values[i] > 0) {
                  available_values[i] = selected_values[i];
                }
              }
              available_values.push(parseInt(element2.value));
              found_options = buildProductOptionGroupValueArrays(product.options, available_values);
              if (found_options.length === 0) {
                disableSelectOption($(element2), "unavailable");
              }
              else {
                for (i = 0; i < found_options.length; i++) {
                  if (found_options[i].sold_out) {
                    disableSelectOption($(element2), "sold-out");
                  }
                }
              }
            }
          });
        }
      });
    }
    else {
      $(".product_option_group").not(changed_dropdown).each(function(index, second_dropdown) {
        second_dropdown = $(second_dropdown);
        second_dropdown.find('option').each(function(idx, second_dropdown_option) {
          is_selected = $(second_dropdown_option).is(":selected");
          if (!is_selected) {
            if (second_dropdown_option.value > 0) {
              third_dropdown = $(".product_option_group").not(changed_dropdown).not(second_dropdown);
              all_sold = true;
              if (third_dropdown.length > 0) {
                third_dropdown.find('option').each(function(idx2, third_dropdown_option) {
                  is_selected = $(third_dropdown_option).is(":selected");
                  if (!is_selected) {
                    if (third_dropdown_option.value > 0) {
                      option_group_value_array = [];
                      option_group_value_array.push(parseInt(changed_dropdown.val()));
                      option_group_value_array.push(parseInt(second_dropdown_option.value));
                      option_group_value_array.push(parseInt(third_dropdown_option.value));
                      product_option = findProductOptionByValueArray(product.options, option_group_value_array);
                      if (product_option) {
                        no_product = false;
                        if (!product_option.sold_out) {
                          all_sold = false;
                        }
                      }
                      else {
                        no_product = true;
                      }
                    }
                  }
                });
              }
              else {
                option_group_value_array = [];
                option_group_value_array.push(parseInt(changed_dropdown.val()));
                option_group_value_array.push(parseInt(second_dropdown_option.value));
                product_option = findProductOptionByValueArray(product.options, option_group_value_array);
                if (product_option) {
                  no_product = false;
                  if (!product_option.sold_out) {
                    all_sold = false;
                  }
                }
                else {
                  no_product = true;
                }
              }
              if (no_product) {
                disableSelectOption($(second_dropdown_option), "unavailable");
              }
              else {
                enableSelectOption($(second_dropdown_option));
              }
              if (all_sold) {
                disableSelectOption($(second_dropdown_option), "sold-out");
              }
              else {
                enableSelectOption($(second_dropdown_option));
              }
            }
          }
        });
      });
    }
  }
  if (num_selected > 1 && allSelected) {
    $(".product_option_group").not(changed_dropdown).each(function(index, dropdown) {
      dropdown = $(dropdown);
      dropdown.find('option').each(function(idx, option) {
        is_selected = $(option).is(":selected");
        if (!is_selected) {
          if (option.value > 0) {
            option_group_value_array = [];
            option_group_value_array.push(parseInt(option.value));
            $(".product_option_group").not(dropdown).each(function(index, secondary_dropdown) {
              option_group_value_array.push(parseInt(secondary_dropdown.value));
            });
            product_option = findProductOptionByValueArray(product.options, option_group_value_array);
            for (i = 0; i < option_group_value_array.length; i++) {
              dropdown_select = $(".product_option_group option[value='" + option_group_value_array[i] + "']").not(":selected");
              if (dropdown_select) {
                if (product_option) {
                  if (product_option.sold_out) {
                    disableSelectOption(dropdown_select,"sold-out");
                  }
                  else {
                    enableSelectOption(dropdown_select);
                  }
                }
                else {
                  disableSelectOption(dropdown_select,"unavailable");
                }
              }
            }
          }
        }
      });
    });
  }
  if (allSelected) {
    processAddToCartButton(product.options, selected_values);
  }
}

function findOptionGroupName(option_groups, group_id) {
  for (var OGIndex = 0; OGIndex < option_groups.length; OGIndex ++) {
    if (option_groups[OGIndex].id === group_id) {
      return option_groups[OGIndex].name;
    }
  }
}

function buildProductOptionGroupValueArrays(product_options, option_group_values) {
  matching_options = [];
  for (var POIndex = 0; POIndex < product_options.length; POIndex ++) {
    group_values = product_options[POIndex].option_group_values;
    match_values = [];
    for (var GVIndex = 0; GVIndex < group_values.length; GVIndex ++) {
      match_values.push(parseInt(group_values[GVIndex].id));
    }
    option_group_values = option_group_values.filter(function(val) {
      return val !== 0;
    });
    if (arrayContainsArray(match_values, option_group_values)) {
      matching_options.push(product_options[POIndex]);
    }
  }
  return matching_options;
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
        disableSelectOption($(".product_option_group option[value='" + product_option_group_value_id + "']"),"sold-out");
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
      if (option_group_value) {
        if (option_group_value.id === product_option_group_value_id) {
          if (!product_options[productOptionsIndex].sold_out) {
            all_sold_out = false;
          }
        }
      }

    }
  };
  return all_sold_out;
}

function processAddToCartButton(product_options, option_group_values) {
  product_option = findProductOptionByValueArray(product_options, option_group_values);
  if (product_option) {
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
            disableSelectOption($(select_option),"sold-out");
          }
        }
        else {
          disableSelectOption($(select_option),"unavailable");
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

function findProductOptionByValueArray(product_options, value_array) {
  for (var productOptionsIndex = 0; productOptionsIndex < product_options.length; productOptionsIndex ++) {
    option_group_values = product_options[productOptionsIndex].option_group_values;
    option_ids = [];
    option_group_values.forEach(function(option_group_value) {
      option_ids.push(option_group_value.id);
    });
    if (arrayContainsArray(option_ids, value_array)) {
      return product_options[productOptionsIndex];
    }
  };
}

function getSelectedValues() {
  selected_values = [];
  $(".product_option_group").each(function(i, object) {
    selected_values.push(parseInt(object.value));
  });
  return selected_values;
};
