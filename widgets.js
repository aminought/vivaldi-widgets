(function widgets() {
    "use strict";

    const START_PAGE_BUTTON = 'Widgets';
    /* 
    EXAMPLE:
    const WIDGETS = [
        {
            id: 'VivaldiProfileWidget',
            url: 'https://forum.vivaldi.net/user/aminought',
            selector: '.profile.row',
            zoomFactor: 0.8,
            width: '240px',
            height: '248px'
        }
    ];
    */
    const WIDGETS = [];
    const DELAY = 100;

    class Widgets {
        #widgets = null;
        #sdWrapperMutationObserver = null;

        constructor() {
            this.#createWidgets();
            this.#addWidgets();
            this.#createSdWrapperMutationObserver();
            this.#createTabActivationListener();
        }

        // listeners

        #createTabActivationListener() {
            chrome.tabs.onActivated.addListener(() => {
                this.#addWidgetsDelayed();
                if (this.#sdWrapperMutationObserver) this.#sdWrapperMutationObserver.disconnect();
                this.#createSdWrapperMutationObserverDelayed();
            });
        }

        #createSdWrapperMutationObserverDelayed() {
            setTimeout(() => this.#createSdWrapperMutationObserver(), DELAY);
        }

        #createSdWrapperMutationObserver() {
            if (!this.#isStartPage) {
                return
            };
            if (!this.#speedDial) {
                this.#createSdWrapperMutationObserverDelayed();
                return;
            }
            this.#sdWrapperMutationObserver = new MutationObserver(() => {
                this.#addWidgets();
            });
            this.#sdWrapperMutationObserver.observe(this.#sdWrapper, {
                childList: true,
                subtree: true
            });
        }

        // builders

        #createWidgetsDelayed() {
            setTimeout(() => this.#createWidgets(), DELAY);
        }

        #createWidgets() {
            this.#widgets = this.#createWidgetsDiv();
            if (!this.#widgets) {
                this.#createWidgetsDelayed();
                return;
            }
            WIDGETS.forEach((widgetInfo) => {
                const widget = this.#createWidget(widgetInfo);
                this.#widgets.appendChild(widget);
            });
        }

        #createWidgetsDiv() {
            const widgetsDiv = document.createElement('div');
            widgetsDiv.id = 'Widgets';
            widgetsDiv.style.position = 'relative';
            widgetsDiv.style.display = 'flex';
            widgetsDiv.style.flexDirection = 'row';
            widgetsDiv.style.flexWrap = 'wrap';
            widgetsDiv.style.justifyContent = 'center';
            widgetsDiv.style.maxWidth = '80%';
            widgetsDiv.style.backgroundColor = 'var(--colorBgAlphaBlur)';
            widgetsDiv.style.backdropFilter = 'var(--backgroundBlur)';
            widgetsDiv.style.borderRadius = 'var(--radius)';
            return widgetsDiv;
        }

        #createWidget(widgetInfo) {
            const id = widgetInfo.id;
            const url = widgetInfo.url;
            const zoomFactor = widgetInfo.zoomFactor;
            const width = widgetInfo.width;
            const height = widgetInfo.height;
            const selector = widgetInfo.selector;

            const widget = this.#createWidgetDiv(width, height);
            const webview = this.#createWebview(id, url, zoomFactor);
            this.#filterSelector(webview, selector);
            widget.appendChild(webview);

            return widget;
        }

        #createWidgetDiv(width, height) {
            const widget = document.createElement('div');
            widget.id = 'Widget';
            widget.style.position = 'relative';
            widget.style.width = `calc(${width} + 12px)`;
            widget.style.height = `calc(${height} + 28px)`;
            widget.style.margin = '10px';
            return widget;
        }

        #createWebview(id, url, zoomFactor) {
            const webview = document.createElement('webview');
            webview.id = id;
            webview.src = url;
            webview.style.position = 'relative';
            webview.style.width = '100%';
            webview.style.height = '100%';
            webview.setZoom(zoomFactor);
            return webview;
        }

        // actions

        #addWidgetsDelayed() {
            setTimeout(() => this.#addWidgets(), DELAY);
        }

        #addWidgets() {
            if (!this.#isStartPage || this.#widgetsDiv) {
                return;
            };
            if (!this.#speedDial) {
                this.#addWidgetsDelayed();
                return;
            }
            if (START_PAGE_BUTTON && this.#activeStartPageButton.innerText != START_PAGE_BUTTON) {
                return;
            }
            this.#speedDial.appendChild(this.#widgets);
        }

        #filterSelector(webview, selector) {
            const script = `(() => {
                var toDelete = [];
                var e = document.querySelector('${selector}');
                e.style.margin = 0;
                while (e.nodeName != 'BODY') {
                    for (var c of e.parentElement.children) {
                        if (!['STYLE', 'SCRIPT'].includes(c.nodeName) && c !== e) {
                            toDelete.push({parent: e.parentElement, child: c});
                        }
                    }
                    e.style.overflow = 'visible';
                    e = e.parentElement;
                    e.style.padding = 0;
                    e.style.margin = 0;
                }
                toDelete.forEach(e => {
                    e.parent.removeChild(e.child)
                });
                const body = document.querySelector('body');
            })()`;
            webview.addEventListener('loadcommit', () => webview.executeScript({code: script}));
        }

        // getters

        get #title() {
            return document.querySelector('title');
        }

        get #internalPage() {
            return document.querySelector('.webpageview.active .internal-page');
        }

        get #speedDial() {
            return this.#internalPage?.querySelector('.dials.speeddial');
        }

        get #widgetsDiv() {
            return this.#internalPage?.querySelector('#Widgets');
        }

        get #sdWrapper() {
            return this.#internalPage?.querySelector('.sdwrapper div');
        }

        get #activeStartPageButton() {
            return this.#internalPage?.querySelector('.button-startpage.active');
        }

        get #isStartPage() {
            return this.#title.innerText === 'Start Page';
        }
    };

    function initMod() {
        window.widgets = new Widgets();
    }

    setTimeout(initMod, 500);
})();
