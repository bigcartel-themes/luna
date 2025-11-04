function processProduct(product) {
  window.bigcartel = window.bigcartel || {};
  window.bigcartel.product = product;
  if (product.has_option_groups) {
    setInitialProductOptionStatuses(product);
    $(".product_option_group").off('change.productOptions').on('change.productOptions',function() {
      $('#option').val(0);
      processAvailableDropdownOptions(product, $(this));
    });
    if ($('#option').val() > 0) {
      enableAddButton();
    }

    // Check navigation type to determine if polling is needed
    var navEntry = performance.getEntriesByType('navigation')[0];
    var isBackForward = navEntry && navEntry.type === 'back_forward';

    // Only poll on back/forward navigation (when browser may restore form values)
    if (isBackForward) {
      // Check if dropdowns are already selected (e.g., from browser back/forward cache)
      // and process them to set the hidden option field and enable the button
      // Use adaptive polling to handle different browser restoration speeds
      (function pollForRestoredDropdowns() {
        var startTime = Date.now();
        var maxWaitTime = 500;
        var pollInterval = 50;
        var attemptCount = 0;

        debugLog('Polling', 'Started at', startTime);

        function checkDropdowns() {
          attemptCount++;

          // Safety check: abort if dropdowns no longer exist in DOM
          var dropdowns = $(".product_option_group");
          if (dropdowns.length === 0) {
            debugLog('Polling', 'Aborted - dropdowns no longer in DOM');
            return;
          }

          var allSelected = true;
          var firstSelected = null;
          var hasAnyValue = false;

          dropdowns.each(function() {
            var currentVal = $(this).val();
            if (currentVal && currentVal != 0) {
              hasAnyValue = true;
              if (!firstSelected) {
                firstSelected = $(this);
              }
            } else {
              allSelected = false;
            }
          });

          var elapsed = Date.now() - startTime;
          debugLog('Polling', 'Check #' + attemptCount + ' at ' + elapsed + 'ms - allSelected:', allSelected, 'hasAnyValue:', hasAnyValue);

          // Process immediately if all dropdowns are populated
          if (allSelected && firstSelected) {
            debugLog('Polling', '[SUCCESS] All dropdowns populated! Processing after ' + elapsed + 'ms (' + attemptCount + ' checks)');
            processAvailableDropdownOptions(product, firstSelected);
            return;
          }

          // Continue polling if we haven't exceeded max wait time
          if (elapsed < maxWaitTime) {
            setTimeout(checkDropdowns, pollInterval);
          } else {
            debugLog('Polling', '[TIMEOUT] After ' + elapsed + 'ms (' + attemptCount + ' checks) - no values restored');
          }
        }

        // Start first check immediately
        checkDropdowns();
      })();
    }
  }
  if (typeof updateInventoryMessage === 'function') {
    updateInventoryMessage();
  }
  if ($('.product-option-select').length) {
    if (themeOptions.showSoldOutOptions === false) {
      $('option[disabled-type="sold-out"]').wrap('<span>');
    }
  }
  $('.reset-selection-button').off('click.productOptions').on('click.productOptions', function() {
    $('#option').val(0);
    $(this).hide();
    enableAddButton();
    $(".product_option_group option").each(function(index,element) {
      if (element.value > 0) {
        enableSelectOption($(element));
      }
    });
    setInitialProductOptionStatuses(product);
  })
}
function createCartesianProductOptions(product) {
  product_option_groups = [];
  for (ogIndex = 0; ogIndex < product.option_groups.length; ogIndex++) {
    product_option_group_group_values = [];
    for (ogvIndex = 0; ogvIndex < product.option_groups[ogIndex].values.length; ogvIndex++) {
      product_option_group_group_values.push(product.option_groups[ogIndex].values[ogvIndex].id);
    }
    product_option_groups.push(product_option_group_group_values);
  }
  var cartesian_options = cartesianProduct(product_option_groups);
  return cartesian_options;
}

function setInitialProductOptionStatuses(product) {
  product_option_group_values = [];
  for (ogIndex = 0; ogIndex < product.option_groups.length; ogIndex++) {
    for (ogvIndex = 0; ogvIndex < product.option_groups[ogIndex].values.length; ogvIndex++) {
      product_option_group_values.push(product.option_groups[ogIndex].values[ogvIndex].id);
    }
  }
  cartesian_options = createCartesianProductOptions(product);
  for (pogv = 0; pogv < product_option_group_values.length; pogv++) {
    var option_group_value_id = product_option_group_values[pogv];
    var product_iterator = 0;
    var num_sold_out = 0;
    var num_options = 0;
    for (co = 0; co < cartesian_options.length; co++) {
      if (cartesian_options[co].includes(option_group_value_id)) {
        product_option = findProductOptionByValueArray(product.options, cartesian_options[co]);
        if (product_option) {
          num_options++;
          if (product_option.sold_out) {
            num_sold_out++;
          }
        }
        product_iterator++;
      }
    }
    dropdown_select = $(".product_option_group option[value='" + option_group_value_id + "']");
    if (num_options === 0 || product_iterator === num_sold_out || num_options === num_sold_out) {
      if (num_options === 0) {
        disable_type = "unavailable";
      }
      if (product_iterator === num_sold_out || num_options === num_sold_out) {
        disable_type = "sold-out";
      }
      disableSelectOption(dropdown_select,disable_type);
    }
  }
}

