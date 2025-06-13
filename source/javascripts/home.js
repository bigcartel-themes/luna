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

    // Initialize video if MediaElement.js is already available, otherwise wait for it
    if (typeof MediaElementPlayer !== 'undefined') {
        initVideo();
    } else {
        window.addEventListener('mediaelement-ready', initVideo);
    }
});