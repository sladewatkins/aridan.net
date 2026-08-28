(function () {
    "use strict";

    var Store = window.ArticleStore;

    function editUrl(slug) {
        return "/articles/edit/index.html?article=" + encodeURIComponent(slug);
    }

    function button(className, title, icon) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "button " + className;
        b.title = title;
        b.setAttribute("aria-label", title);
        b.innerHTML = '<i class="fa-solid ' + icon + '"></i>';
        return b;
    }

    function notice(text, kind) {
        var bar = document.getElementById("articleAdminNotice");
        if (!bar) return;
        bar.textContent = text || "";
        bar.className = "articleAdminNotice" + (kind ? " " + kind : "");
    }

    function addNoticeBar(parent) {
        var bar = document.createElement("p");
        bar.id = "articleAdminNotice";
        bar.className = "articleAdminNotice";
        bar.setAttribute("role", "status");
        bar.setAttribute("aria-live", "polite");
        parent.appendChild(bar);
        return bar;
    }

    function addNewButton() {
        var info = document.querySelector("main.container .info > div");
        if (!info || document.getElementById("newArticleButton")) return;

        var link = document.createElement("a");
        link.id = "newArticleButton";
        link.className = "button primary";
        link.href = "/articles/new/";
        link.innerHTML = '<i class="fa-solid fa-plus"></i>New article';
        info.appendChild(link);

        addNoticeBar(info);

        if (!Store.isSupported()) {
            var warn = document.createElement("span");
            warn.className = "warn browserSupportWarning";
            warn.id = "browserSupportWarning";
            var line = document.createElement("p");
            line.textContent = Store.UNSUPPORTED;
            warn.appendChild(line);
            (info.parentNode || info).appendChild(warn);
        }
    }

    function removeArticle(slug, onGone) {
        if (!confirm('Delete "' + slug + '"?\n\nThis deletes the file from assets/content/articles/ and cannot be undone.')) {
            return;
        }
        notice("Deleting " + slug + "…");
        Store.getDir(true)
            .then(function (dir) {
                if (!dir) { notice("No folder chosen, so nothing was deleted.", "error"); return; }
                return Store.deleteArticle(dir, slug)
                    .then(function () { return Store.rebuildIndex(dir); })
                    .then(function (slugs) { onGone(slugs); });
            })
            .catch(function (err) {
                console.error(err);
                notice("Couldn't delete " + slug + ": " + err.message, "error");
            });
    }

    function disableDelete(del) {
        del.disabled = true;
        del.title = Store.CANNOT_DELETE;
        del.setAttribute("aria-label", Store.CANNOT_DELETE);
    }

    function decorate(card) {
        var slug = card.dataset.slug;
        var actions = card.querySelector(".readMore");
        if (!slug || !actions || card.querySelector(".articleAdminActions")) return;

        var group = document.createElement("span");
        group.className = "articleAdminActions";

        var edit = document.createElement("a");
        edit.className = "button";
        edit.href = editUrl(slug);
        edit.title = "Edit this article";
        edit.setAttribute("aria-label", "Edit this article");
        edit.innerHTML = '<i class="fa-solid fa-pen"></i>';

        var del = button("destructive", "Delete this article", "fa-trash-can");
        if (Store.isSupported()) {
            del.addEventListener("click", function () {
                removeArticle(slug, function (slugs) {
                    card.remove();
                    notice("Deleted " + slug + ".md. " + slugs.length +
                           " article" + (slugs.length === 1 ? "" : "s") + " left.", "ok");
                });
            });
        } else {
            disableDelete(del);
        }

        group.appendChild(edit);
        group.appendChild(del);

        var arrow = actions.querySelector("a.backButton");
        if (arrow) arrow.parentNode.insertBefore(group, arrow);
        else actions.appendChild(group);
    }

    function enhance() {
        addNewButton();
        document.querySelectorAll(".articlePreview[data-slug]").forEach(decorate);
    }

    function labelledButton(tag, className, icon, text) {
        var el = document.createElement(tag);
        el.className = "button " + className;
        el.innerHTML = '<i class="fa-solid ' + icon + '"></i>' + text;
        return el;
    }

    function decorateArticle(slug) {
        var meta = document.querySelector(".full-article .info > div");
        if (!meta || document.getElementById("articleAdminBar")) return;

        var back = meta.querySelector("a.backButton");
        var row = document.createElement("div");
        row.id = "articleAdminBar";
        row.className = "articleAdminBar";

        if (back) row.appendChild(back);

        var edit = labelledButton("a", "", "fa-pen", "Edit");
        edit.href = editUrl(slug);
        row.appendChild(edit);

        var del = labelledButton("button", "destructive", "fa-trash-can", "Delete");
        del.type = "button";
        if (Store.isSupported()) {
            del.addEventListener("click", function () {
                removeArticle(slug, function () {
                    location.href = "/articles/";
                });
            });
        } else {
            disableDelete(del);
        }
        row.appendChild(del);

        meta.appendChild(row);
        addNoticeBar(meta);
    }

    function init() {
        if (!Store || !Store.isLocalHost()) return;

        var onArticlePage = /\/articles\/view\//.test(location.pathname);

        if (onArticlePage) {
            document.addEventListener("article:rendered", function (event) {
                decorateArticle(event.detail.slug);
            });
            if (document.querySelector(".full-article")) {
                var slug = new URLSearchParams(location.search).get("article");
                if (slug) decorateArticle(slug);
            }
            return;
        }

        document.addEventListener("articles:rendered", enhance);
        if (document.querySelector(".articlePreview[data-slug]")) enhance();
        else addNewButton();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