function processAvailableDropdownOptions(product, changed_dropdown) {
  selected_values = getSelectedValues();
  num_selected = selected_values.count(function (item) {
    return item > 0;
  });
  allSelected = selected_values.every(isGreaterThanZero);
  num_option_groups = product.option_groups.length;
  changed_value = parseInt(changed_dropdown.val());
  selected_value = [];
  selected_value.push(changed_value);
  this_group_id = changed_dropdown.attr("data-group-id");
  $(".product_option_group").not(changed_dropdown).find('option').each(function(index,element) {
    if (element.value > 0) {
      enableSelectOption($(element));
    }
  });
  cartesian_options = createCartesianProductOptions(product);

  if (num_selected === 1 && num_option_groups > 1) {
    for (ogIndex = 0; ogIndex < product.option_groups.length; ogIndex++) {
      var option_group = product.option_groups[ogIndex];
      if (option_group.id != this_group_id) {
        for (ogvIndex = 0; ogvIndex < option_group.values.length; ogvIndex++) {
          var option_group_value = option_group.values[ogvIndex];
          option_group_value_array = [];
          option_group_value_array.push(changed_value);
          option_group_value_array.push(parseInt(option_group_value.id));
          var product_iterator = 0;
          var num_sold_out = 0;
          var num_options = 0;
          for (co = 0; co < cartesian_options.length; co++) {
            if (arrayContainsArray(cartesian_options[co], option_group_value_array)) {
              product_option = findProductOptionByValueArray(product.options, cartesian_options[co]);
              if (product_option) {
                num_options++;
                if (product_option.sold_out) {
                  num_sold_out++;
                }
              }
              product_iterator++;
            }
          }
          dropdown_select = $(".product_option_group option[value='" + option_group_value.id + "']");
          if (num_options === 0 || product_iterator === num_sold_out || num_options === num_sold_out) {
            if (num_options === 0) {
              disable_type = "unavailable";
            }
            if (product_iterator === num_sold_out || num_options === num_sold_out) {
              disable_type = "sold-out";
            }
            disableSelectOption(dropdown_select,disable_type);
          }
        }
      }
    }
  }
  if (num_selected === 2 && num_option_groups === 3) {
    $(".product_option_group").each(function(i, object) {
      if (object.value == 0) {
        unselected_group_id = parseInt($(object).attr("data-group-id"));
      }
    });
    for (ogIndex = 0; ogIndex < product.option_groups.length; ogIndex++) {
      option_group = product.option_groups[ogIndex];
      if (option_group.id != this_group_id) {
        for (ogvIndex = 0; ogvIndex < option_group.values.length; ogvIndex++) {
          option_group_value = option_group.values[ogvIndex];
          option_group_value_array = [];
          option_group_value_array.push(changed_value);
          option_group_value_array.push(parseInt(option_group_value.id));
          var product_iterator = 0;
          var num_sold_out = 0;
          var num_options = 0;
          for (co = 0; co < cartesian_options.length; co++) {
            if (arrayContainsArray(cartesian_options[co], option_group_value_array)) {
              product_option = findProductOptionByValueArray(product.options, cartesian_options[co]);
              if (product_option) {
                num_options++;
                if (product_option.sold_out) {
                  num_sold_out++;
                }
              }
              product_iterator++;
            }
          }
          if (option_group.id === unselected_group_id) {
            option_group_value_array = [];
            option_group_value_array.push(parseInt(option_group_value.id));
            for (svIndex = 0; svIndex < selected_values.length; svIndex++) {
              if (selected_values[svIndex] > 0) {
                option_group_value_array.push(selected_values[svIndex]);
              }
            }
            product_option = findProductOptionByValueArray(product.options, option_group_value_array);
            dropdown_select = $(".product_option_group option[value='" + option_group_value.id + "']");
            if (product_option) {
              if (product_option.sold_out) {
                disableSelectOption(dropdown_select,"sold-out");
              }
            }
            else {
              disableSelectOption(dropdown_select,"unavailable");
            }
          }
          dropdown_select = $(".product_option_group option[value='" + option_group_value.id + "']");
          if (num_options === 0 || product_iterator === num_sold_out || num_options === num_sold_out) {
            if (num_options === 0) {
              disable_type = "unavailable";
            }
            if (product_iterator === num_sold_out || num_options === num_sold_out) {
              disable_type = "sold-out";
            }
            disableSelectOption(dropdown_select,disable_type);
          }
        }
      }
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
    product_option = findProductOptionByValueArray(product.options, selected_values);
    if (product_option) {
      if (!product_option.sold_out && product_option.id > 0) {
        $('#option').val(product_option.id);
        enableAddButton(product_option.price);
        if (num_option_groups > 1) {
          $('.reset-selection-button').fadeIn('fast');
        }
      }
      else {
        disableAddButton("sold-out");
      }
    }
    else {
      disableAddButton("sold-out");
    }
  }
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
