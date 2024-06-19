// content.js

document.addEventListener('DOMContentLoaded', () => {
    const videoId = extractVideoId(window.location.href);
    if (videoId) {
        chrome.runtime.sendMessage({ action: 'loadVideoComments', videoId });
    }
});

function extractVideoId(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/ ]{11})/);
    return match ? match[1] : null;
}
