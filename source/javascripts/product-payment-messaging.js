/**
 * BNPL Payment Messaging Module
 *
 * Handles detection and display of Buy Now Pay Later messaging for Stripe and PayPal
 * on Product and Cart pages
 *
 * Key functionality:
 * - Renders appropriate messaging based on product price
 * - Custom visibility detection logic for Stripe since it lacks a built-in method
 * - Adapts styling to match shop theme for Stripe, but only when Paypal isn't shown due to
 *   their limitations
 * - Updates messaging when price changes
 * - Supports forced re-rendering for responsive alignment changes
 *
 * Usage:
 * // On product page:
 * showBnplMessaging(product.price, { alignment: 'left', pageType: 'product' });
 *
 * // On cart page:
 * showBnplMessaging(cart.total, { alignment: 'center', displayMode: 'flex', pageType: 'cart' });
 *
 * // Force re-render (e.g., for responsive alignment change):
 * showBnplMessaging(product.price, { alignment: 'center', forceRender: true, pageType: 'product' });
 *
 */

/**
 * Configuration settings
 */
const PAYMENT_CONFIG = {
  SUPPORTED_PROCESSORS: {
    stripe: {
      elementId: 'payment-method-messaging-element',
      containerId: 'stripe-messaging-container',
      paymentMethodTypes: ['klarna', 'afterpay_clearpay', 'affirm'],
      heightThresholds: {
        minVisibleHeight: 16
      },
      timeouts: {
        render: 2000,
        heightCheck: 300
      },
      detection: {
        maxWaitTime: 5000,
        pollInterval: 100,
        minRetries: 3
      }
    },
    paypal: {
      elementId: 'paypal-messaging-element',
      containerId: 'paypal-messaging-container',
      timeouts: {
        render: 2000
      },
      pageTypes: {
        product: 'product-details',
        cart: 'cart',
        default: 'product-details'
      }
    }
  },
  DEFAULT_COLORS: {
    background: '#FFFFFF',
    text: '#000000'
  },
  DEFAULT_ALIGNMENT: 'left',
  PARENT_CONTAINER: {
    containerId: 'payment-processor-messaging',
    defaultDisplayMode: 'block',
    heightCaptureDelay: 500 // Wait for SDK iframes to finish rendering and layout
  }
};

/**
 * Optimization state tracking
 * These variables help prevent layout shifts by:
 * - Tracking maximum container heights (prevents collapse during re-renders)
 * - Caching last rendered price (skips unnecessary re-renders)
 * - Debouncing rapid updates (prevents flicker)
 * - Tracking viewport width (resets heights on significant resize)
 * - Tracking last parent container height (prevents layout shift on browser back)
 */
let maxPaypalHeight = 0;
let maxStripeHeight = 0;
let lastRenderedPrice = null;
let updateTimeout = null;
let lastViewportWidth = window.innerWidth;
let resizeTimeout = null;

/**
 * Navigation type detection
 * Detects if current page load is from back/forward navigation.
 *
 * Critical for layout shift prevention: browsers restore cached DOM on back/forward
 * but third-party SDK iframes (Stripe, PayPal) don't restore their rendered content.
 * This creates a temporary collapse until SDKs re-render, causing layout shift.
 *
 * By detecting back/forward navigation, we can pre-reserve space using the cached
 * height from before navigation, eliminating the layout shift.
 *
 * Note: This flag is set once at page load and remains constant for the page lifetime.
 * It is NOT reset after renders - see comment at end of renderBnplMessaging() for details.
 */
var isBackForwardNavigation = false;
try {
  var navEntry = performance.getEntriesByType('navigation')[0];
  isBackForwardNavigation = !!(navEntry && navEntry.type === 'back_forward');
} catch (e) {
  // Performance API not available or failed
  isBackForwardNavigation = false;
}

/**
 * Retrieve last parent container height from sessionStorage for layout shift prevention.
 *
 * Why sessionStorage?
 * - Persists across back/forward navigation within the same tab
 * - Automatically cleared when tab is closed (no stale data across sessions)
 * - Provides the exact height from before navigation
 *
 * Why page-specific keys?
 * - Product and cart pages may have different messaging layouts/heights
 * - Prevents cart page heights from overwriting product page heights
 *
 * Lifecycle:
 * - Saved after each successful render (see heightCaptureDelay timeout)
 * - Retrieved on back/forward navigation (below)
 * - Cleared on fresh navigations to prevent stale data from different products
 */
