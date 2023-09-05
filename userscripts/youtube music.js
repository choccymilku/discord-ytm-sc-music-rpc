// ==UserScript==
// @name         YouTube Music Discord RPC with Playback Time
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Observe your YouTube Music activity and playback time for Discord RPC
// @author       adrian154, modified by choccy
// @match        https://music.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtubemusic.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Function to extract start and end timestamps
    const extractTimestamps = () => {
        const timeInfoElement = document.querySelector('span.time-info');
        if (!timeInfoElement) return null;

        const timeInfoText = timeInfoElement.innerText.trim();
        const [currentTime, totalTime] = timeInfoText.split(' / ');

        // Convert current and total times to seconds
        const currentTimeInSeconds = timeToSeconds(currentTime);
        const totalTimeInSeconds = timeToSeconds(totalTime);

        return {
            currentTimeInSeconds,
            totalTimeInSeconds
        };
    };

    // Function to check if music is playing or paused
    const isMusicPlaying = () => {
        const playPauseButton = document.getElementById('play-pause-button');
        if (playPauseButton) {
            const ariaLabel = playPauseButton.getAttribute('aria-label');
            // You can also check for 'title' attribute if it's more optimal
            // const title = playPauseButton.getAttribute('title');

            // Check if music is playing by checking the aria-label or title attribute
            return ariaLabel === 'Pause'; // Adjust this based on the actual attribute value
        }
        return false; // Default to false if the button is not found
    };

const updateActivity = () => {
    const meta = navigator.mediaSession.metadata;
    const isPlaying = isMusicPlaying();

    if (!meta) return; // Check if metadata is available

    // Extract start and end timestamps
    const timestamps = extractTimestamps();
    if (!timestamps) return; // No valid timestamps found

    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Calculate start and end timestamps relative to the current time
    const startTimestamp = currentTimestamp - timestamps.currentTimeInSeconds;
    const endTimestamp = currentTimestamp + (timestamps.totalTimeInSeconds - timestamps.currentTimeInSeconds);

    const buttonElement = document.querySelector('.ytp-title-link'); // Replace with the appropriate selector
    const buttonHref = buttonElement.href; // Get the href attribute of the selected element

    // Add the button data
    const buttonData = {
        label: "Listen on YouTube Music",
        url: buttonHref, // Use the href attribute of the selected element
    };

    const url = new URL("http://localhost:19347/song");
    url.searchParams.set("artist", meta.artist);
    url.searchParams.set("title", meta.title);
    url.searchParams.set("url", meta.artwork[meta.artwork.length - 1].src);
    url.searchParams.set("buttonLabel", buttonData.label);
    url.searchParams.set("buttonUrl", buttonData.url);

    // Add the calculated timestamps to the URL
    url.searchParams.set("startTimestamp", startTimestamp.toString());
    url.searchParams.set("endTimestamp", endTimestamp.toString());

    // Add a parameter to indicate if music is playing or paused
    url.searchParams.set("isPlaying", isPlaying ? "1" : "0");

    fetch(url, {
        method: "POST"
    });

    // Log the current state (playing or paused)
    if (isPlaying) {
        console.log("Music is currently playing");
    } else {
        console.log("Music is currently paused");
        // Add code here to perform any necessary actions when playback is paused
        // For example, you can pause the playback using JavaScript
        // You might need to interact with the YouTube Music player's API for this.
    }
};

    let currentMeta = null;
    let currentTimestamps = null;

    // Update activity initially and then every second
    updateActivity();
    setInterval(() => {
        const meta = navigator.mediaSession.metadata;

        if (meta != currentMeta) {
            currentMeta = meta;
            updateActivity();
        }

        // Check if timestamps have changed
        const timestamps = extractTimestamps();
        if (timestamps && JSON.stringify(timestamps) !== JSON.stringify(currentTimestamps)) {
            currentTimestamps = timestamps;
            updateActivity();
        }
    }, 1000);

    function timeToSeconds(time) {
        const [minutes, seconds] = time.split(':').map(Number);
        return minutes * 60 + seconds;
    }
})();
