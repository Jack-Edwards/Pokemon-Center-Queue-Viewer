(function() {
    let bannerCreated = false;
    let banner, msg, closeBtn, debugInput, debugBtn;
    let lastPos = null;
    let dismissed = false;

    // Toggle debug mode here
    const DEBUG = false;

    // Local sounds
    const taDaSound = new Audio(chrome.runtime.getURL('ta-da.mp3'));
    const macQuackSound = new Audio(chrome.runtime.getURL('mac-quack.mp3'));

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
        banner.style.display = DEBUG ? "block" : "none";

        const topRow = document.createElement("div");
        topRow.style.display = "flex";
        topRow.style.justifyContent = "space-between";
        topRow.style.alignItems = "center";

        msg = document.createElement("div");
        msg.id = "pkcQueueMessage";
        msg.textContent = DEBUG ? "Debug mode active" : "";

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

        // Add debug input if debug mode
        if (DEBUG) {
            const debugContainer = document.createElement("div");
            debugContainer.style.marginTop = "6px";
            debugContainer.style.display = "flex";
            debugContainer.style.gap = "4px";

            debugInput = document.createElement("input");
            debugInput.type = "number";
            debugInput.placeholder = "Queue position";
            debugInput.style.flex = "1";

            debugBtn = document.createElement("button");
            debugBtn.textContent = "Update";
            debugBtn.style.cursor = "pointer";
            debugBtn.onclick = () => {
                const val = parseInt(debugInput.value, 10);
                if (!isNaN(val)) handleQueueData(val);
            };

            debugContainer.appendChild(debugInput);
            debugContainer.appendChild(debugBtn);
            banner.appendChild(debugContainer);
        }

        document.body.appendChild(banner);
        bannerCreated = true;
    }

    function handleQueueData(pos) {
        if (!bannerCreated) createBanner();

        // User has entered the queue
        if (pos === 0) {
            banner.style.display = DEBUG ? "block" : "none";
            if (lastPos !== 0) {
                taDaSound.play().catch(() => {});
            }
            lastPos = pos;
            msg.textContent = DEBUG ? "Queue entered! pos=0" : "";
            return;
        }

        // Only show banner if position > 0 (or debug)
        if ((pos === null || pos <= 0) && !DEBUG) {
            banner.style.display = "none";
            lastPos = pos;
            return;
        }

        // Always quack when position changes (except hitting 0)
        if (lastPos !== null && lastPos !== pos) {
            macQuackSound.play().catch(() => {});
        }

        // Re-show if dismissed but position changed
        if (dismissed && lastPos !== null && lastPos !== pos) {
            banner.style.display = "block";
            dismissed = false;
        }

        lastPos = pos;

        msg.textContent = `⏳ Queue position: ${pos}`;
        banner.style.background = "#fffae5";
        banner.style.borderColor = "#f5c518";
        banner.style.display = "block";
    }


    // --- Initial fetch (skipped if DEBUG) ---
    if (!DEBUG) {
        fetch("/_Incapsula_Resource", { cache: "no-store" })
            .then(response => {
                if (!response.ok) {
                    handleQueueData(null);
                } else {
                    return response.json().then(data => handleQueueData(data.pos));
                }
            })
            .catch(() => handleQueueData(null));

        // --- Intercept fetch ---
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            try {
                const url = args[0];
                if (url.includes("/_Incapsula_Resource")) {
                    if (!response.ok) {
                        handleQueueData(null);
                    } else {
                        const cloned = response.clone();
                        const data = await cloned.json();
                        handleQueueData(data.pos);
                    }
                }
            } catch (err) {
                handleQueueData(null);
            }
            return response;
        };

        // --- Intercept XHR ---
        const origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(...args) {
            this.addEventListener("load", function() {
                if (this.responseURL.includes("/_Incapsula_Resource")) {
                    if (this.status >= 400) {
                        handleQueueData(null);
                    } else {
                        try {
                            const data = JSON.parse(this.responseText);
                            handleQueueData(data.pos);
                        } catch (err) {
                            handleQueueData(null);
                        }
                    }
                }
            });
            origSend.apply(this, args);
        };
    } else {
        // Debug: show initial simulated position
        handleQueueData(20000);
    }
})();