var lastParentContainerHeight = 0;
var currentPageType = document.body.getAttribute('data-bc-page-type') || 'unknown';
try {
  if (isBackForwardNavigation && currentPageType !== 'unknown') {
    // On back/forward, use stored height from previous render of this page type
    var storageKey = 'bnplParentHeight_' + currentPageType;
    var stored = sessionStorage.getItem(storageKey);
    if (stored) {
      lastParentContainerHeight = parseInt(stored, 10) || 0;
    }
  } else if (currentPageType !== 'unknown') {
    // On fresh navigation (navigate, reload), clear stale height for this page type
    var storageKey = 'bnplParentHeight_' + currentPageType;
    sessionStorage.removeItem(storageKey);
    lastParentContainerHeight = 0;
  }
} catch (e) {
  // sessionStorage not available
  lastParentContainerHeight = 0;
}

/**
 * Helper functions
 */

/**
 * Validates and normalizes a price value
 * @param {number|string} price - Price to validate
 * @returns {number|null} Validated price or null if invalid
 */
function validatePrice(price) {
  const isValidNumber = (val) => typeof val === 'number' && val > 0 && !isNaN(val);
  const numericPrice = Number(price);
  
  if (isValidNumber(numericPrice)) return numericPrice;
  
  const defaultPrice = window.bigcartel?.product?.default_price;
  return isValidNumber(defaultPrice) ? defaultPrice : null;
}

/**
 * Calculates relative luminance from a hex color
 * Uses the formula from WCAG 2.0
 * @param {string} bgColor - Background color hex
 * @returns {number} Luminance value (0-1)
 */
