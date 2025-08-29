document.addEventListener('DOMContentLoaded', () => {
    const isHomePage = document.body.getAttribute('data-bc-page-type') === 'home';
    const featuredVideoUrl = themeOptions.homeFeaturedVideoUrl;
    const videoSize = themeOptions.homeFeaturedVideoSize || 'medium';
    const videoBorder = themeOptions.homeFeaturedVideoBorder || 'default';

    function initVideo() {
        if (isHomePage && featuredVideoUrl) {
            BCVideo.init('featured-video', featuredVideoUrl, {
                size: videoSize,
                border: videoBorder
            });
        }
    }

    function initCategoryCollages() {
        if (!isHomePage) return;
        if (typeof setupCategoryCollages === 'function') {
            setupCategoryCollages({
                collage: {
                    width: 800,
                    height: 800,
                    gap: 1
                },
                observer: {
                    rootMargin: '200px 0px',
                    threshold: 0.01
                }
            });
        }
    }

    // Initialize video if MediaElement.js is already available, otherwise wait for it
    if (typeof MediaElementPlayer !== 'undefined') {
        initVideo();
    } else {
        window.addEventListener('mediaelement-ready', initVideo);
    }

    // Initialize category collages
    initCategoryCollages();
});
