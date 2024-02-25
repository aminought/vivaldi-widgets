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
            width: '292px',
            height: '266px',
            timeout: 0
        }
    ];
    */
    const WIDGETS = [];
    const DELAY = 100;

    const APPEARANCE_PRESETS = [
        {
            widgets: {
                backgroundColor: 'var(--colorBgAlphaBlur)',
                backdropFilter: 'var(--backgroundBlur)'
            },
            widget: {
                backgroundColor: 'transparent',
                backdropFilter: 'none',
                padding: '0px',
                borderRadius: '0px'
            }
        },
        {
            widgets: {
                backgroundColor: 'transparent',
                backdropFilter: 'none'
            },
            widget: {
                backgroundColor: 'var(--colorBgAlphaBlur)',
                backdropFilter: 'var(--backgroundBlur)',
                padding: '5px',
                borderRadius: 'var(--radius)'
            }
        }
    ];

    const APPEARANCE = APPEARANCE_PRESETS[0];

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
            widgetsDiv.style.borderRadius = 'var(--radius)';
            widgetsDiv.style.backgroundColor = APPEARANCE.widgets.backgroundColor;
            widgetsDiv.style.backdropFilter = APPEARANCE.widgets.backdropFilter;
            return widgetsDiv;
        }

        #createWidget(widgetInfo) {
            const id = widgetInfo.id;
            const url = widgetInfo.url;
            const zoomFactor = widgetInfo.zoomFactor;
            const width = widgetInfo.width;
            const height = widgetInfo.height;
            const selector = widgetInfo.selector;
            const timeout = widgetInfo.timeout;

            const widget = this.#createWidgetDiv(id, width, height);
            const webview = this.#createWebview(url, zoomFactor);
            this.#filterSelector(webview, selector, timeout);
            widget.appendChild(webview);

            return widget;
        }

        #createWidgetDiv(id, width, height) {
            const widgetDiv = document.createElement('div');
            widgetDiv.id = id;
            widgetDiv.className = 'Widget';
            widgetDiv.style.position = 'relative';
            widgetDiv.style.width = `calc(${width} + ${APPEARANCE.widget.padding} * 2)`;
            widgetDiv.style.height = `calc(${height} + ${APPEARANCE.widget.padding} * 2)`;
            widgetDiv.style.margin = '10px';
            widgetDiv.style.padding = APPEARANCE.widget.padding;
            widgetDiv.style.borderRadius = APPEARANCE.widget.borderRadius 
            widgetDiv.style.backgroundColor = APPEARANCE.widget.backgroundColor;
            widgetDiv.style.backdropFilter = APPEARANCE.widget.backdropFilter;
            return widgetDiv;
        }

        #createWebview(url, zoomFactor) {
            const webview = document.createElement('webview');
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
            this.#fixPointerEvents();
        }

        #fixPointerEvents() {
            for (const widget of this.#widgets.children) {
                const webview = widget.querySelector('webview');
                webview.style.pointerEvents = 'all';
            }
        }

        #filterSelector(webview, selector, timeout) {
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
                    e.style.minWidth = '0px';
                    e.style.minHeight = '0px';
                    e.style.gridGap = '0px';
                    e = e.parentElement;
                    e.style.padding = 0;
                    e.style.margin = 0;
                }
                toDelete.forEach(e => {
                    e.parent.removeChild(e.child)
                });
                const body = document.querySelector('body');
                body.style.overflow = 'hidden';
                body.style.minWidth = '0px';
                body.style.minHeight = '0px';
            })()`;
            webview.addEventListener('loadcommit', () => {
                setTimeout(() => {
                    webview.executeScript({code: script})
                }, timeout);
            });
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
            const startPageTitle = this.#getMessage('Start Page', 'title');
            return this.#title.innerText === startPageTitle;
        }

        // utils

        #getMessage(message, type) {
            const messageName = (type ? type + '\x04' + message : message).replace(/[^a-z0-9]/g, function (i) {
                return '_' + i.codePointAt(0) + '_';
            }) + '0';
            return chrome.i18n.getMessage(messageName) || message;
        }
    };

    function initMod() {
        window.widgets = new Widgets();
    }

    setTimeout(initMod, 500);
})();