function calculateLuminance(bgColor) {
  const hex = bgColor.replace('#', '');
  const [r, g, b] = [0, 2, 4]
    .map(offset => parseInt(hex.substring(offset, offset + 2), 16) / 255)
    .map(value => value <= 0.03928 
      ? value / 12.92 
      : Math.pow((value + 0.055) / 1.055, 2.4));

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Determines text color mode based on background brightness
 * @param {string} backgroundColor - Background color in hex format
 * @param {string} processor - Payment processor name
 * @returns {string} Appropriate color mode for the processor
 */
function getTextColorMode(backgroundColor, processor) {
  const luminance = calculateLuminance(backgroundColor);
  const isLightBackground = luminance > 0.5;

  // Different processors use different color mode naming
  switch (processor.toLowerCase()) {
    case 'paypal':
      return isLightBackground ? 'black' : 'white';
    case 'stripe':
      return isLightBackground ? 'light' : 'dark';
    default:
      return isLightBackground ? 'light' : 'dark';
  }
}

/**
 * Gets the appropriate text color for Stripe elements
 * @param {string} backgroundColor - Background color in hex
 * @returns {string} Text color in hex
 */
function getStripeTextColors(backgroundColor) {
  const luminance = calculateLuminance(backgroundColor);
  const isLightBackground = luminance > 0.5;

  // Use standard colors with PayPal for consistency
  if (isPaypalPresent()) {
    return isLightBackground ? '#000000' : '#FFFFFF';
  } else {
    return themeColors?.primaryTextColor || PAYMENT_CONFIG.DEFAULT_COLORS.text;
  }
}

/**
 * Gets the appropriate background color for Stripe elements
 * @param {string} backgroundColor - Background color in hex
 * @returns {string} Background color in hex
 */
function getStripeBackgroundColors(backgroundColor) {
  const luminance = calculateLuminance(backgroundColor);
  const isLightBackground = luminance > 0.5;

  // Use standard colors with PayPal for consistency
  if (isPaypalPresent()) {
    return isLightBackground ? '#FFFFFF' : '#000000';
  } else {
    return backgroundColor || PAYMENT_CONFIG.DEFAULT_COLORS.background;
  }
}

/**
 * Gets Stripe appearance options with configurable text alignment
 * @param {string} backgroundColor - Background color in hex
 * @param {string} alignment - Text alignment value ('left', 'center', 'right')
 * @returns {Object} Stripe appearance configuration
 */
function getStripeAppearanceOptions(backgroundColor, alignment = 'left') {
  const fontConfig = getCustomFontConfig();
  const fonts = fontConfig.cssSrc ? [{ cssSrc: fontConfig.cssSrc }] : [];
  const fontFamily = fontConfig.family ? `${fontConfig.family}, system-ui, sans-serif` : 'system-ui, sans-serif';

  return {
    fonts,
    appearance: {
      variables: {
        colorText: getStripeTextColors(backgroundColor),
        colorBackground: getStripeBackgroundColors(backgroundColor),
        logoColor: getTextColorMode(backgroundColor, 'stripe'),
        fontFamily,
        fontSizeBase: '16px',
        fontSizeSm: '15px'
      },
      rules: { '.PaymentMethodMessaging': { textAlign: alignment } }
    }
  };
}

/**
 * Gets font configuration for payment elements
 * Custom fonts are only used for Stripe when PayPal isn't present
 * @returns {Object} Font configuration with cssSrc and family properties
 */
function getCustomFontConfig() {
  if (isPaypalPresent()) {
    return { cssSrc: null, family: null };
  }
  
  const fontData = window.bigcartel?.theme?.fonts?.primary_text_font;
  return {
    cssSrc: fontData?.url || null,
    family: fontData?.name || null
  };
}

/**
 * Checks if PayPal is available for the shop
 * @returns {boolean} Whether PayPal is configured
 */
function isPaypalPresent() {
  return window.bigcartel?.checkout?.paypal_merchant_id && typeof PayPalSDK !== 'undefined';
}

/**
 * Waits for content to appear with a polling approach
 * @param {Function} checkFn - Function that returns true when content is found
 * @param {Object} options - Configuration options
 * @param {number} options.maxWaitTime - Maximum time to wait in ms
 * @param {number} options.pollInterval - How often to check in ms
 * @param {number} options.minRetries - Minimum number of retries to perform
 * @param {string} options.context - Context identifier for logging
 * @returns {Promise<boolean>} Whether content was found
 */
async function waitForContent(checkFn, options = {}) {
  const maxWaitTime = options.maxWaitTime || 2000;
  const pollInterval = options.pollInterval || 200;
  const minRetries = options.minRetries || 0;
  const context = options.context || 'Content';
  
  // Calculate how many attempts we'll make
  const maxAttempts = Math.max(minRetries, Math.ceil(maxWaitTime / pollInterval));
  let attempts = 0;
  
  // Start time for logging
  const startTime = Date.now();
  let contentFound = false;
  
  while (attempts < maxAttempts) {
    // Check if content is available
    const result = await checkFn();
    if (result) {
      contentFound = true;
      
      // If we've met our minimum retry count, exit early
      if (attempts >= minRetries) {
        break;
      }
    }
    
    // If this is the last attempt, don't wait anymore
    if (attempts === maxAttempts - 1) {
      break;
    }
    
    // Wait for the next interval
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    attempts++;
  }

  if (!contentFound) {
    const elapsedTime = Date.now() - startTime;
    console.warn(`[BNPL] ${context} content detection timed out after ${elapsedTime}ms (${attempts + 1} attempts)`);
  }

  return contentFound;
}

/**
 * Core functions
 */

/**
 * Wrapper function for BNPL messaging with optimization
 * Handles price caching and debouncing to prevent layout shifts
 * @param {number} price - Product price
 * @param {Object} options - Optional configuration
 * @param {string} options.alignment - Text alignment for messaging ('left', 'center', 'right')
 * @param {string} options.displayMode - Display mode for parent container ('block', 'flex', etc.)
 * @param {string} options.pageType - Page type for PayPal messaging ('product', 'cart')
 * @param {boolean} options.forceRender - Force re-render even if price unchanged (e.g., for responsive alignment changes)
 */
async function showBnplMessaging(price = null, options = {}) {
  if (!themeOptions.showBnplMessaging) {
    return;
  }

  // Validate price early
  const finalPrice = validatePrice(price);
  if (!finalPrice) {
    console.error('[BNPL] Invalid price:', price);
    return;
  }

  // Get parent container to check visibility state
  const parentContainer = document.getElementById(PAYMENT_CONFIG.PARENT_CONTAINER.containerId);
  if (!parentContainer) {
    return;
  }

  // Check if this is an update or initial render
  const isParentVisible =
    parentContainer.style.position === 'static' &&
    !parentContainer.classList.contains('hidden') &&
    parentContainer.style.left === 'auto' &&
    parentContainer.style.top === 'auto';

  // Price caching: Skip re-render if price unchanged and messaging already visible,
  // unless forceRender is explicitly requested (e.g., for responsive alignment changes).
  //
  // Exception: Always re-render on back/forward navigation even if price matches,
  // because browser restores DOM but not SDK iframe content, requiring fresh SDK render.
  if (lastRenderedPrice === finalPrice && isParentVisible && !options.forceRender && !isBackForwardNavigation) {
    debugLog('BNPL', 'Skipping re-render - price unchanged ($' + finalPrice + ') and already visible');
    return; // Same price, already showing - skip re-render
  }

  // Debouncing: For updates, delay to prevent rapid sequential re-renders
  if (isParentVisible) {
    debugLog('BNPL', 'Debouncing update for price $' + finalPrice + ' (100ms delay)');
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      renderBnplMessaging(finalPrice, options);
    }, 100);
  } else {
    // No debounce for initial page load
    debugLog('BNPL', 'Initial render for price $' + finalPrice);
    renderBnplMessaging(finalPrice, options);
  }
}

