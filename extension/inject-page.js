(function () {
    if (window.__AutoYTInjected) return;
    window.__AutoYTInjected = true;

    function trySet(v) {
        try {
            // Apply to all video elements
            var vids = document.querySelectorAll('video');
            vids.forEach(function (video) { try { video.volume = v; } catch (e) { } });

            // Try to update ytcfg if present
            try {
                if (window.ytcfg && typeof window.ytcfg.set === 'function') {
                    try { window.ytcfg.set('player-volume', v); } catch (e) { }
                }
            } catch (e) { }

            // Heuristic: update localStorage entries that mention "vol" or "player"
            try {
                for (var i = 0; i < localStorage.length; i++) {
                    try {
                        var key = localStorage.key(i);
                        if (!key) continue;
                        var lk = key.toLowerCase();
                        if (!/vol|volume|player|yt-player|ytplayer|ytcfg|pref/.test(lk)) continue;
                        var raw = localStorage.getItem(key);
                        if (raw == null) continue;
                        try {
                            var parsed = JSON.parse(raw);
                            var mutated = false;
                            (function walk(obj) {
                                if (!obj || typeof obj !== 'object') return;
                                Object.keys(obj).forEach(function (prop) {
                                    try {
                                        var val = obj[prop];
                                        if (typeof val === 'number' && /vol|volume/i.test(prop)) { obj[prop] = val <= 1 ? v : Math.round(v * 100); mutated = true; }
                                        else if (typeof val === 'string' && /vol|volume/i.test(prop)) { var n = parseFloat(val); if (!isNaN(n)) { obj[prop] = n <= 1 ? String(v) : String(Math.round(v * 100)); mutated = true; } }
                                        else if (val && typeof val === 'object') walk(val);
                                    } catch (e) { }
                                });
                            })(parsed);
                            if (mutated) localStorage.setItem(key, JSON.stringify(parsed));
                        } catch (e) {
                            var n = parseFloat(raw);
                            if (!isNaN(n)) {
                                if (n <= 1) localStorage.setItem(key, String(v)); else localStorage.setItem(key, String(Math.round(v * 100)));
                            }
                        }
                    } catch (e) { }
                }
            } catch (e) { }
        } catch (e) { }
    }

    document.addEventListener('AutoYT_SetVolume', function (e) {
        try {
            var vol = e && e.detail && e.detail.volume ? e.detail.volume : 0;
            vol = Math.max(0, Math.min(1, Number(vol) || 0));
            trySet(vol);
        } catch (e) { }
    }, false);
})();
