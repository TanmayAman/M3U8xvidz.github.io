document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const videoPlayer = document.getElementById('video-player');
    const videoContainer = document.getElementById('video-container');
    const controls = document.getElementById('controls');
    const streamUrlInput = document.getElementById('stream-url');
    const loadStreamBtn = document.getElementById('load-stream');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const rewindBtn = document.getElementById('rewind-btn');
    const forwardBtn = document.getElementById('forward-btn');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressPreview = document.getElementById('progress-preview');
    const timeDisplay = document.getElementById('time-display');
    const muteBtn = document.getElementById('mute-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const speedSelector = document.getElementById('speed-selector');
    const qualityBtn = document.getElementById('quality-btn');
    const qualityMenu = document.getElementById('quality-menu');
    const qualityOptions = document.querySelectorAll('.quality-option');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const notification = document.getElementById('notification');
    const statusMessage = document.getElementById('status-message');
    const bitrateDisplay = document.getElementById('bitrate-display');
    const particlesContainer = document.getElementById('particles');

    // Initialize HLS.js
    let hls;
    let qualityLevels = [];
    let currentQuality = 'auto';
    let isDraggingProgress = false;
    let lastBitrate = 0;

    // Create particles
    function createParticles() {
        particlesContainer.innerHTML = '';
        const particleCount = Math.floor(window.innerWidth / 10);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const size = Math.random() * 5 + 1;
            const posX = Math.random() * window.innerWidth;
            const posY = Math.random() * window.innerHeight;
            const delay = Math.random() * 10;
            const duration = Math.random() * 20 + 10;
            const opacity = Math.random() * 0.3 + 0.1;
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${posX}px`;
            particle.style.top = `${posY}px`;
            particle.style.opacity = opacity;
            particle.style.animation = `float ${duration}s infinite ${delay}s`;
            particle.style.background = `radial-gradient(circle, var(--primary-color), transparent)`;
            
            particlesContainer.appendChild(particle);
        }
    }

    // Load stream function
    function loadStream() {
        const streamUrl = streamUrlInput.value.trim();
        
        if (!streamUrl) {
            showNotification('Please enter a valid M3U8 URL', 'error');
            return;
        }
        
        statusMessage.textContent = 'Loading stream...';
        
        // Check if HLS is needed
        if (streamUrl.includes('.m3u8')) {
            if (Hls.isSupported()) {
                if (hls) {
                    hls.destroy();
                }
                
                hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 30
                });
                
                hls.loadSource(streamUrl);
                hls.attachMedia(videoPlayer);
                
                hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
                    videoPlayer.play();
                    showNotification('Stream loaded successfully', 'success');
                    statusMessage.textContent = 'Playing';
                    
                    // Update quality levels if available
                    if (data.levels && data.levels.length > 1) {
                        qualityLevels = data.levels;
                    }
                });
                
                hls.on(Hls.Events.LEVEL_SWITCHED, function(event, data) {
                    const level = hls.levels[data.level];
                    if (level) {
                        lastBitrate = level.bitrate;
                        updateBitrateDisplay();
                    }
                });
                
                hls.on(Hls.Events.ERROR, function(event, data) {
                    if (data.fatal) {
                        showNotification('Error loading stream', 'error');
                        statusMessage.textContent = 'Error';
                        hls.destroy();
                    }
                });
            } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
                videoPlayer.src = streamUrl;
                videoPlayer.addEventListener('loadedmetadata', function() {
                    videoPlayer.play();
                    showNotification('Stream loaded successfully', 'success');
                    statusMessage.textContent = 'Playing';
                });
            } else {
                showNotification('HLS is not supported in your browser', 'error');
                statusMessage.textContent = 'HLS not supported';
            }
        } else {
            videoPlayer.src = streamUrl;
            videoPlayer.addEventListener('loadedmetadata', function() {
                videoPlayer.play();
                showNotification('Stream loaded successfully', 'success');
                statusMessage.textContent = 'Playing';
            });
        }
        
        videoPlayer.addEventListener('error', function() {
            showNotification('Error loading video', 'error');
            statusMessage.textContent = 'Error';
        });
    }

    

// Quality selection functionality
function setupQualitySelection() {
    const qualityOptions = document.querySelectorAll('.quality-option');
    
    qualityOptions.forEach(option => {
        option.addEventListener('click', function() {
            const quality = this.dataset.quality;
            
            // Update active state
            qualityOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            if (quality === 'auto') {
                // For auto quality (use HLS.js if available)
                if (hls) {
                    hls.currentLevel = -1; // Auto quality
                    showNotification('Quality set to Auto', 'success');
                }
            } else {
                // For predefined qualities - modify playback without reloading
                if (hls) {
                    // Find the closest matching level
                    const targetHeight = parseInt(quality);
                    let closestLevel = -1;
                    let minDiff = Infinity;
                    
                    hls.levels.forEach((level, index) => {
                        const diff = Math.abs(level.height - targetHeight);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestLevel = index;
                        }
                    });
                    
                    if (closestLevel !== -1) {
                        hls.currentLevel = closestLevel;
                        showNotification(`Quality set to ~${hls.levels[closestLevel].height}p`, 'success');
                    } else {
                        showNotification('No matching quality level found', 'error');
                    }
                } else {
                    // For native HLS (Safari) or direct video
                    showNotification('Manual quality switching not supported for this stream', 'error');
                }
            }
        });
    });
    
    // Close quality menu when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (!qualityBtn.contains(e.target) && !qualityMenu.contains(e.target)) {
            qualityMenu.style.display = 'none';
        }
    });
    
    // Show quality menu when clicking quality button
    qualityBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        qualityMenu.style.display = qualityMenu.style.display === 'block' ? 'none' : 'block';
    });
}

// Call this in your init function
setupQualitySelection();



    // Update bitrate display
    function updateBitrateDisplay() {
        bitrateDisplay.textContent = `Bitrate: ${Math.round(lastBitrate / 1000)} kbps`;
    }

    // Play/Pause toggle
    function togglePlayPause() {
        if (videoPlayer.paused || videoPlayer.ended) {
            videoPlayer.play();
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            statusMessage.textContent = 'Playing';
        } else {
            videoPlayer.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            statusMessage.textContent = 'Paused';
        }
    }

    // Stop video
    function stopVideo() {
        videoPlayer.pause();
        videoPlayer.currentTime = 0;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        statusMessage.textContent = 'Stopped';
    }

    // Rewind 10 seconds
    function rewind() {
        videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
    }

    // Forward 10 seconds
    function forward() {
        videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 10);
    }

    // Update progress bar
    function updateProgress() {
        if (!isDraggingProgress) {
            const percent = (videoPlayer.currentTime / videoPlayer.duration) * 100;
            progressBar.style.width = `${percent}%`;
            
            const currentTime = formatTime(videoPlayer.currentTime);
            const duration = formatTime(videoPlayer.duration);
            timeDisplay.textContent = `${currentTime} / ${duration}`;
        }
    }

    // Format time (seconds to MM:SS)
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Show preview on progress bar hover
    function showProgressPreview(e) {
        const percent = e.offsetX / this.offsetWidth;
        const previewTime = percent * videoPlayer.duration;
        progressPreview.textContent = formatTime(previewTime);
        progressPreview.style.left = `${percent * 100}%`;
    }

    // Seek video when clicking on progress bar
    function seek(e) {
        const percent = e.offsetX / this.offsetWidth;
        videoPlayer.currentTime = percent * videoPlayer.duration;
    }

    // Start dragging progress
    function startDragProgress() {
        isDraggingProgress = true;
        document.addEventListener('mousemove', dragProgress);
        document.addEventListener('mouseup', endDragProgress);
    }

    // Drag progress
    function dragProgress(e) {
        const rect = progressContainer.getBoundingClientRect();
        const percent = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
        progressBar.style.width = `${percent * 100}%`;
        progressPreview.textContent = formatTime(percent * videoPlayer.duration);
        progressPreview.style.left = `${percent * 100}%`;
    }

    // End dragging progress
    function endDragProgress() {
        isDraggingProgress = false;
        const percent = parseFloat(progressBar.style.width) / 100;
        videoPlayer.currentTime = percent * videoPlayer.duration;
        document.removeEventListener('mousemove', dragProgress);
        document.removeEventListener('mouseup', endDragProgress);
    }

    // Toggle mute
    function toggleMute() {
        videoPlayer.muted = !videoPlayer.muted;
        muteBtn.innerHTML = videoPlayer.muted ? 
            '<i class="fas fa-volume-mute"></i>' : 
            '<i class="fas fa-volume-up"></i>';
        volumeSlider.value = videoPlayer.muted ? 0 : videoPlayer.volume;
    }

    // Change volume
    function changeVolume() {
        videoPlayer.volume = volumeSlider.value;
        videoPlayer.muted = volumeSlider.value == 0;
        muteBtn.innerHTML = volumeSlider.value == 0 ? 
            '<i class="fas fa-volume-mute"></i>' : 
            '<i class="fas fa-volume-up"></i>';
    }

    // Change playback speed
    function changeSpeed() {
        videoPlayer.playbackRate = speedSelector.value;
        showNotification(`Playback speed set to ${speedSelector.value}x`, 'success');
    }

    // Toggle fullscreen
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            videoContainer.requestFullscreen().catch(err => {
                showNotification(`Error attempting to enable fullscreen: ${err.message}`, 'error');
            });
        } else {
            document.exitFullscreen();
        }
    }

    // Show notification
    function showNotification(message, type = 'success') {
        notification.innerHTML = '';
        
        const icon = document.createElement('i');
        icon.className = type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle';
        
        const text = document.createElement('span');
        text.textContent = message;
        
        notification.appendChild(icon);
        notification.appendChild(text);
        notification.className = `notification ${type}`;
        notification.style.opacity = 1;
        
        setTimeout(() => {
            notification.style.opacity = 0;
        }, 3000);
    }

    // Initialize
    function init() {
        createParticles();
        setupQualitySelection();
        
        // Event listeners
        loadStreamBtn.addEventListener('click', loadStream);
        streamUrlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') loadStream();
        });
        
        playPauseBtn.addEventListener('click', togglePlayPause);
        stopBtn.addEventListener('click', stopVideo);
        rewindBtn.addEventListener('click', rewind);
        forwardBtn.addEventListener('click', forward);
        
        videoPlayer.addEventListener('click', togglePlayPause);
        videoPlayer.addEventListener('play', () => {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            statusMessage.textContent = 'Playing';
        });
        videoPlayer.addEventListener('pause', () => {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            statusMessage.textContent = 'Paused';
        });
        videoPlayer.addEventListener('timeupdate', updateProgress);
        videoPlayer.addEventListener('ended', () => {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            statusMessage.textContent = 'Ended';
        });
        
        progressContainer.addEventListener('mousemove', showProgressPreview);
        progressContainer.addEventListener('click', seek);
        progressContainer.addEventListener('mousedown', startDragProgress);
        
        muteBtn.addEventListener('click', toggleMute);
        volumeSlider.addEventListener('input', changeVolume);
        
        speedSelector.addEventListener('change', changeSpeed);
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        
        // Close quality menu when clicking elsewhere
        document.addEventListener('click', function(e) {
            if (!qualityBtn.contains(e.target) && !qualityMenu.contains(e.target)) {
                qualityMenu.style.display = 'none';
            }
        });
        
        // Show quality menu when clicking quality button
        qualityBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            qualityMenu.style.display = qualityMenu.style.display === 'block' ? 'none' : 'block';
        });
        
        // Initialize with default volume
        videoPlayer.volume = volumeSlider.value;
    }

    init();
});