/**
 * Renders Buy Now Pay Later messaging (internal implementation)
 * This is the actual rendering logic, called by showBnplMessaging wrapper
 * @param {number} price - Product price (already validated)
 * @param {Object} options - Optional configuration
 * @param {string} options.alignment - Text alignment for messaging ('left', 'center', 'right')
 * @param {string} options.displayMode - Display mode for parent container ('block', 'flex', etc.')
 * @param {string} options.pageType - Page type for PayPal messaging ('product', 'cart')
 * @param {boolean} options.forceRender - Force re-render flag (handled in wrapper, not used here)
 */
async function renderBnplMessaging(price, options = {}) {
  if (!themeOptions.showBnplMessaging) {
    return;
  }

  // Get container elements
  const parentContainer = document.getElementById(PAYMENT_CONFIG.PARENT_CONTAINER.containerId);
  const stripeContainer = document.getElementById(PAYMENT_CONFIG.SUPPORTED_PROCESSORS.stripe.containerId);
  const paypalContainer = document.getElementById(PAYMENT_CONFIG.SUPPORTED_PROCESSORS.paypal.containerId);

  if (!parentContainer || !stripeContainer || !paypalContainer) {
    return;
  }

  // On back/forward navigation, reserve space immediately to prevent layout shift.
  // Browsers restore the DOM but not SDK-rendered iframe content, causing the container
  // to collapse momentarily while SDKs re-render. Pre-allocating the last known height
  // prevents the page from shifting during this re-render period.
  debugLog('BNPL', 'isBackForwardNavigation:', isBackForwardNavigation, 'lastParentContainerHeight:', lastParentContainerHeight);
  if (isBackForwardNavigation && lastParentContainerHeight > 0) {
    parentContainer.style.minHeight = `${lastParentContainerHeight}px`;
    debugLog('BNPL', 'Reserved', lastParentContainerHeight, 'px for back/forward navigation');
  } else if (isBackForwardNavigation) {
    debugLog('BNPL', 'Cannot reserve space - no previous height captured');
  }

  const finalPrice = price; // Already validated by wrapper

  const colors = {
    // Some themes have a content background color so we prioritize that to ensure we are using the correct 
    // background color for the messaging
    backgroundColor: themeColors?.contentBackgroundColor || themeColors?.backgroundColor || PAYMENT_CONFIG.DEFAULT_COLORS.background,
    primaryTextColor: themeColors?.primaryTextColor || PAYMENT_CONFIG.DEFAULT_COLORS.text
  };

  // Use provided alignment or fall back to default
  const alignment = options.alignment || PAYMENT_CONFIG.DEFAULT_ALIGNMENT;
  
  // Get the pageType value from options or use default
  const pageTypeKey = options.pageType || 'default';
  const pageType = PAYMENT_CONFIG.SUPPORTED_PROCESSORS.paypal.pageTypes[pageTypeKey] || 
                    PAYMENT_CONFIG.SUPPORTED_PROCESSORS.paypal.pageTypes.default;
  
  // Handle display mode via CSS classes
  const displayClass = options.displayMode ? `display-${options.displayMode}` : '';
  
  // Remove any existing display classes
  const displayClassPattern = /\bdisplay-\S+/g;
  parentContainer.className = parentContainer.className.replace(displayClassPattern, '');

  const isStripeVisible = stripeContainer.style.height === 'auto' && stripeContainer.style.overflow === 'visible';
  const isPaypalVisible = paypalContainer.style.height === 'auto' && paypalContainer.style.overflow === 'visible';
  const isParentVisible = 
    parentContainer.style.position === 'static' && 
    !parentContainer.classList.contains('hidden') &&
    parentContainer.style.left === 'auto' &&
    parentContainer.style.top === 'auto';
  const isUpdate = isParentVisible && (isStripeVisible || isPaypalVisible);

  // Preserve classes independently to prevent layout shifts during re-renders
  // Track which specific containers were visible before
  const wasPayPalVisible = paypalContainer.classList.contains('visible');
  const wasStripeVisible = stripeContainer.classList.contains('visible');
  const wasDualVisible = wasPayPalVisible && wasStripeVisible;

  // Preserve each container's visible class independently
  // This prevents "shrink then grow" animation for single and dual messages
  if (!wasPayPalVisible) {
    paypalContainer.classList.remove('visible');
  }
  if (!wasStripeVisible) {
    stripeContainer.classList.remove('visible');
  }

  // Only remove dual-messaging if both weren't visible
  if (!wasDualVisible) {
    parentContainer.classList.remove('dual-messaging');
  }

  // Keep parent container out of the flow initially to prevent layout shifts
  // EXCEPT on back/forward with reserved height - keep it in flow so minHeight reserves space
  const hasReservedHeight = isBackForwardNavigation && lastParentContainerHeight > 0;
  if (!isUpdate && !hasReservedHeight) {
    // Keep parent container available but not affecting layout
    parentContainer.style.position = 'absolute';
    parentContainer.style.left = '-9999px';
    parentContainer.style.top = '-9999px';

    // Initialize inner containers
    stripeContainer.style.height = '0';
    stripeContainer.style.overflow = 'hidden';
    paypalContainer.style.height = '0';
    paypalContainer.style.overflow = 'hidden';
  } else if (hasReservedHeight) {
    // On back/forward with reserved height, keep container in layout flow
    // so minHeight actually reserves space and prevents layout shift
    parentContainer.style.position = 'static';
    parentContainer.style.left = 'auto';
    parentContainer.style.top = 'auto';

    // Initialize inner containers
    stripeContainer.style.height = '0';
    stripeContainer.style.overflow = 'hidden';
    paypalContainer.style.height = '0';
    paypalContainer.style.overflow = 'hidden';
  }

  // Initialize these variables before use
  let paypalVisible = false;
  let stripeVisible = false;

  debugLog('BNPL', 'Render starting - isBackForward:', isBackForwardNavigation, 'isStripeVisible:', isStripeVisible, 'isPaypalVisible:', isPaypalVisible);

  try {
    // Determine Stripe rendering function before starting parallel execution.
    // For updates and back/forward navigation, use direct DOM remount without temp container.
    // On back/forward, browser may have restored cached DOM but SDKs don't restore iframe content,
    // so we need to force a fresh render. For updates, the container is already visible so we can
    // skip the detection phase and directly update.
    let stripeRenderFn;
    if (isStripeVisible || isBackForwardNavigation) {
      debugLog('BNPL', 'Will call updateStripeMessaging (back/forward or visible)');
      stripeRenderFn = () => updateStripeMessaging(finalPrice, colors, stripeContainer, alignment);
    } else {
      // For initial detection, use off-screen temp container to avoid layout shift.
      // This allows us to test if Stripe will show BNPL content without affecting page layout.
      debugLog('BNPL', 'Will call detectStripeWithExistingContainer (initial detection)');
      stripeRenderFn = () => detectStripeWithExistingContainer(finalPrice, colors, stripeContainer, alignment);
    }

    // Process PayPal and Stripe in parallel to minimize total wait time.
    // Each SDK has 2s render timeout, so parallel execution saves ~2s compared to sequential.
    const [paypalResult, stripeResult] = await Promise.all([
      showPaypalMessaging(finalPrice, colors, paypalContainer, isPaypalVisible, alignment, pageType),
      stripeRenderFn()
    ]);

    paypalVisible = paypalResult;
    stripeVisible = stripeResult;

    debugLog('BNPL', 'PayPal result:', paypalVisible);
    debugLog('BNPL', 'Stripe result:', stripeVisible);
  } catch (error) {
    console.error('[BNPL Render] Error processing messaging:', error);
    // Continue with default values (false) if there's an error
  }
  
  // Add visibility classes based on detection results
  if (stripeVisible) {
    stripeContainer.classList.add('visible');
  }
  
  if (paypalVisible) {
    paypalContainer.classList.add('visible');
  }
  
  // Validate dual-messaging class based on actual visibility
  if (stripeVisible && paypalVisible) {
    // Both visible: ensure class is present
    parentContainer.classList.add('dual-messaging');
  } else {
    // Only one (or none) visible: remove class to handle edge cases
    // This covers scenario where price change disqualifies a provider
    parentContainer.classList.remove('dual-messaging');
  }
  
  // Only bring container on-screen if we have content
  if (paypalVisible || stripeVisible) {
    parentContainer.style.position = 'static';
    parentContainer.style.left = 'auto';
    parentContainer.style.top = 'auto';
    parentContainer.classList.remove('hidden');

    // Re-apply display class here, after the container is positioned properly
    if (displayClass) {
      parentContainer.classList.add(displayClass);
    }

    // Update cache after successful render
    lastRenderedPrice = finalPrice;

    // Capture parent container height for layout shift prevention on browser back.
    //
    // Timing consideration: We wait after container becomes visible because:
    // 1. SDKs (Stripe/PayPal) inject iframes asynchronously
    // 2. Iframes may continue growing/laying out after initial render
    // 3. We already waited 2s for SDK render, but final layout may not be stable
    // 4. Capturing too early would cache an incomplete height, defeating the purpose
    //
    // The delay ensures we capture the final, stable height for accurate
    // space reservation on future back/forward navigation.
    setTimeout(function() {
      lastParentContainerHeight = parentContainer.offsetHeight;
      try {
        if (currentPageType !== 'unknown') {
          var storageKey = 'bnplParentHeight_' + currentPageType;
          sessionStorage.setItem(storageKey, lastParentContainerHeight.toString());
          debugLog('BNPL', 'Saved height', lastParentContainerHeight, 'px to', storageKey);
        }
      } catch (e) {
        // sessionStorage not available, skip
      }
    }, PAYMENT_CONFIG.PARENT_CONTAINER.heightCaptureDelay);
  } else {
    parentContainer.style.display = 'none';
  }

  // Note: We do NOT reset isBackForwardNavigation flag here.
  //
  // The flag is set once at page load based on navigation type, and should remain
  // constant for the lifetime of the page. Resetting it after first render would
  // break subsequent renders on the same page (e.g., option changes) because:
  //
  // 1. The browser's navigation type doesn't change mid-page
  // 2. If we're on a back/forward page load, ALL renders should treat it as such
  // 3. Resetting would incorrectly classify subsequent renders as normal page loads
  //
  // The original reset logic was attempting to prevent "subsequent price changes from
  // using back/forward logic", but this was solving the wrong problem. The real issue
  // was that we shouldn't be using the back/forward flag for detecting whether to
  // re-render (which is what the price caching logic does). That's now properly
  // handled by the separate lastRenderedPrice check in showBnplMessaging().
}

