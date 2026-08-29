(function (global) {
    "use strict";

    var VERSION = "3.13";

    function toggleMarkup(id, label) {
        return `
                    <div>
                        <div class="checkbox-wrapper-51">
                            <label for="${id}" class="title">${label}</label>
                            <input type="checkbox" id="${id}" name="${id}" />
                            <label for="${id}" class="toggle">
                                <span>
                                    <svg width="10px" height="10px" viewBox="0 0 10 10">
                                        <path
                                            d="M5,1 L5,1 C2.790861,1 1,2.790861 1,5 L1,5 C1,7.209139 2.790861,9 5,9 L5,9 C7.209139,9 9,7.209139 9,5 L9,5 C9,2.790861 7.209139,1 5,1 L5,9 L5,1 Z">
                                        </path>
                                    </svg>
                                </span>
                            </label>
                        </div>
                    </div>`;
    }

    /* opts.withDone adds the modal's "Done" button. The inline page has nothing
       to dismiss, so it asks for the panel without one. */
    function markup(opts) {
        var withDone = !!(opts && opts.withDone);
        return `
<div class="settingsPanel">
    <div class="modalSettings">
        <div>
            <h3><i class="fa-solid fa-language"></i>Language</h3>
            <div>
                <select name="language" id="language" class="button">
                    <option value="en" selected>English</option>
                    <option value="sv">Svenska (Swedish)</option>
                    <option value="hr">Hrvatski (Croatian)</option>
                    <option value="bs">Bosanski (Bosnian)</option>
                </select>
            </div>
        </div>
        <div>
            <h3><i class="fa-solid fa-brush"></i>Theme</h3>
            <div class="themeOptions options">
                <input type="radio" id="auto" name="theme-color" value="auto" class="theme-option" checked>
                <label for="auto" class="auto button theme-label"><i class="fa-solid fa-laptop"></i>Follow
                    system</label>

                <input type="radio" id="light" name="theme-color" value="light" class="theme-option">
                <label for="light" class="light button theme-label"><i
                        class="fa-solid fa-sun"></i>Light</label>

                <input type="radio" id="dark" name="theme-color" value="dark" class="theme-option">
                <label for="dark" class="dark button theme-label"><i
                        class="fa-solid fa-moon"></i>Dark</label>
            </div>
        </div>
        <div>
            <h3><i class="fa-solid fa-border-top-left"></i>Style</h3>
            <div class="themeOptions options">
                <input type="radio" id="liquid-glass" name="style" value="liquid-glass" class="theme-option" checked>
                <label for="liquid-glass" class="auto button theme-label"><i class="fa-solid fa-droplet"></i>Liquid Glass</label>

                <input type="radio" id="flat" name="style" value="flat" class="theme-option">
                <label for="flat" class="light button theme-label"><i
                        class="fa-solid fa-layer-group"></i>Flat</label>
            </div>
            <!---<div id="liquidGlassDisabled"><span class="warn"><p>You need to disable Reduce transparency in order to use Liquid Glass.</p></span></div>--->
        </div>
        <div>
            <h3><i class="fa-solid fa-fill-drip"></i>Color</h3>
            <div class="colorOptions options">
                <input type="radio" id="red" name="accent-color" value="red">
                <label for="red" class="button">Red<span class="red"></span></label>

                <input type="radio" id="green" name="accent-color" value="green">
                <label for="green" class="button">Green<span class="green"></span></label>

                <input type="radio" id="blue" name="accent-color" value="blue" checked>
                <label for="blue" class="button">Blue<span class="blue"></span></label>

                <input type="radio" id="purple" name="accent-color" value="purple">
                <label for="purple" class="button">Purple<span class="purple"></span></label>

                <input type="radio" id="monochrome" name="accent-color" value="monochrome">
                <label for="monochrome" class="monochrome button">Monochrome</label>

            </div>
        </div>
        <div>
            <h3><i class="fa-solid fa-sliders"></i>General</h3>${toggleMarkup("autoUpdateActivity", "Automatically update activities")}
        </div>
        <div>
            <h3><i class="fa-solid fa-universal-access"></i>Accessibility</h3>${toggleMarkup("reduceMotion", "Reduce motion")}${toggleMarkup("reduceTransparency", "Reduce transparency")}
        </div>
    </div>
    <p class="modalDescription">version ${VERSION}</p>
    <div class="modalButtons">${withDone ? `
        <button type="button" class="button primary" onClick="toggleSettings()">Done</button>` : ""}
        <button type="button" class="button dangerZone destructive">Reset</button>
    </div>
</div>`;
    }

    // /settings/ carries an empty #settingsInline; fill it as soon as it exists.
    function renderInline() {
        var host = document.getElementById("settingsInline");
        if (!host || host.getAttribute("data-rendered")) return;
        host.innerHTML = markup({ withDone: false });
        host.setAttribute("data-rendered", "1");
    }

    global.SettingsPanel = { VERSION: VERSION, markup: markup };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderInline);
    } else {
        renderInline();
    }
})(window);
