(function() {
    let bannerCreated = false;
    let banner, msg, closeBtn, soundBtn;
    let lastPos = null;
    let dismissed = false;
    let pollIntervalId = null;
    let soundsEnabled = true;
    let tadaPlayed = false;

    // Local sounds
    const taDaSound = new Audio(chrome.runtime.getURL('ta-da.mp3'));
    const macQuackSound = new Audio(chrome.runtime.getURL('mac-quack.mp3'));

    // --- Helpers ---
    function playSound(audio) {
        if (!soundsEnabled) return;
        audio.play().catch(() => {});
    }

    function loadSoundSetting() {
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.get("soundsEnabled", (data) => {
                if (typeof data.soundsEnabled === "boolean") {
                    soundsEnabled = data.soundsEnabled;
                }
                if (soundBtn) {
                    soundBtn.textContent = soundsEnabled ? "🔈" : "🔇";
                }
            });
        }
    }

    function saveSoundSetting() {
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ soundsEnabled });
        }
    }

    // --- Create banner immediately, hidden ---
    function createBanner() {
        if (bannerCreated) return;
        bannerCreated = true;

        banner = document.createElement("div");
        banner.id = "pkcQueueBanner";
        banner.style.position = "fixed";
        banner.style.top = "10px";
        banner.style.right = "10px";
        banner.style.background = "#fffae5";
        banner.style.border = "1px solid #f5c518";
        banner.style.borderRadius = "6px";
        banner.style.padding = "8px 12px";
        banner.style.fontFamily = "sans-serif";
        banner.style.fontWeight = "bold";
        banner.style.zIndex = "9999";
        banner.style.minWidth = "220px"; // slightly wider for extra button
        banner.style.fontSize = "0.9em";
        banner.style.display = "none";
        banner.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";

        const topRow = document.createElement("div");
        topRow.style.display = "flex";
        topRow.style.justifyContent = "space-between";
        topRow.style.alignItems = "center";

        msg = document.createElement("div");
        msg.id = "pkcQueueMessage";
        msg.textContent = "";

        // Close button
        closeBtn = document.createElement("button");
        closeBtn.textContent = "✖";
        closeBtn.style.background = "transparent";
        closeBtn.style.border = "none";
        closeBtn.style.fontSize = "1em";
        closeBtn.style.cursor = "pointer";
        closeBtn.onclick = () => {
            banner.style.display = "none";
            dismissed = true;
        };

        topRow.appendChild(msg);
        topRow.appendChild(closeBtn);
        banner.appendChild(topRow);

        // Sound toggle button on its own row, centered
        soundBtn = document.createElement("button");
        soundBtn.textContent = soundsEnabled ? "🔈" : "🔇";
        soundBtn.style.background = "transparent";
        soundBtn.style.border = "none";
        soundBtn.style.fontSize = "1em";
        soundBtn.style.cursor = "pointer";
        soundBtn.onclick = () => {
            soundsEnabled = !soundsEnabled;
            soundBtn.textContent = soundsEnabled ? "🔈" : "🔇";
            saveSoundSetting();
        };

        const soundRow = document.createElement("div");
        soundRow.style.display = "flex";
        soundRow.style.justifyContent = "center"; // center horizontally
        soundRow.style.marginTop = "4px"; // optional spacing
        soundRow.appendChild(soundBtn);

        banner.appendChild(soundRow);

        document.body.appendChild(banner);
        bannerCreated = true;

        // Initialize from storage
        loadSoundSetting();
    }

    // --- Update banner based on queue position ---
    function handleQueueData(pos) {
        if (!bannerCreated) createBanner();

        // 🎵 Transition into success (only once)
        if (lastPos > 1 && (pos === null || pos <= 0)) {
            if (!tadaPlayed) {
                playSound(taDaSound);
                tadaPlayed = true;
            }
        }

        // Stop polling if pos is -1
        if (pos === -1) {
            console.warn("Queue pos is -1 — stopping poll");
            if (pollIntervalId) clearInterval(pollIntervalId);
            banner.style.display = "none";
            lastPos = pos;
            return;
        }

        // Hide if poll failed
        if (pos === null) {
            banner.style.display = "none";
            lastPos = pos;
            return;
        }

        // ✅ You're in!
        if (pos === 0) {
            msg.textContent = "✅ You're in!";
            banner.style.background = "#e6ffed";
            banner.style.borderColor = "#2ecc71";
            banner.style.display = "block";
            lastPos = pos;
            return;
        }

        // Still in queue (pos > 0)
        if (lastPos !== null && lastPos !== pos) {
            playSound(macQuackSound);
            if (dismissed) {
                banner.style.display = "block";
                dismissed = false;
            }
        }

        // Reset tada if back in queue
        if (pos > 0) {
            tadaPlayed = false;
        }

        msg.textContent = `⏳ Queue position: ${pos}`;
        banner.style.background = "#fffae5";
        banner.style.borderColor = "#f5c518";
        banner.style.display = "block";
        lastPos = pos;
    }

    // --- Poll the queue endpoint every 5 seconds ---
    async function pollQueue() {
        try {
            const response = await fetch("https://www.pokemoncenter.com/_Incapsula_Resource?SWWRGTS=868", {
                credentials: "include"
            });
            if (!response.ok) {
                console.warn("Queue poll failed — stopping poll");
                if (pollIntervalId) clearInterval(pollIntervalId);
                handleQueueData(null);
                return;
            }

            const data = await response.json();
            console.log("Queue data:", data);
            handleQueueData(data.pos);
        } catch (err) {
            console.error("Queue poll error — stopping poll:", err);
            if (pollIntervalId) clearInterval(pollIntervalId);
            handleQueueData(null);
        }
    }

    // --- Start polling every 5 seconds ---
    function startPolling() {
        pollIntervalId = setInterval(pollQueue, 5000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            createBanner();
            startPolling();
        });
    } else {
        createBanner();
        startPolling();
    }
})();