/**
 * Detects if Stripe BNPL messaging is available for the current price
 * Uses an off-screen container to avoid layout shifts during detection
 * @param {number} price - Product price
 * @param {Object} colors - Color settings
 * @param {HTMLElement} container - Stripe container element
 * @param {string} alignment - Text alignment for messaging
 * @returns {Promise<boolean>} Whether Stripe has visible content
 */
async function detectStripeWithExistingContainer(price, { backgroundColor }, container, alignment = 'left') {
  const elementId = PAYMENT_CONFIG.SUPPORTED_PROCESSORS.stripe.elementId;
  const element = container.querySelector(`#${elementId}`);
  const { bigcartel } = window;

  if (!element ||
    typeof Stripe !== 'function' ||
    !bigcartel?.checkout?.stripe_publishable_key ||
    !bigcartel?.account) {
    return false;
  }

  try {
    // Check if content already exists (e.g., from browser back/forward cache)
    // This prevents unnecessary temp container detection when Stripe is already rendered
    const existingIframe = element.querySelector('iframe');
    if (existingIframe) {
      const existingHeight = existingIframe.offsetHeight;
      if (existingHeight >= PAYMENT_CONFIG.SUPPORTED_PROCESSORS.stripe.heightThresholds.minVisibleHeight) {
        debugLog('BNPL', 'Stripe content already present (height: ' + existingHeight + 'px), skipping detection');
        // Make container visible without re-rendering
        container.style.height = 'auto';
        container.style.overflow = 'visible';
        return true;
      }
    }

    // Keep the real container hidden during detection
    container.style.height = '0';
    container.style.overflow = 'hidden';
    
    // Create an invisible but technically rendered container to test if Stripe will show BNPL content
    const tempContainer = document.createElement('div');
    tempContainer.id = 'temp-stripe-container';
    // Position off-screen but rendered to allow Stripe to properly evaluate
    tempContainer.style.position = 'fixed';
    tempContainer.style.bottom = '0';
    tempContainer.style.right = '0';
    tempContainer.style.width = '500px';
    tempContainer.style.height = 'auto';
    tempContainer.style.overflow = 'visible';
    tempContainer.style.opacity = '0.01';
    tempContainer.style.pointerEvents = 'none';
    tempContainer.style.zIndex = '-1';
    
    // Create a temporary element for Stripe
    const tempElement = document.createElement('div');
    tempElement.id = 'temp-stripe-element';
    tempContainer.appendChild(tempElement);
    
    // Add to document body
    document.body.appendChild(tempContainer);
    
    // Initialize Stripe in the temp container
    const stripe = Stripe(bigcartel.checkout.stripe_publishable_key);
    
    // Use the helper function to get appearance options with the provided alignment
    const options = getStripeAppearanceOptions(backgroundColor, alignment);

    const elements = stripe.elements(options);
    const messagingParams = {
      amount: price * 100,
      currency: bigcartel.account.currency,
      paymentMethodTypes: PAYMENT_CONFIG.SUPPORTED_PROCESSORS.stripe.paymentMethodTypes,
      countryCode: bigcartel.account.country?.code
    };

    const messagingElement = elements.create('paymentMethodMessaging', messagingParams);
    
    await messagingElement.mount('#temp-stripe-element');
    
    // Define the check function that will be called repeatedly
    const checkForContent = async () => {
      const iframe = tempElement.querySelector('iframe');
      if (!iframe) {
        return false;
      }
      
      const height = iframe.offsetHeight;
      
      // Check if the height indicates content
      return height >= PAYMENT_CONFIG.SUPPORTED_PROCESSORS.stripe.heightThresholds.minVisibleHeight;
    };
    
    // Wait for content with configured polling parameters
    let hasContent = await waitForContent(checkForContent, {
      maxWaitTime: PAYMENT_CONFIG.SUPPORTED_PROCESSORS.stripe.detection.maxWaitTime,
      pollInterval: PAYMENT_CONFIG.SUPPORTED_PROCESSORS.stripe.detection.pollInterval,
      minRetries: PAYMENT_CONFIG.SUPPORTED_PROCESSORS.stripe.detection.minRetries,
      context: 'Stripe'
    });
    
    // Cleanup temporary element
    document.body.removeChild(tempContainer);
    
    // If we detected content, initialize the actual container and make it visible
    if (hasContent) {      
      // Clear the original element since we're mounting fresh
      element.innerHTML = '';
      
      // Create and mount a new messaging element in the real container
      const realElements = stripe.elements(options);
      const realMessagingElement = realElements.create('paymentMethodMessaging', messagingParams);
      await realMessagingElement.mount(`#${elementId}`);
      
      // Make the real container visible
      container.style.height = 'auto';
      container.style.overflow = 'visible';
    }
    
    return hasContent;
  } catch (error) {
    console.warn('[BNPL] Error detecting Stripe messaging:', {
      message: error.message,
      name: error.name,
      context: 'Detection phase'
    });
    
    // Clean up temp container if it exists
    const tempContainer = document.getElementById('temp-stripe-container');
    if (tempContainer && tempContainer.parentNode) {
      tempContainer.parentNode.removeChild(tempContainer);
    }
    
    return false;
  }
}

