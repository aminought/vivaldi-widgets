(function widgets() {
    "use strict";

    const START_PAGE_BUTTON = null;
    const WIDGETS = [
        {
            id: 'VivaldiProfileWidget',
            url: 'https://forum.vivaldi.net/user/aminought',
            selector: '.profile.row',
            zoomFactor: 0.8,
            width: '292px',
            height: '266px',
            timeout: 0
        },
        {
            id: 'VivaldiReleasesWidget',
            url: 'https://vivaldi.com/blog/',
            selector: '.download-vivaldi-sidebar',
            zoomFactor: 1,
            width: '342px',
            height: '378px',
            timeout: 0
        }
    ];

    const DELAY = 100;

    const STYLE = `
        .Widgets {
            position: relative;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
            align-items: flex-start;
            gap: 20px;
            max-width: 80%;
            padding-bottom: 20px;
        }

        .WidgetWrapper {
            position: relative;
            display: flex;
            flex-direction: column;
            padding: 5px;
            border-radius: var(--radius);
            background-color: var(--colorBgAlphaBlur);
            backdrop-filter: var(--backgroundBlur);
            transition: width 0.2s ease-out, height 0.2s ease-out, padding 0.2s ease-out;
            cursor: move;
        }

        .WidgetWrapper:has(.WidgetHeader:not(.Hidden)) {
            padding: 0px 5px 5px 5px;
        }

        .WidgetHeader {
            position: relative;
            display: flex;
            flex-direction: row-reverse;
            height: 20px;
            background-color: transparent;
            transition: height 0.2s ease-out;
            cursor: move;
        }

        .WidgetHeader.Hidden {
            height: 0;
        }

        .WidgetToolbar {
            position: relative;
            display: flex;
            flex-direction: row;
            background-color: transparent;
            padding-right: 5px;
        }

        .WidgetToolbarButton {
            background-color: transparent;
            border: none;
            width: 20px;
            height: 20px;
        }

        .WidgetRow {
            position: relative;
            display: flex;
            flex-direction: row;
        }

        .Widget {
            position: relative;
            transition: width 0.2s ease-out, height 0.2s ease-out;
        }

        .WidgetWebview {
            position: relative;
            width: 100%;
            height: 100%;
        }

        .WidgetWrapperDragArea {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: var(--colorBgAlphaBlur);
            backdrop-filter: blur(1px);
        }

        .WidgetWrapperDropArea {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
        }
    `;

    const WIDGET_WRAPPER_HTML = `
        <div class="WidgetHeader Hidden">
            <div class="WidgetToolbar">
                <button class="WidgetToolbarButton WidgetToolbarReloadButton">
                    <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.2071 13H21V8.20711C21 7.76165 20.4614 7.53857 20.1464 7.85355L15.8536 12.1464C15.5386 12.4614 15.7617 13 16.2071 13Z" fill="currentColor"></path>
                        <path d="M18.65 10.9543C17.5938 9.12846 15.6197 7.90002 13.3586 7.90002C9.98492 7.90002 7.25 10.6349 7.25 14.0086C7.25 17.3823 9.98492 20.1172 13.3586 20.1172C15.1678 20.1172 16.7933 19.3308 17.9118 18.081" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
                    </svg>
                </button>
            </div>
        </div>
        <div class="WidgetRow">
            <div class="Widget">
                <webview class="WidgetWebview"></webview>
            </div>
        </div>
    `;

    class Widgets {
        #db = new Database();
        #widgets = null;
        #sdWrapperMutationObserver = null;
        #draggedWidgetWrapper = null;

        constructor() {
            this.#addStyle();
            this.#db.connect().then(() => {
                this.#createWidgets().then(() => {
                    this.#addWidgets();
                    this.#createSdWrapperMutationObserver();
                    this.#createTabActivationListener();
                    this.#createReloadButtonListener();
                });
            });
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

        #createReloadButtonListener() {
            this.#reloadButton.addEventListener('click', () => this.#reloadWidgets());
        }

        #createWidgetReloadButtonListener(button) {
            button.addEventListener('click', () => {
                const widgetWrapper = this.#findParentByClass(button, 'WidgetWrapper');
                this.#reloadWidget(widgetWrapper);
            });
        }

        // config

        #compareWidgetOrders(configWidgetOrders, dbWidgetOrders) {
            const configWidgetOrdersSet = new Set(configWidgetOrders.map((widgetOrder) => widgetOrder.id));
            const dbWidgetOrdersSet = new Set(dbWidgetOrders.map((widgetOrder) => widgetOrder.id));
            return this.#compareSets(configWidgetOrdersSet, dbWidgetOrdersSet);
        }

        #generateWidgetOrdersFromConfig() {
            const widgetOrders = [];
            WIDGETS.forEach((widgetInfo, index) => {
                widgetOrders.push({order: index, id: widgetInfo.id})
            });
            return widgetOrders;
        }

        #generateWidgetOrdersFromStartPage() {
            const widgetOrders = [];
            var index = 0;
            for (const widgetWrapper of this.#widgets.children) {
                const widget = widgetWrapper.querySelector('.Widget');
                widgetOrders.push({order: index, id: widget.id})
                index++;
            }
            return widgetOrders;
        }

        // builders

        #createStyle() {
            const style = document.createElement('style');
            style.innerHTML = STYLE;
            return style;
        }

        #createWidgetsDelayed() {
            setTimeout(() => this.#createWidgets(), DELAY);
        }

        async #createWidgets() {
            this.#widgets = document.createElement('div');
            this.#widgets.className = 'Widgets';

            if (!this.#widgets) {
                this.#createWidgetsDelayed();
                return;
            }

            var widgetOrders = this.#generateWidgetOrdersFromConfig();
            const dbWidgetOrders = await this.#db.getWidgetOrders();

            if (!this.#compareWidgetOrders(widgetOrders, dbWidgetOrders)) {
                this.#db.clearWidgetOrders();
                this.#db.addWidgetOrders(widgetOrders);
            } else {
                widgetOrders = dbWidgetOrders;
            }

            widgetOrders.forEach((widgetOrder) => {
                const widgetInfo = WIDGETS.find((widgetInfo) => widgetInfo.id === widgetOrder.id);
                const widgetWrapper = this.#createWidgetWrapper(widgetInfo);
                this.#widgets.appendChild(widgetWrapper);
            });
        }

        #createWidgetWrapper(widgetInfo) {
            const widgetWrapper = document.createElement('div');
            widgetWrapper.className = 'WidgetWrapper';
            widgetWrapper.draggable = true;

            widgetWrapper.onmouseenter = (e) => {this.#showWidgetHeader(e.target)};
            widgetWrapper.onmouseleave = (e) => {this.#hideWidgetHeader(e.target)};
            widgetWrapper.ondragstart = (e) => {this.#dragWidgetWrapper(e.target)};
            widgetWrapper.ondragover = (e) => e.preventDefault();
            widgetWrapper.ondrop = (e) => {this.#dropWidgetWrapper(e.target.parentElement)};
            widgetWrapper.ondragend = () => {this.#removeDragAndDropAreas()};

            widgetWrapper.innerHTML = WIDGET_WRAPPER_HTML;

            this.#configureWidget(widgetWrapper, widgetInfo);
            this.#configureWebview(widgetWrapper, widgetInfo);
            this.#configureWidgetToolbarReloadButton(widgetWrapper);

            return widgetWrapper;
        }

        #configureWidget(widgetWrapper, widgetInfo) {
            const widget = widgetWrapper.querySelector('.Widget');
            widget.id = widgetInfo.id;
            widget.style.width = widgetInfo.width;
            widget.style.height = widgetInfo.height;
        }

        #configureWebview(widgetWrapper, widgetInfo) {
            const webview = widgetWrapper.querySelector('webview');
            webview.src = widgetInfo.url;
            webview.setZoom(widgetInfo.zoomFactor);

            this.#filterSelector(webview, widgetInfo.selector, widgetInfo.timeout);
        }

        #configureWidgetToolbarReloadButton(widgetWrapper) {
            const reloadButton = widgetWrapper.querySelector('.WidgetToolbarReloadButton');
            this.#createWidgetReloadButtonListener(reloadButton);
        }

        #createDragAndDropAreas() {
            const dragArea = this.#createWidgetDragArea();
            this.#draggedWidgetWrapper.appendChild(dragArea);
            for (const widget of this.#widgets.children) {
                if (widget === this.#draggedWidgetWrapper) {
                    continue;
                }
                const dropArea = this.#createWidgetDropArea(widget);
                widget.appendChild(dropArea);
            }
        }

        #createWidgetDragArea() {
            const dragArea = document.createElement('div');
            dragArea.className = 'WidgetWrapperDragArea';
            return dragArea;
        }

        #createWidgetDropArea(widgetDiv) {
            const dropArea = document.createElement('div');
            dropArea.className = 'WidgetWrapperDropArea';
            dropArea.style.width = widgetDiv.style.width;
            dropArea.style.height = widgetDiv.style.height;
            return dropArea;
        }

        // actions

        #addStyle() {
            this.#head.appendChild(this.#createStyle());
        }

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
                    e.style.transform = 'none';
                }
                toDelete.forEach(e => {
                    e.parent.removeChild(e.child)
                });
                const body = document.querySelector('body');
                body.style.overflow = 'hidden';
                body.style.minWidth = '0px';
                body.style.minHeight = '0px';
                window.scrollTo(0, 0);
            })()`;
            webview.addEventListener('loadcommit', () => {
                setTimeout(() => {
                    webview.executeScript({code: script})
                }, timeout);
            });
        }

        #reloadWidget(widgetWrapper) {
            const webview = widgetWrapper.querySelector('webview');
            webview.reload();
        }

        #reloadWidgets() {
            if (!this.#widgetsDiv) {
                return;
            }
            for (const widgetWrapper of this.#widgets.children) {
                this.#reloadWidget(widgetWrapper);
            }
        }

        #removeDragAndDropAreas() {
            for (const dropArea of this.#dropAreas) {
                dropArea.parentElement.removeChild(dropArea);
            }
            this.#dragArea?.parentElement?.removeChild(this.#dragArea);
        }

        // WidgetWrapper actions

        #showWidgetHeader(widgetWrapper) {
            const header = widgetWrapper.querySelector('.WidgetHeader');
            header.classList.remove('Hidden');
        } 

        #hideWidgetHeader(widgetWrapper) {
            const header = widgetWrapper.querySelector('.WidgetHeader');
            header.classList.add('Hidden');
        } 

        #dragWidgetWrapper(widgetWrapper) {
            this.#draggedWidgetWrapper = widgetWrapper;
            this.#createDragAndDropAreas();
        }

        #dropWidgetWrapper(targetWidgetWrapper) {
            if (targetWidgetWrapper != this.#draggedWidgetWrapper) {
                this.#widgets.insertBefore(this.#draggedWidgetWrapper, targetWidgetWrapper);
            }
            this.#removeDragAndDropAreas();
            const widgetOrders = this.#generateWidgetOrdersFromStartPage();
            this.#db.clearWidgetOrders().then(() => {
                this.#db.addWidgetOrders(widgetOrders);
            });
            return false;
        }

        // utils

        #findParentByClass(element, className) {
            if (element.parentElement.classList.contains(className)) {
                return element.parentElement;
            } else {
                return this.#findParentByClass(element.parentElement, className);
            }
        }

        // getters

        get #head() {
            return document.querySelector('head');
        }

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
            return this.#internalPage?.querySelector('.Widgets');
        }

        get #sdWrapper() {
            return this.#internalPage?.querySelector('.sdwrapper div');
        }

        get #activeStartPageButton() {
            return this.#internalPage?.querySelector('.button-startpage.active');
        }

        get #reloadButton() {
            return document.querySelector('button[name=Reload]');
        }

        get #isStartPage() {
            const startPageTitle = this.#getMessage('Start Page', 'title');
            return this.#title.innerText === startPageTitle;
        }

        get #dropAreas() {
            return document.querySelectorAll('.WidgetWrapperDropArea');
        }

        get #dragArea() {
            return document.querySelector('.WidgetWrapperDragArea');
        }

        // utils

        #compareSets(a, b) {
            return a.size === b.size && [...a].every(value => b.has(value));
        }

        #getMessage(message, type) {
            const messageName = (type ? type + '\x04' + message : message).replace(/[^a-z0-9]/g, function (i) {
                return '_' + i.codePointAt(0) + '_';
            }) + '0';
            return chrome.i18n.getMessage(messageName) || message;
        }
    };

    class Database {
        #db = null;
        #dbName = 'Widgets';
        #objectStoreName = 'order';

        connect() {
            const request = window.indexedDB.open(this.#dbName);
            request.onerror = () => {
                console.log('Failed to open database')
            };
            return new Promise((resolve, reject) => {
                request.onupgradeneeded = (event) => {
                    this.#db = event.target.result;
                    let objectStore = this.#db.createObjectStore(this.#objectStoreName, {
                        keyPath: 'order'
                    });
                    objectStore.transaction.oncomplete = () => {
                        console.log('ObjectStore created');
                    }
                    resolve(true);
                };
                request.onsuccess = (event) => {
                    this.#db = event.target.result;
                    this.#db.onerror = () => {
                        console.log('Failed to open database');
                    }
                    console.log("Database opened");
                    resolve(true);
                }
            });
        }

        addWidgetOrders(widgetOrders) {
            if (!this.#db) return;

            const trx = this.#db.transaction(this.#objectStoreName, 'readwrite');
            const objectStore = trx.objectStore(this.#objectStoreName);

            return new Promise((resolve, reject) => {
                trx.oncomplete = () => {
                    console.log('Inserted');
                    resolve(true);
                };
                trx.onerror = () => {
                    console.log('Not inserted');
                    resolve(false);
                };
                widgetOrders.forEach((widgetOrder) => {
                    objectStore.add(widgetOrder);
                });
            });
        }

        getWidgetOrders() {
            if (!this.#db) return;

            const trx = this.#db.transaction(this.#objectStoreName, 'readonly');
            const objectStore = trx.objectStore(this.#objectStoreName);

            return new Promise((resolve, reject) => {
                trx.oncomplete = () => {
                    console.log('Fetched');
                    resolve(true);
                };
                trx.onerror = () => {
                    console.log('Not fetched');
                    resolve(false);
                };
                let request = objectStore.getAll();
                request.onsuccess = (event) => {
                    resolve(event.target.result);
                };
            });
        }

        clearWidgetOrders() {
            if (!this.#db) return;

            const trx = this.#db.transaction(this.#objectStoreName, 'readwrite');
            const objectStore = trx.objectStore(this.#objectStoreName);

            return new Promise((resolve, reject) => {
                trx.oncomplete = () => {
                    console.log('Cleared');
                    resolve(true);
                };
                trx.onerror = () => {
                    console.log('Not cleared');
                    resolve(false);
                };
                objectStore.clear();
            });
        }
    }

    function initMod() {
        window.widgets = new Widgets();
    }

    setTimeout(initMod, 500);
})();
