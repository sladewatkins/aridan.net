/* The desktop settings modal: just the shell. The controls inside it come from
   settingsPanel.js, which must load first. */
(function () {
    function shell() {
        return `
<div id="settingsDialog">
    <div id="settingsModalMenu" class="modal">
        <div class="modal-content">
            <h2>Settings</h2>${window.SettingsPanel.markup({ withDone: true })}
        </div>
    </div>
</div>`;
    }

    function inject() {
        // Never add it twice - a page that still has its own copy wins.
        if (document.getElementById('settingsDialog')) return;
        // /settings/ shows the panel inline; a modal too would duplicate every
        // control id and break the radio groups.
        if (document.getElementById('settingsInline')) return;
        if (!window.SettingsPanel) return;
        document.body.insertAdjacentHTML('beforeend', shell().trim());
    }

    if (document.body) inject();
    else document.addEventListener('DOMContentLoaded', inject);
})();