/**
 * Updates existing Stripe messaging with complete DOM remount to preserve alignment
 * This approach ensures alignment settings are properly applied during updates
 * @param {number} price - Product price
 * @param {Object} colors - Color settings
 * @param {HTMLElement} container - Stripe container element
 * @param {string} alignment - Text alignment for messaging
 * @returns {Promise<boolean>} Whether messaging is visible
 */
async function updateStripeMessaging(price, { backgroundColor }, container, alignment = 'left') {
  debugLog('BNPL', 'Updating Stripe messaging for price $' + price + ', alignment: ' + alignment);

  const elementId = PAYMENT_CONFIG.SUPPORTED_PROCESSORS.stripe.elementId;
  const element = container.querySelector(`#${elementId}`);

  if (!element || typeof Stripe !== 'function') {
    return false;
  }

  const { bigcartel } = window;
  if (!bigcartel?.checkout?.stripe_publishable_key || !bigcartel.account) {
    return false;
  }

  try {
    // Max-height tracking: Capture current height before removing element to prevent collapse
    const currentHeight = container.offsetHeight;
    if (currentHeight > 0 && currentHeight > maxStripeHeight) {
      maxStripeHeight = currentHeight;
    }
    if (maxStripeHeight > 0) {
      container.style.minHeight = `${maxStripeHeight}px`;
    }

    // First, remove the element completely from the DOM
    const parentElement = element.parentNode;
    parentElement.removeChild(element);
    
    // Create a new element with the same ID
    const newElement = document.createElement('div');
    newElement.id = elementId;
    parentElement.appendChild(newElement);
    
    // Initialize Stripe with updated price on the new element
    const stripe = Stripe(bigcartel.checkout.stripe_publishable_key);
    const options = getStripeAppearanceOptions(backgroundColor, alignment);

    const elements = stripe.elements(options);
    const messagingParams = {
      amount: price * 100,
      currency: bigcartel.account.currency,
      paymentMethodTypes: PAYMENT_CONFIG.SUPPORTED_PROCESSORS.stripe.paymentMethodTypes,
      countryCode: bigcartel.account.country?.code
    };

    const messagingElement = elements.create('paymentMethodMessaging', messagingParams);
    
    // Mount to the new element
    await messagingElement.mount(`#${elementId}`);
    
    // Add render timeout to ensure messaging completes rendering
    await new Promise(resolve => 
      setTimeout(resolve, PAYMENT_CONFIG.SUPPORTED_PROCESSORS.stripe.timeouts.render)
    );
    
    // Check if iframe exists after remount
    const iframe = newElement.querySelector('iframe');
    if (!iframe) {
      container.style.height = '0';
      container.style.overflow = 'hidden';
      return false;
    }

    // Make container visible
    container.style.height = 'auto';
    container.style.overflow = 'visible';
    return true;
  } catch (error) {
    console.warn('[BNPL] Stripe messaging update error:', error);
    return false;
  }
}

