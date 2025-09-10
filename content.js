(function() {
    let bannerCreated = false;
    let banner, msg, closeBtn;
    let lastPos = null;
    let dismissed = false;

    // Local sounds
    const taDaSound = new Audio(chrome.runtime.getURL('ta-da.mp3'));
    const macQuackSound = new Audio(chrome.runtime.getURL('mac-quack.mp3'));

    // --- Create banner immediately, hidden ---
    function createBanner() {
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
        banner.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
        banner.style.minWidth = "200px";
        banner.style.fontSize = "0.9em";
        banner.style.display = "none"; // start hidden

        const topRow = document.createElement("div");
        topRow.style.display = "flex";
        topRow.style.justifyContent = "space-between";
        topRow.style.alignItems = "center";

        msg = document.createElement("div");
        msg.id = "pkcQueueMessage";
        msg.textContent = "";

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

        document.body.appendChild(banner);
        bannerCreated = true;
    }

    // --- Update banner based on queue position ---
    function handleQueueData(pos) {
        if (!bannerCreated) createBanner();

        // Out of queue → hide
        if (pos === null || pos <= 0) {
            banner.style.display = "none";
            lastPos = pos;
            return;
        }

        // Entered the queue (pos === 0)
        if (pos === 0) {
            if (lastPos !== 0) {
                taDaSound.play().catch(() => {});
            }
            msg.textContent = "✅ You're in!";
            banner.style.background = "#e6ffed";
            banner.style.borderColor = "#2ecc71";
            banner.style.display = "block";
            lastPos = pos;
            return;
        }

        // Queue position > 0
        if (lastPos !== null && lastPos !== pos) {
            macQuackSound.play().catch(() => {});
        }

        // If dismissed but position changed, re-show
        if (dismissed && lastPos !== null && lastPos !== pos) {
            banner.style.display = "block";
            dismissed = false;
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
                credentials: "include" // send cookies if needed
            });
            if (!response.ok) {
                handleQueueData(null);
                return;
            }

            const data = await response.json();
            console.log("Queue data:", data); // debug log
            handleQueueData(data.pos);
        } catch (err) {
            console.error("Queue poll error:", err);
            handleQueueData(null);
        }
    }

    // --- Start polling every 5 seconds ---
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            createBanner();
            pollQueue();
            setInterval(pollQueue, 5000);
        });
    } else {
        createBanner();
        pollQueue();
        setInterval(pollQueue, 5000);
    }
})();
