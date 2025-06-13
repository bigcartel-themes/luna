
function camelCaseToDash(string) {
  return string.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

var isGreaterThanZero = function (currentValue) {
  return currentValue > 0;
};

function arrayContainsArray(superset, subset) {
  if (0 === subset.length) {
    return false;
  }
  return subset.every(function (value) {
    return superset.indexOf(value) >= 0;
  });
}

function unique(item, index, array) {
  return array.indexOf(item) == index;
}

function cartesianProduct(a) {
  var i,
    j,
    l,
    m,
    a1,
    o = [];
  if (!a || a.length == 0) return a;
  a1 = a.splice(0, 1)[0];
  a = cartesianProduct(a);
  for (i = 0, l = a1.length; i < l; i++) {
    if (a && a.length) for (j = 0, m = a.length; j < m; j++) o.push([a1[i]].concat(a[j]));
    else o.push([a1[i]]);
  }
  return o;
}

Array.prototype.equals = function (array) {
  if (!array) return false;
  if (this.length != array.length) return false;
  for (var i = 0, l = this.length; i < l; i++) {
    if (this[i] instanceof Array && array[i] instanceof Array) {
      if (!this[i].equals(array[i])) return false;
    } else if (this[i] != array[i]) {
      return false;
    }
  }
  return true;
};

// From https://github.com/kevlatus/polyfill-array-includes/blob/master/array-includes.js
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, "includes", {
    value: function (searchElement, fromIndex) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }
      var o = Object(this);
      var len = o.length >>> 0;
      if (len === 0) {
        return false;
      }
      var n = fromIndex | 0;
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
      function sameValueZero(x, y) {
        return x === y || (typeof x === "number" && typeof y === "number" && isNaN(x) && isNaN(y));
      }
      while (k < len) {
        if (sameValueZero(o[k], searchElement)) {
          return true;
        }
        k++;
      }
      return false;
    },
  });
}

function getRandomIndex(elements) {
  return Math.floor(Math.random() * elements.length);
}

Array.prototype.count = function (filterMethod) {
  return this.reduce(function (count, item) {
    return filterMethod(item) ? count + 1 : count;
  }, 0);
};

/**
 * Format a number as currency based on the shop's settings
 * 
 * @param {number} amount - The amount to format
 * @param {boolean} [withDelimiter=true] - Whether to include thousands delimiter (ignored, kept for compatibility)
 * @param {boolean} [withSign=true] - Whether to include currency symbol
 * @param {boolean} [withCode=false] - Whether to include currency code
 * @returns {string} Formatted currency string
 */
function formatMoney(amount, withDelimiter = true, withSign = true, withCode = false) {
  const currency = window.bigcartel?.account?.currency || 'USD';
  const locale = navigator.language || 'en-US';
  const moneyFormat = window.bigcartel?.account?.moneyFormat || 'sign';
  
  switch (moneyFormat) {
    case 'sign':
      withSign = true;
      withCode = false;
      break;
    case 'code':
      withSign = false;
      withCode = true;
      break;
    case 'none':
      withSign = false;
      withCode = false;
      break;
    default:
      withSign = true;
      withCode = false;
  }
  
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  });
  
  let result;
  
  if (withSign) {
    result = currencyFormatter.format(amount);
  } else {
    const formatParts = currencyFormatter.formatToParts(amount);
    const fractionPart = formatParts.find(part => part.type === 'fraction');
    
    const decimalFormatter = new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: fractionPart ? fractionPart.value.length : 0,
      maximumFractionDigits: fractionPart ? fractionPart.value.length : 0
    });
    
    result = decimalFormatter.format(amount);
  }
  
  if (withCode) {
    result += ' <span class="currency_code">' + currency + '</span>';
  }
  
  return result;
}