/**
 * Displays PayPal payment messaging
 * @param {number} price - Product price
 * @param {Object} colors - Display options
 * @param {HTMLElement} container - Container element
 * @param {boolean} isAlreadyVisible - Whether PayPal messaging is already visible
 * @param {string} alignment - Text alignment ('left', 'center', 'right')
 * @param {string} pageType - Page type for PayPal messaging ('product-details', 'cart')
 * @returns {Promise<boolean>} Whether messaging is visible
 */
async function showPaypalMessaging(
  price,
  { backgroundColor },
  container,
  isAlreadyVisible = false,
  alignment = 'left',
  pageType = 'product-details'
) {
  debugLog('BNPL', 'Rendering PayPal messaging for price $' + price + ', alignment: ' + alignment + ', pageType: ' + pageType);

  const elementId = PAYMENT_CONFIG.SUPPORTED_PROCESSORS.paypal.elementId;

  if (!container || typeof PayPalSDK === 'undefined') {
    return false;
  }

  try {
    // Max-height tracking: Capture current height before clearing to prevent collapse
    const currentHeight = container.offsetHeight;
    if (currentHeight > 0 && currentHeight > maxPaypalHeight) {
      maxPaypalHeight = currentHeight;
    }
    if (maxPaypalHeight > 0) {
      container.style.minHeight = `${maxPaypalHeight}px`;
    }

    // Clear container and create a fresh element to prevent PayPal SDK caching
    container.innerHTML = '';
    
    const newElement = document.createElement('div');
    newElement.id = elementId;
    
    // Add data attribute to ensure unique rendering context for PayPal SDK
    newElement.setAttribute('data-rendering-id', Date.now());
    container.appendChild(newElement);
    newElement.style.display = 'block';
    
    let isVisible = false;
    const message = PayPalSDK.Messages({
      amount: price,
      pageType: pageType,
      style: {
        layout: 'text',
        logo: {
          type: 'primary',
          position: 'left'
        },
        text: {
          color: getTextColorMode(backgroundColor, 'paypal'),
          size: "14",
          align: alignment
        }
      },
      onRender: () => {
        if (newElement.offsetHeight > 0) {
          container.style.height = 'auto';
          container.style.overflow = 'visible';
          isVisible = true;
        }
      }
    });

    await message.render(`#${elementId}`);
    await new Promise(resolve => setTimeout(resolve, PAYMENT_CONFIG.SUPPORTED_PROCESSORS.paypal.timeouts.render));

    // Double-check visibility after rendering
    if (!isVisible && newElement.offsetHeight > 0) {
      container.style.height = 'auto';
      container.style.overflow = 'visible';
      isVisible = true;
    }
    
    if (!isVisible) {
      console.warn(`[BNPL] PayPal message did not render visibly within the ${PAYMENT_CONFIG.SUPPORTED_PROCESSORS.paypal.timeouts.render}ms timeout.`);
    }
    
    return isVisible;
  } catch (error) {
    console.warn('[BNPL] PayPal messaging error:', error);
    return false;
  }
}

/**
 * Viewport resize handler
 * Resets max-height tracking when viewport size changes significantly
 * This ensures messaging adapts properly to device rotation or window resizing
 */
function handleViewportResize() {
  const currentWidth = window.innerWidth;

  // Reset if viewport changed significantly (>100px)
  if (Math.abs(currentWidth - lastViewportWidth) > 100) {
    maxPaypalHeight = 0;
    maxStripeHeight = 0;
    lastViewportWidth = currentWidth;
  }
}

// Debounced resize handler (don't fire on every pixel change)
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(handleViewportResize, 250);
});