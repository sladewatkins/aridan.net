(function () {
    "use strict";

    var AF = window.ArticleFormat;
    var Store = window.ArticleStore;

    var isEdit = /\/articles\/edit\//.test(location.pathname);
    var originalSlug = null;
    var slugEditedByHand = false;
    var dirty = false;
    var busy = false;
    var el = {};

    function viewUrl(slug) {
        return "/articles/view/index.html?article=" + encodeURIComponent(slug);
    }

    var bodyEditor = {
        instance: null,
        get: function () {
            return this.instance ? this.instance.getMarkdown() : el.body.value;
        },
        set: function (text) {
            if (this.instance) this.instance.setMarkdown(text || "", false);
            else el.body.value = text || "";
        }
    };

    function applyEditorTheme() {
        if (!el.bodyHost || !bodyEditor.instance) return;
        el.bodyHost.classList.toggle(
            "toastui-editor-dark",
            document.documentElement.classList.contains("theme-dark")
        );
    }

    function useTextareaFallback() {
        el.body.classList.remove("hide");
        if (el.bodyHost) el.bodyHost.classList.add("hide");
    }

    function initBodyEditor() {
        var Editor = window.toastui && window.toastui.Editor;
        if (!el.bodyHost || !Editor) { useTextareaFallback(); return; }

        try {
            bodyEditor.instance = new Editor({
                el: el.bodyHost,
                height: "auto",
                minHeight: "420px",
                initialEditType: "wysiwyg",
                previewStyle: "vertical",
                hideModeSwitch: false,
                usageStatistics: false,
                autofocus: false,
                initialValue: ""
            });
            bodyEditor.instance.on("change", markDirty);
            applyEditorTheme();
            new MutationObserver(applyEditorTheme).observe(document.documentElement, {
                attributes: true, attributeFilter: ["class"]
            });
        } catch (err) {
            console.error("Couldn't start the rich editor, using a plain textarea:", err);
            useTextareaFallback();
        }
    }

    function status(message, kind) {
        el.status.textContent = message || "";
        el.status.className = "editorStatus" + (kind ? " " + kind : "");
    }

    function isShowingError() {
        return el.status.classList.contains("error");
    }

    function markDirty() {
        dirty = true;
        if (isShowingError() && !el.save.disabled) status("");
    }

    function setBusy(state) {
        busy = state;
        [el.save, el.download, el.remove, el.pickFolder].forEach(function (button) {
            if (button && !button.dataset.permanentlyDisabled) button.disabled = state;
        });
    }

    function disablePermanently(button, why) {
        if (!button) return;
        button.disabled = true;
        button.title = why;
        button.dataset.permanentlyDisabled = "true";
    }

    function buildFile() {
        return AF.stringify({
            title: el.title.value.trim(),
            date: el.date.value,
            preview: el.preview.value.trim()
        }, bodyEditor.get());
    }

    function fillForm(meta, body) {
        el.title.value = meta.title || "";
        el.date.value = AF.formatDate(meta.date).match(/^\d{4}-\d{2}-\d{2}$/)
            ? AF.formatDate(meta.date)
            : "";
        el.preview.value = meta.preview || "";
        bodyEditor.set(body || "");
        dirty = false;
    }

    function validate() {
        if (!el.title.value.trim()) return { field: el.title, message: "Give the article a title." };
        if (!el.slug.value.trim()) return { field: el.slug, message: "Give the article a file name." };
        if (!AF.isValidSlug(el.slug.value.trim())) {
            return {
                field: el.slug,
                message: "File name can only use lowercase letters, numbers and dashes."
            };
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(el.date.value)) return { field: el.date, message: "Pick a date." };
        if (!bodyEditor.get().trim()) return { field: null, message: "The article has no body yet." };
        return null;
    }

    function reportProblem(problem) {
        status(problem.message, "error");
        if (problem.field) problem.field.focus({ preventScroll: false });
    }

    function setFolderState(dir) {
        el.folderState.textContent = dir
            ? 'Saving into "' + dir.name + '".'
            : "No folder chosen yet.";
        el.folderBar.classList.toggle("resolved", !!dir);
        if (el.pickFolder) {
            el.pickFolder.textContent = dir ? "Change" : "Choose folder";
            el.pickFolder.title = dir
                ? "Pick a different folder"
                : "Pick assets/content/articles/";
        }
        return dir;
    }

    function confirmUnfamiliar(dir) {
        if (!dir) return Promise.resolve(null);
        return Store.looksLikeArticlesDir(dir).then(function (looksRight) {
            if (looksRight) return dir;
            var ok = confirm(
                '"' + dir.name + '" has no articles in it.\n\n' +
                "Saving here creates a new index.json in that folder. Use it anyway?"
            );
            return ok ? dir : null;
        });
    }

    function pickFolder() {
        return Store.pickDir()
            .then(confirmUnfamiliar)
            .then(function (dir) {
                if (!dir) return Store.savedDir(false).then(setFolderState);
                setFolderState(dir);
                if (isShowingError()) status("");
                return dir;
            })
            .catch(function (err) {
                status("Couldn't open that folder: " + err.message, "error");
                return null;
            });
    }

    function ensureFolder() {
        return Store.getDir(true).then(setFolderState);
    }

    function failed(what) {
        return function (err) {
            console.error(err);
            status("Couldn't " + what + ": " + err.message, "error");
        };
    }

    function save(event) {
        if (event) event.preventDefault();
        if (busy) return;

        var problem = validate();
        if (problem) { reportProblem(problem); return; }

        if (!Store.isSupported()) {
            status(Store.UNSUPPORTED, "error");
            return;
        }

        var slug = el.slug.value.trim();
        var contents = buildFile();

        setBusy(true);
        status("Saving…");

        ensureFolder()
            .then(function (dir) {
                if (!dir) { status("No folder chosen, so nothing was saved.", "error"); return; }

                return Store.exists(dir, slug).then(function (already) {
                    if (already && slug !== originalSlug &&
                        !confirm(slug + ".md already exists in this folder. Overwrite it?")) {
                        status("Nothing was saved.");
                        return;
                    }
                    return Store.writeArticle(dir, slug, contents)
                        .then(function () { return Store.rebuildIndex(dir); })
                        .then(function () {
                            dirty = false;
                            status("Saved " + slug + ".md. Opening it…", "ok");
                            location.href = viewUrl(slug);
                        });
                });
            })
            .catch(failed("save " + slug + ".md"))
            .finally(function () { setBusy(false); });
    }

    function remove() {
        if (busy || !originalSlug) return;
        if (!confirm('Delete "' + originalSlug + '"?\n\nThis deletes the file from ' +
                     "assets/content/articles/ and cannot be undone.")) {
            return;
        }

        setBusy(true);
        status("Deleting…");

        ensureFolder()
            .then(function (dir) {
                if (!dir) { status("No folder chosen, so nothing was deleted.", "error"); return; }
                return Store.deleteArticle(dir, originalSlug)
                    .then(function () { return Store.rebuildIndex(dir); })
                    .then(function () {
                        dirty = false;
                        location.href = "/articles/";
                    });
            })
            .catch(failed("delete " + originalSlug))
            .finally(function () { setBusy(false); });
    }

    function download() {
        var problem = validate();
        if (problem) { reportProblem(problem); return; }

        var slug = el.slug.value.trim();
        var url = URL.createObjectURL(new Blob([buildFile()], { type: "text/markdown" }));
        var a = document.createElement("a");
        a.href = url;
        a.download = slug + ".md";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

        status(
            isEdit
                ? "Downloaded " + slug + ".md - replace the file of the same name in " +
                  "assets/content/articles/ to save your changes."
                : "Downloaded " + slug + '.md - move it into assets/content/articles/ and add "' +
                  slug + '" to index.json.',
            "ok"
        );
    }

    function showSpinner(state) {
        if (el.spinner) el.spinner.style.display = state ? "block" : "none";
    }

    function revealForm() {
        showSpinner(false);
        el.layout.classList.remove("hide");
    }

    function cannotEdit(message, why) {
        showSpinner(false);
        status(message, "error");
        disablePermanently(el.save, why);
        disablePermanently(el.remove, why);
    }

    function loadForEditing() {
        var slug = new URLSearchParams(location.search).get("article");
        if (!slug || !AF.isValidSlug(slug)) {
            cannotEdit("No article to edit - open this page from the Articles list.",
                       "There's no article loaded.");
            return;
        }

        originalSlug = slug;
        el.slug.value = slug;
        el.slug.readOnly = true;
        el.slugHint.textContent = "Fixed for an existing article, so its address doesn't change.";

        fetch(AF.DIR_URL + encodeURIComponent(slug) + ".md", { cache: "no-cache" })
            .then(function (res) {
                if (!res.ok) throw new Error("Couldn't load " + slug + ".md (" + res.status + ").");
                return res.text();
            })
            .then(function (text) {
                var parsed = AF.parse(text);
                fillForm(parsed.meta, parsed.body);
                revealForm();
                status("");
            })
            .catch(function (err) {
                cannotEdit(err.message, "This article couldn't be loaded.");
            });
    }

    function bindShortcuts() {
        document.addEventListener("keydown", function (event) {
            if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "s") {
                event.preventDefault();
                if (!el.save.disabled) save();
            }
        });

        window.addEventListener("beforeunload", function (event) {
            if (!dirty) return;
            event.preventDefault();
            event.returnValue = "";
        });
    }

    function init() {
        el = {
            form: document.getElementById("editorForm"),
            title: document.getElementById("fieldTitle"),
            slug: document.getElementById("fieldSlug"),
            slugHint: document.getElementById("slugHint"),
            date: document.getElementById("fieldDate"),
            preview: document.getElementById("fieldPreview"),
            body: document.getElementById("fieldBody"),
            bodyHost: document.getElementById("fieldBodyEditor"),
            layout: document.querySelector(".editorLayout"),
            spinner: document.getElementById("loading"),
            status: document.getElementById("editorStatus"),
            folderBar: document.getElementById("editorFolderBar"),
            folderState: document.getElementById("editorFolderState"),
            pickFolder: document.getElementById("editorPickFolder"),
            save: document.getElementById("saveArticle"),
            download: document.getElementById("downloadArticle"),
            remove: document.getElementById("deleteArticle")
        };
        if (!el.form || !el.title) return;

        el.date.value = AF.todayISO();
        initBodyEditor();

        el.form.addEventListener("input", markDirty);
        el.form.addEventListener("submit", save);
        el.title.addEventListener("input", function () {
            if (!isEdit && !slugEditedByHand) el.slug.value = AF.slugify(el.title.value);
        });
        el.slug.addEventListener("input", function () {
            slugEditedByHand = el.slug.value.trim() !== "";
        });

        el.download.addEventListener("click", download);
        if (el.remove) el.remove.addEventListener("click", remove);
        if (el.pickFolder) el.pickFolder.addEventListener("click", pickFolder);

        if (Store.isSupported()) {
            Store.savedDir(false).then(setFolderState);
        } else {
            if (el.pickFolder) el.pickFolder.remove();
            el.pickFolder = null;
            el.folderState.textContent = Store.UNSUPPORTED;
            disablePermanently(el.save, Store.CANNOT_SAVE);
            disablePermanently(el.remove, Store.CANNOT_DELETE);
            el.download.classList.add("primary");
        }

        bindShortcuts();

        if (isEdit) loadForEditing();

        el.title.focus({ preventScroll: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
