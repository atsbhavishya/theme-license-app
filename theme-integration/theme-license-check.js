(function () {
  var CACHE_KEY = "ats_license";
  var CACHE_TTL = 5 * 60 * 1000;
  var PROXY_URL = "/apps/theme-license/verify-license";
  var OVERLAY_MESSAGE = "Store is not authorized. Contact ATS Studio.";

  function isAuthorized(result) {
    return !(result && result.authorized === false);
  }

  function getCache() {
    try {
      var cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      if (cached && Date.now() < cached.expiresAt) {
        return cached.result;
      }
    } catch (e) {
      // ignore
    }
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  }

  function setCache(result) {
    if (isAuthorized(result)) {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ result: result, expiresAt: Date.now() + CACHE_TTL }),
      );
      return;
    }
    sessionStorage.removeItem(CACHE_KEY);
  }

  function showOverlayOnly() {
    var overlay = document.getElementById("ats-license-overlay");
    if (overlay) {
      var messageEl = overlay.querySelector("[data-ats-license-message]");
      if (messageEl) {
        messageEl.textContent = OVERLAY_MESSAGE;
      }
    }
    document.documentElement.classList.add("ats-license-blocked");
  }

  function showTheme() {
    document.documentElement.classList.remove("ats-license-blocked");
  }

  function applyResult(result) {
    if (isAuthorized(result)) {
      showTheme();
      return;
    }
    showOverlayOnly();
  }

  function verifyLicense() {
    var cached = getCache();
    if (cached) {
      applyResult(cached);
      return;
    }

    fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(window.ATS_THEME_LICENSE_DATA || {}),
    })
      .then(function (response) {
        if (!response.ok) {
          return { authorized: false, error: OVERLAY_MESSAGE };
        }
        return response.json();
      })
      .then(function (result) {
        setCache(result);
        applyResult(result);
      })
      .catch(function () {
        applyResult({ authorized: false, error: OVERLAY_MESSAGE });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", verifyLicense);
  } else {
    verifyLicense();
  }
})();
