/**
 * Video Utilities for Big Cartel Themes
 * Supports YouTube, Vimeo, Twitch, and direct video files
 * Uses MediaElement.js with dynamic renderer loading for optimal performance
 */

(function(window) {
    'use strict';

    /**
     * Extract YouTube video ID from various URL formats
     * @param {string} url - YouTube URL in any supported format
     * @returns {string|null} - Video ID or null if invalid
     */
    function extractYouTubeVideoId(url) {
        if (!url || typeof url !== 'string') {
            return null;
        }

        const cleanUrl = url.trim();
        
        // If it's already a valid video ID, return it
        if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
            return cleanUrl;
        }
        
        // Comprehensive regex patterns for YouTube URLs
        const patterns = [
            // Standard watch URLs: youtube.com, m.youtube.com, youtube-nocookie.com/watch?v=ID
            /(?:(?:m\.)?youtube(?:-nocookie)?\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            // Embed URLs: youtube.com, youtube-nocookie.com/embed/ID
            /(?:(?:m\.)?youtube(?:-nocookie)?\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            // Shorts URLs: youtube.com, m.youtube.com, youtube-nocookie.com/shorts/ID
            /(?:(?:m\.)?youtube(?:-nocookie)?\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
            // Short URLs: youtu.be/ID
            /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/
        ];
        
        for (const pattern of patterns) {
            const match = cleanUrl.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }

    /**
     * Extract Vimeo video ID from various URL formats
     * @param {string} url - Vimeo URL
     * @returns {string|null} - Video ID or null if invalid
     */
    function extractVimeoVideoId(url) {
        if (!url || typeof url !== 'string') {
            return null;
        }

        const cleanUrl = url.trim();
        const match = cleanUrl.match(/(?:vimeo\.com\/)(?:.*\/)?(\d+)/);
        return match ? match[1] : null;
    }

    /**
     * Detect video platform and return configuration
     * @param {string} url - Video URL
     * @returns {Object} - Video configuration object
     */
    function detectVideoType(url) {
        if (!url) return null;

        if (url.includes('youtube.com') || url.includes('youtube-nocookie.com') || url.includes('youtu.be')) {
            const videoId = extractYouTubeVideoId(url);
            return videoId ? { type: 'youtube', id: videoId } : null;
        } else if (url.includes('vimeo.com')) {
            const videoId = extractVimeoVideoId(url);
            return videoId ? { type: 'vimeo', id: videoId } : null;
        } else if (url.includes('twitch.tv')) {
            const match = url.match(/twitch\.tv\/([^/?]+)/);
            return match ? { type: 'twitch', id: match[1] } : null;
        } else if (url.includes('dailymotion.com')) {
            const match = url.match(/(?:dailymotion\.com.*\/video|dai\.ly)\/([^_]+)/);
            return match ? { type: 'dailymotion', id: match[1] } : null;
        } else {
            // Assume direct video URL
            return { type: 'direct', url: url };
        }
    }

    /**
     * Load external renderer for platforms not bundled with MediaElement.js
     * @param {string} rendererType - Type of renderer to load
     * @param {Function} callback - Callback to execute after loading
     */
    function loadExternalRenderer(rendererType, callback) {
        const rendererUrls = {
            twitch: 'https://cdnjs.cloudflare.com/ajax/libs/mediaelement/7.0.7/renderers/twitch.min.js',
            vimeo: 'https://cdnjs.cloudflare.com/ajax/libs/mediaelement/7.0.7/renderers/vimeo.min.js'
        };

        // Check if renderer is already loaded
        if (document.querySelector(`script[src*="${rendererType}.min.js"]`)) {
            callback();
            return;
        }

        // Load renderer
        const script = document.createElement('script');
        script.src = rendererUrls[rendererType];
        script.onload = callback;
        script.onerror = () => {
            console.error(`Failed to load ${rendererType} renderer`);
        };
        document.head.appendChild(script);
    }

    /**
     * Create a fallback placeholder for Twitch videos that can't be embedded
     * @param {HTMLElement} container - Container element
     * @param {string} channelName - Twitch channel name
     * @returns {void}
     */
    function createTwitchFallbackPlaceholder(container, channelName) {
        const placeholder = document.createElement('div');
        placeholder.className = 'video-placeholder twitch-placeholder';
        
        placeholder.innerHTML = `
            <div class="twitch-placeholder-content">
                <div class="twitch-placeholder-icon">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor">
                        <path d="M8.5 1L3 6.5v24h7V37l5.5-6.5H22L32 21.5V1H8.5zm21 18.5L26 23h-5.5l-4.5 4.5V23H11V3h18.5v16.5z"/>
                        <path d="M26 8v9h-2V8h2zm-6.5 0v9h-2V8h2z"/>
                    </svg>
                </div>
                <div class="twitch-placeholder-text">
                    <p>Twitch videos can't be previewed in Shop designer.</p>
                    <p>Don't worry, it'll appear in your live shop!</p>
                    <small>Channel: ${channelName}</small>
                </div>
            </div>
        `;
        
        container.innerHTML = '';
        container.appendChild(placeholder);
    }


    /**
     * Initialize video embed in a specific div with styling options
     * @param {string} divId - ID of the div to put the embed in (without #)
     * @param {string} videoUrl - Video URL (YouTube, Vimeo, or direct)
     * @param {Object} options - Configuration options
     * @returns {boolean} - Success status
     */
    function initVideoEmbed(divId, videoUrl, options = {}) {
        const container = document.getElementById(divId);
        
        if (!container) {
            console.error('Video embed container not found with ID:', divId);
            return false;
        }

        // Add base container class
        container.classList.add('video-embed-container');

        // Handle size options
        const {
            size = 'medium', // 'small', 'medium', 'large', 'full-width' (sometimes)
            border = 'sharp', // 'rounded', 'sharp'
            posterQuality = 'maxresdefault',
            playLabel = 'Play Video'
        } = options;

        // Apply size class
        container.classList.remove('size-small', 'size-medium', 'size-large', 'size-full-width');
        container.classList.add(`size-${size}`);

        // Apply border class
        container.classList.remove('border-rounded', 'border-sharp');
        if (border == 'rounded') {
            container.classList.add(`border-${border}`);
        }

        const videoConfig = detectVideoType(videoUrl);
        
        // Add video type data attribute for CSS targeting
        if (videoConfig) {
            container.setAttribute('data-video-type', videoConfig.type);
        }
        
        if (!videoConfig) {
            // Show placeholder for invalid URLs
            console.error('Invalid video URL format:', videoUrl);
            container.innerHTML = '<div class="video-placeholder"><p>Invalid video URL format</p></div>';
            return false;
        }

        // Function to initialize the video player
        function initializePlayer() {
            const videoElement = document.createElement('video');
            videoElement.id = `${divId}-player`;
            videoElement.setAttribute('controls', '');
            videoElement.style.width = '100%';
            videoElement.style.height = 'auto';
            
            // Set the source URL - MediaElement.js will detect the platform automatically
            if (videoConfig.type === 'youtube') {
                videoElement.src = `https://www.youtube-nocookie.com/embed/${videoConfig.id}?controls=0&rel=0`;
            } else if (videoConfig.type === 'vimeo') {
                videoElement.src = `https://player.vimeo.com/video/${videoConfig.id}?dnt=1&title=0&byline=0&portrait=0&badge=0`;
            } else if (videoConfig.type === 'twitch') {
                videoElement.src = `https://www.twitch.tv/${videoConfig.id}`;
            } else if (videoConfig.type === 'direct') {
                videoElement.src = videoConfig.url;
            } else {
                // For unsupported platforms, show placeholder
                container.innerHTML = '<div class="video-placeholder"><p>Video platform not supported</p></div>';
                return false;
            }

            // Clear container and add the video element
            container.innerHTML = '';
            container.appendChild(videoElement);

            // Initialize MediaElement.js player
            try {
                if (typeof MediaElementPlayer !== 'undefined') {
                    const player = new MediaElementPlayer(videoElement, {
                        enableAutosize: true,
                        stretching: 'responsive',
                        features: ['playpause', 'progress', 'current', 'duration', 'volume', 'pip', 'fullscreen'],
                        overlayPlayButton: false,
                        controls: videoConfig.type !== 'twitch' // Hide controls for Twitch to avoid double controls
                    });

                    // Add resize handler to ensure video resizes properly
                    let resizeTimeout;
                    function handleResize() {
                        clearTimeout(resizeTimeout);
                        resizeTimeout = setTimeout(() => {
                            if (player && player.media) {
                                // Remove any inline width/height styles that MediaElement.js might have set
                                const mejsContainer = container.querySelector('.mejs__container');
                                if (mejsContainer) {
                                    mejsContainer.style.removeProperty('width');
                                    mejsContainer.style.removeProperty('height');
                                    mejsContainer.style.removeProperty('max-width');
                                    mejsContainer.style.removeProperty('max-height');
                                }
                                
                                // Also clear styles on the media element
                                const mediaElement = container.querySelector('.mejs__mediaelement video, .mejs__mediaelement iframe');
                                if (mediaElement) {
                                    mediaElement.style.removeProperty('width');
                                    mediaElement.style.removeProperty('height');
                                }
                            }
                        }, 100);
                    }

                    // Listen for window resize events
                    window.addEventListener('resize', handleResize);
                    
                    // Store cleanup function for potential future use
                    player._cleanup = () => {
                        window.removeEventListener('resize', handleResize);
                    };
                } else {
                    console.error('MediaElement.js not loaded. Please include MediaElement.js library.');
                    container.innerHTML = '<div class="video-placeholder"><p>Video player library not loaded</p></div>';
                    return false;
                }
            } catch (error) {
                console.error('Error initializing MediaElement.js player:', error);
                container.innerHTML = '<div class="video-placeholder"><p>Error loading video player</p></div>';
                return false;
            }
        }

        // Special handling for Twitch in iframe contexts (theme editors, previews)
        const isInIframe = window.self !== window.top;
        const testIframe = new URLSearchParams(window.location.search).get('test_iframe') === 'true';
        
        if (videoConfig.type === 'twitch' && (isInIframe || testIframe)) {
            // We're in an iframe (or testing) and this is a Twitch video - show placeholder immediately
            createTwitchFallbackPlaceholder(container, videoConfig.id);
            return true;
        }

        // For Twitch and Vimeo, load the renderer first, then initialize
        if (videoConfig.type === 'twitch') {
            loadExternalRenderer('twitch', initializePlayer);
        } else if (videoConfig.type === 'vimeo') {
            loadExternalRenderer('vimeo', initializePlayer);
        } else {
            // For YouTube and direct videos, initialize immediately
            initializePlayer();
        }
        
        return true;
    }

    // Export functions to global scope
    window.BCVideo = {
        extractYouTubeVideoId: extractYouTubeVideoId,
        extractVimeoVideoId: extractVimeoVideoId,
        detectVideoType: detectVideoType,
        init: initVideoEmbed
    };
})(window);