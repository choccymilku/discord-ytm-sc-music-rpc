// ==UserScript==
// @name         SoundCloud Discord RPC
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Observe your SoundCloud activity and playback time for Discord RPC
// @author       adrian154, modified by choccy
// @match        https://soundcloud.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=soundcloud.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Function to check if music is playing or paused on SoundCloud
    const isMusicPlaying = () => {
        const playButton = document.querySelector('.playControl.playing');
        return !!playButton;
    };

    // Function to extract start and end timestamps
    const extractTimestamps = () => {
        const startTimeElement = document.querySelector('.playbackTimeline__timePassed span[aria-hidden="true"]');
        const endTimeElement = document.querySelector('.playbackTimeline__duration span[aria-hidden="true"]');

        if (startTimeElement && endTimeElement) {
            const startTimeText = startTimeElement.textContent.trim();
            const endTimeText = endTimeElement.textContent.trim();
            return {
                startTime: startTimeText,
                endTime: endTimeText
            };
        }

        return null;
    };

    // Function to convert time format (mm:ss) to seconds
    const timeToSeconds = (time) => {
        const [minutes, seconds] = time.split(':').map(Number);
        return minutes * 60 + seconds;
    };

    // Function to extract song metadata from SoundCloud's interface
    const extractMetadata = () => {
        const titleElement = document.querySelector('.playbackSoundBadge__titleLink > span:nth-child(2)');
        const artistElement = document.querySelector('.playbackSoundBadge__lightLink');
        const albumArtElement = document.querySelector('.playbackSoundBadge__avatar .image__lightOutline span');

        const songTitle = titleElement ? titleElement.textContent.trim() : 'Unknown';
        const artist = artistElement ? artistElement.textContent.trim() : 'Unknown';
        let albumArt = albumArtElement ? albumArtElement.style.backgroundImage.replace(/url\(["']?(.*?)["']?\)/, '$1') : '';
        const timestamps = extractTimestamps(); // Extract timestamps

        // Replace the 50x50 image URL with a 200x200 version
        if (albumArt) {
            albumArt = albumArt.replace('-t50x50.jpg', '-t200x200.jpg');
        }

        // Log the retrieved information in one message, including the calculated timestamps
        console.log(`Song Title: ${songTitle}, Artist: ${artist}, Album Art: ${albumArt}, Start Time: ${timestamps.startTime}, End Time: ${timestamps.endTime}`);

        return { songTitle, artist, albumArt, timestamps, /* other properties */ };
    };

    // Function to update Discord Rich Presence with the extracted information
    const updateActivity = () => {
        const metadata = extractMetadata();
        const isPlaying = isMusicPlaying();

        // Extract start and end timestamps
        const timestamps = metadata.timestamps;
        if (!timestamps) return; // No valid timestamps found

        const currentTimestamp = Math.floor(Date.now() / 1000);

        // Calculate start and end timestamps relative to the current time
        const startTimestamp = currentTimestamp - timeToSeconds(timestamps.startTime);
        const endTimestamp = currentTimestamp + (timeToSeconds(timestamps.endTime) - timeToSeconds(timestamps.startTime));

        // Add the button data
        const buttonData = {
            label: "Listen on SoundCloud",
            url: window.location.href // Get the current URL of the SoundCloud page
        };

        const url = new URL("http://localhost:19347/song");

        // Add the song title, artist, album art, start time, and end time
        url.searchParams.set("title", metadata.songTitle);
        url.searchParams.set("artist", metadata.artist);
        url.searchParams.set("url", metadata.albumArt);
        url.searchParams.set("startTimestamp", startTimestamp.toString());
        url.searchParams.set("endTimestamp", endTimestamp.toString());

        // Add the button label and URL
        url.searchParams.set("buttonLabel", buttonData.label);
        url.searchParams.set("buttonUrl", buttonData.url);

        // Add a parameter to indicate if music is playing or paused
        url.searchParams.set("isPlaying", isPlaying ? "1" : "0");

        // Add a delay before sending the request
        setTimeout(() => {
            fetch(url, {
                method: "POST"
            });
        }, 2000); // Adjust the delay as needed

        // Log the current state (playing or paused)
        console.log(`Music is currently ${isPlaying ? 'playing' : 'paused'}`);
    };

    let isPlaying = false; // Initialize as not playing
    let currentTimestamps = null; // Initialize as null

    // Update activity initially and then every second
    updateActivity();
    setInterval(() => {
        const newIsPlaying = isMusicPlaying();
        const metadata = extractMetadata();

        if (newIsPlaying !== isPlaying) {
            isPlaying = newIsPlaying;
            updateActivity();
        }

        // Check if timestamps have changed
        const timestamps = metadata.timestamps;
        if (timestamps && JSON.stringify(timestamps) !== JSON.stringify(currentTimestamps)) {
            currentTimestamps = timestamps;
            updateActivity();
        }
    }, 1000);
})();
