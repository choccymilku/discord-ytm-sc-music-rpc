const DiscordRPC = require("discord-rpc");
const express = require("express");

const rpc = new DiscordRPC.Client({transport: "ipc"});
const app = express();

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

// 1031356587996094475
rpc.login({clientId: "977946727439007785"}).catch(console.error);
app.listen(19347, () => console.log("Webserver started"));

let rpcReady = false;
rpc.on("ready", () => {
    console.log("RPC ready");
    rpcReady = true;
});

let currentActivity = null; // Store the current activity

app.post("/song", (req, res) => {
    if (rpcReady) {
        console.log("Now playing: " + req.query.title + " by " + req.query.artist);

        // Check if the music is playing (1 for playing, 0 for paused)
        const isPlaying = parseInt(req.query.isPlaying);

        if (isPlaying) {
            // Music is playing, update the activity
            rpc.setActivity({
                details: req.query.title,
                state: "by " + req.query.artist,
                largeImageKey: req.query.url,
                buttons: [
                    {
                        label: req.query.buttonLabel, // Button label (e.g., "Listen on YouTube Music")
                        url: req.query.buttonUrl,     // Button URL (e.g., the song URL)
                    },
                ],
                startTimestamp: parseInt(req.query.startTimestamp), // Convert to integer
                endTimestamp: parseInt(req.query.endTimestamp),     // Convert to integer
            }).then(() => {
                currentActivity = req.query.title; // Store the current activity
                res.sendStatus(200);
                console.log("Activity updated");
            }).catch(err => {
                console.error(err);
                res.sendStatus(500);
            });
        } else {
            // Music is paused, clear the activity
            if (currentActivity) {
                rpc.clearActivity().then(() => {
                    currentActivity = null; // Clear the stored activity
                    res.sendStatus(200);
                    console.log("Activity cleared (music paused)");
                }).catch(err => {
                    console.error(err);
                    res.sendStatus(500);
                });
            } else {
                res.sendStatus(200); // No activity to clear
            }
        }
    } else {
        res.sendStatus(500);
    }
});