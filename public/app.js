// The script of the Burnout site. It reads the latest release from the GitHub
// API, fills the download table, sets the install command for the system of
// the visitor, and makes the copy buttons work.
//
// The page works without this file: the downloads then link to the latest
// release on GitHub. Nothing here changes at a release, because the table
// comes from the release itself.

(function () {
  "use strict";

  var REPO = "Stiven-Gjekaj/burnout";
  var API = "https://api.github.com/repos/" + REPO + "/releases/latest";
  var CACHE_KEY = "burnout-latest-release";
  var CACHE_MS = 15 * 60 * 1000;

  // The target of each binary, in the order of the table.
  var TARGETS = [
    { suffix: "x86_64-pc-windows-msvc.exe", system: "Windows", processor: "x86_64" },
    { suffix: "aarch64-pc-windows-msvc.exe", system: "Windows", processor: "arm64" },
    { suffix: "aarch64-apple-darwin", system: "macOS", processor: "Apple silicon" },
    { suffix: "x86_64-apple-darwin", system: "macOS", processor: "Intel" },
    { suffix: "x86_64-unknown-linux-musl", system: "Linux", processor: "x86_64" },
    { suffix: "aarch64-unknown-linux-musl", system: "Linux", processor: "arm64" }
  ];

  var INSTALL = {
    macOS: { label: "Install with Homebrew", command: "brew install stiven-gjekaj/tap/burnout" },
    Linux: { label: "Install with Homebrew", command: "brew install stiven-gjekaj/tap/burnout" },
    Windows: {
      label: "Install with Scoop, in PowerShell",
      command: "scoop bucket add stiven-gjekaj https://github.com/Stiven-Gjekaj/scoop-bucket; scoop install stiven-gjekaj/burnout"
    }
  };

  function visitorSystem() {
    var ua = navigator.userAgentData;
    var text = (ua && ua.platform) || navigator.platform || navigator.userAgent || "";
    if (/win/i.test(text)) return "Windows";
    if (/mac|iphone|ipad/i.test(text)) return "macOS";
    if (/linux|x11|cros/i.test(text)) return "Linux";
    return null;
  }

  // Sizes in powers of ten, as Burnout gives them.
  function megabytes(bytes) {
    return (bytes / 1e6).toFixed(1) + " MB";
  }

  function grouped(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function longDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  }

  function element(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  function copyButton(value, label) {
    var b = element("button", "copy", "Copy");
    b.type = "button";
    b.setAttribute("data-copy", value);
    b.setAttribute("aria-label", label);
    return b;
  }

  function readCache() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (saved && Date.now() - saved.at < CACHE_MS) return saved.release;
    } catch (e) {
      // A private window can refuse storage. The page then asks GitHub again.
    }
    return null;
  }

  function writeCache(release) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), release: release }));
    } catch (e) {
      // Nothing to do: the cache only saves a request.
    }
  }

  // Keep only the fields that the page shows.
  function slim(data) {
    return {
      tag: data.tag_name,
      url: data.html_url,
      published: data.published_at,
      assets: (data.assets || []).map(function (a) {
        return { name: a.name, size: a.size, url: a.browser_download_url, digest: a.digest || "" };
      })
    };
  }

  function fetchRelease() {
    var cached = readCache();
    if (cached) return Promise.resolve(cached);
    return fetch(API, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (response) {
        if (!response.ok) throw new Error("GitHub answered " + response.status);
        return response.json();
      })
      .then(function (data) {
        var release = slim(data);
        writeCache(release);
        return release;
      });
  }

  function showRelease(release, system) {
    var version = release.tag.replace(/^v/, "");
    var rows = document.querySelector("[data-downloads]");
    var byName = {};
    release.assets.forEach(function (a) {
      byName[a.name] = a;
    });

    var built = [];
    TARGETS.forEach(function (t) {
      var asset = byName["burnout-" + version + "-" + t.suffix];
      if (!asset) return;
      var tr = element("tr", t.system === system ? "yours" : "");
      var sys = element("td", "sys");
      var name = element("div", "sys-name");
      name.appendChild(element("strong", null, t.system));
      name.appendChild(element("span", "proc", t.processor));
      if (t.system === system) name.appendChild(element("span", "you", "This system"));
      sys.appendChild(name);
      sys.appendChild(element("div", "fname", asset.name));
      tr.appendChild(sys);

      var size = element("td", "size", megabytes(asset.size));
      size.title = grouped(asset.size) + " bytes";
      tr.appendChild(size);

      var hash = element("td", "sha");
      var sha = asset.digest.replace(/^sha256:/, "");
      if (/^[0-9a-f]{64}$/.test(sha)) {
        var box = element("span", "hash");
        var code = element("code", null, sha.slice(0, 12) + "..." + sha.slice(-6));
        code.title = sha;
        box.appendChild(code);
        box.appendChild(copyButton(sha, "Copy the SHA-256 of " + asset.name));
        hash.appendChild(box);
      } else {
        hash.textContent = "In SHA256SUMS";
      }
      tr.appendChild(hash);

      var get = element("td", "get");
      var link = element("a", "btn small", "Download");
      link.href = asset.url;
      link.setAttribute("aria-label", "Download " + asset.name);
      get.appendChild(link);
      tr.appendChild(get);
      built.push(tr);
    });

    if (!built.length) throw new Error("the release holds none of the six binaries");
    rows.replaceChildren.apply(rows, built);

    var sums = byName.SHA256SUMS;
    var line = document.querySelector("[data-release-line]");
    line.replaceChildren(
      document.createTextNode("Burnout " + version + ", released on " + longDate(release.published) + ". ")
    );
    var notes = element("a", null, "Release notes");
    notes.href = release.url;
    line.appendChild(notes);
    if (sums) {
      line.appendChild(document.createTextNode(". "));
      var sumsLink = element("a", null, "SHA256SUMS");
      sumsLink.href = sums.url;
      line.appendChild(sumsLink);
    }
    line.appendChild(document.createTextNode("."));

    document.querySelectorAll("[data-version]").forEach(function (e) {
      e.textContent = version;
    });
    var label = document.querySelector("[data-latest-label]");
    if (label) label.textContent = "Download " + version;
    var meta = document.querySelector("[data-latest-meta]");
    if (meta) meta.textContent = "Version " + version + ". Open source, under the MIT licence.";
  }

  function showFailure() {
    var rows = document.querySelector("[data-downloads]");
    if (rows) rows.closest(".table-wrap").hidden = true;
    var fallback = document.querySelector("[data-fallback]");
    if (fallback) fallback.hidden = false;
  }

  function setInstall(system) {
    var choice = INSTALL[system];
    if (!choice) return;
    var label = document.querySelector("[data-install-label]");
    var command = document.querySelector("[data-install-command]");
    if (label) label.textContent = choice.label;
    if (command) command.textContent = choice.command;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = element("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      var done = false;
      try {
        done = document.execCommand("copy");
      } catch (e) {
        done = false;
      }
      document.body.removeChild(area);
      if (done) resolve();
      else reject(new Error("copy refused"));
    });
  }

  // The code element that a copy button belongs to.
  function sourceOf(button) {
    var selector = button.getAttribute("data-copy-from");
    if (selector) return document.querySelector(selector);
    var box = button.closest(".cmd, .hash");
    return box ? box.querySelector("code") : null;
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-copy], button[data-copy-from]");
    if (!button) return;
    var source = sourceOf(button);
    var text = button.getAttribute("data-copy");
    if (text == null) text = source ? source.textContent : "";
    copyText(text).then(
      function () {
        button.textContent = "Copied";
        button.setAttribute("data-done", "");
        setTimeout(function () {
          button.textContent = "Copy";
          button.removeAttribute("data-done");
        }, 1600);
      },
      function () {
        // The browser refused the clipboard. Select the text, so that the
        // person can copy it with the keys of the system.
        // A hash shows only its ends, so show all of it first.
        if (source) {
          if (source.textContent !== text) source.textContent = text;
          window.getSelection().selectAllChildren(source);
        }
        button.textContent = "Selected";
      }
    );
  });

  var system = visitorSystem();
  setInstall(system);
  fetchRelease().then(
    function (release) {
      try {
        showRelease(release, system);
      } catch (e) {
        showFailure();
      }
    },
    showFailure
  );
})();
