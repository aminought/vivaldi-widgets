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

        .WidgetSidebar {
            position: relative;
            display: flex;
            flex-direction: column;
            width: 300px;
            transition: width 0.2s ease-out;
            padding-left: 10px;
        }

        .WidgetSidebar.Hidden {
            width: 0px;
            padding-left: 0px;
        }

        .WidgetSettings {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .WidgetSidebar.Hidden .WidgetSettings {
            display: none;
        }

        .WidgetInputRow {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 5px;
        }

        .WidgetInputRow label {
            width: 100%;
            flex: 1;
        }

        .WidgetInputRow input {
            width: 100%;
            flex: 2;
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
                <button class="WidgetToolbarButton WidgetToolbarSidebarButton">
                    <svg width="20" height="20" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.25 14.5v.335l.25.224 1.622 1.452-1.334 2.187-1.685-.663-.38-.15-.332.238c-.41.294-.823.494-1.3.721l-.353.17-.063.385-.306 1.851h-2.635l-.416-1.89-.079-.357-.33-.159c-.477-.227-.89-.427-1.3-.721l-.332-.238-.38.15-1.685.663-1.321-2.167 1.498-1.147.295-.225v-2.318l-.295-.225-1.498-1.147 1.32-2.167 1.686.663.304.12.294-.14c.268-.129.528-.285.755-.42l.013-.008a8.21 8.21 0 0 1 .646-.362l.352-.168.064-.386.306-1.851h2.62l.306 1.851.064.386.352.168c.477.228.89.428 1.3.722l.332.238.38-.15 1.685-.663 1.324 2.17-1.458 1.15-.286.225V14.5z" stroke="currentColor" stroke-width="1.5"></path>
                        <circle cx="14" cy="14" r="1.5" stroke="currentColor"></circle>
                    </svg>
                </button>
            </div>
        </div>
        <div class="WidgetRow">
            <div class="Widget">
                <webview class="WidgetWebview"></webview>
            </div>
            <div class="WidgetSidebar Hidden">
                <div class="WidgetSettings">
                    <div class="WidgetInputRow">
                        <label>ID:</label>
                        <input type="text" class="WidgetId">
                    </div>
                    <div class="WidgetInputRow">
                        <label>URL:</label>
                        <input type="text" class="WidgetUrl">
                    </div>
                    <div class="WidgetInputRow">
                        <label>Zoom Factor:</label>
                        <input type="number" class="WidgetZoomFactor" step="0.01" min="0" max="1">
                    </div>
                    <div class="WidgetInputRow">
                        <label>Selector:</label>
                        <input type="text" class="WidgetSelector">
                    </div>
                    <div class="WidgetInputRow">
                        <label>Width (px):</label>
                        <input type="number" class="WidgetWidth" step="1" min="100" max="10000">
                    </div>
                    <div class="WidgetInputRow">
                        <label>Height (px):</label>
                        <input type="number" class="WidgetHeight" step="1" min="100" max="10000">
                    </div>
                    <div class="WidgetInputRow">
                        <label>Timeout (ms):</label>
                        <input type="number" class="WidgetTimeout" step="100" min="0" max="10000">
                    </div>
                    <input type="submit" value="Save">
                </div>
            </div>
        </div>
    `;

    class Widgets {
        #db = new Database();
        #widgets = WIDGETS;
        #widgetsDivCache = null;
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

        #createWidgetReloadButtonListener(widgetWrapper, button) {
            button.addEventListener('click', () => {
                this.#reloadWidget(widgetWrapper);
            });
        }

        #createWidgetSidebarButtonListener(widgetWrapper, button) {
            button.addEventListener('click', () => {
                this.#showWidgetSidebar(widgetWrapper);
            });
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
            this.#widgetsDivCache = document.createElement('div');
            this.#widgetsDivCache.className = 'Widgets';

            if (!this.#widgetsDivCache) {
                this.#createWidgetsDelayed();
                return;
            }

            const dbWidgets = await this.#db.getWidgets();
            if (dbWidgets.length > 0) {
                this.#widgets = dbWidgets;
            } else {
                this.#widgets.forEach((widget, order) => {
                    if (!('order' in widget)) {
                        widget['order'] = order;
                    }
                });
                await this.#db.addWidgets(this.#widgets);
            }

            this.#widgets.forEach((widgetInfo) => {
                const widgetWrapper = this.#createWidgetWrapper(widgetInfo);
                this.#widgetsDivCache.appendChild(widgetWrapper);
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
            this.#configureWidgetToolbarSettingsButton(widgetWrapper);

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
            this.#createWidgetReloadButtonListener(widgetWrapper, reloadButton);
        }

        #configureWidgetToolbarSettingsButton(widgetWrapper) {
            const sidebarButton = widgetWrapper.querySelector('.WidgetToolbarSidebarButton');
            this.#createWidgetSidebarButtonListener(widgetWrapper, sidebarButton);
        }

        #createDragAndDropAreas() {
            const dragArea = this.#createWidgetDragArea();
            this.#draggedWidgetWrapper.appendChild(dragArea);
            for (const widget of this.#widgetsDiv.children) {
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
            this.#speedDial.appendChild(this.#widgetsDivCache);
            this.#fixPointerEvents();
        }

        #fixPointerEvents() {
            for (const widget of this.#widgetsDiv.children) {
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

        #reloadWidgets() {
            if (!this.#widgetsDiv) {
                return;
            }
            for (const widgetWrapper of this.#widgetsDiv.children) {
                this.#reloadWidget(widgetWrapper);
            }
        }

        #reloadWidget(widgetWrapper) {
            const webview = widgetWrapper.querySelector('webview');
            webview.reload();
        }

        #showWidgetSidebar(widgetWrapper) {
            const widgetSidebar = widgetWrapper.querySelector('.WidgetSidebar');
            if (widgetSidebar.classList.contains('Hidden')) {
                widgetSidebar.classList.remove('Hidden');
            } else {
                widgetSidebar.classList.add('Hidden');
            }
        }

        #removeDragAndDropAreas() {
            for (const dropArea of this.#dropAreas) {
                dropArea.parentElement.removeChild(dropArea);
            }
            this.#dragArea?.parentElement?.removeChild(this.#dragArea);
        }

        #updateWidgets() {
            const widgets = [];
            var order = 0;
            for (const widgetWrapper of this.#widgetsDiv.children) {
                const widgetDiv = widgetWrapper.querySelector('.Widget');
                const widget = this.#widgets.find(widget => widget.id == widgetDiv.id);
                widget.order = order;
                widgets.push(widget);
                order++;
            }
            this.#widgets = widgets;
            this.#db.clearWidgets().then(() => {
                this.#db.addWidgets(this.#widgets);
            });
        }

        // WidgetWrapper actions

        #showWidgetHeader(widgetWrapper) {
            const header = widgetWrapper.querySelector('.WidgetHeader');
            header.classList.remove('Hidden');
        } 

        #hideWidgetHeader(widgetWrapper) {
            const header = widgetWrapper.querySelector('.WidgetHeader');
            const sidebar = widgetWrapper.querySelector('.WidgetSidebar');
            if (sidebar.classList.contains('Hidden')) {
                header.classList.add('Hidden');
            }
        } 

        #dragWidgetWrapper(widgetWrapper) {
            this.#draggedWidgetWrapper = widgetWrapper;
            this.#createDragAndDropAreas();
        }

        #dropWidgetWrapper(targetWidgetWrapper) {
            if (targetWidgetWrapper != this.#draggedWidgetWrapper) {
                this.#widgetsDiv.insertBefore(this.#draggedWidgetWrapper, targetWidgetWrapper);
            }
            this.#removeDragAndDropAreas();
            this.#updateWidgets();
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
        #orderObjectStoreName = 'order';
        #widgetsObjectStoreName = 'widgets';

        connect() {
            const request = window.indexedDB.open(this.#dbName, 2);
            request.onerror = () => {
                console.log('Failed to open database')
            };
            return new Promise((resolve, reject) => {
                request.onupgradeneeded = (event) => {
                    this.#db = event.target.result;

                    if (!this.#db.objectStoreNames.contains(this.#orderObjectStoreName)) {
                        let orderObjectStore = this.#db.createObjectStore(this.#orderObjectStoreName, {
                            keyPath: 'order'
                        });
                        orderObjectStore.transaction.oncomplete = () => {
                            console.log(`ObjectStore ${this.#orderObjectStoreName} created`);
                        }
                    }

                    let widgetsObjectStore = this.#db.createObjectStore(this.#widgetsObjectStoreName, {
                        keyPath: 'order'
                    });
                    widgetsObjectStore.transaction.oncomplete = () => {
                        console.log(`ObjectStore ${this.#widgetsObjectStoreName} created`);
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
            return this.#add(this.#orderObjectStoreName, widgetOrders);
        }

        addWidgets(widgets) {
            if (!this.#db) return;
            return this.#add(this.#widgetsObjectStoreName, widgets);
        }

        getWidgetOrders() {
            if (!this.#db) return;
            return this.#getAll(this.#orderObjectStoreName);
        }

        getWidgets() {
            if (!this.#db) return;
            return this.#getAll(this.#widgetsObjectStoreName);
        }

        clearWidgetOrders() {
            if (!this.#db) return;
            return this.#clearAll(this.#orderObjectStoreName);
        }

        clearWidgets() {
            if (!this.#db) return;
            return this.#clearAll(this.#widgetsObjectStoreName);
        }

        #add(objectStoreName, objects) {
            if (!this.#db) return;

            const trx = this.#db.transaction(objectStoreName, 'readwrite');
            const objectStore = trx.objectStore(objectStoreName);

            return new Promise((resolve, reject) => {
                trx.oncomplete = () => {
                    console.log('Inserted');
                    resolve(true);
                };
                trx.onerror = () => {
                    console.log('Not inserted');
                    resolve(false);
                };
                objects.forEach((object) => {
                    objectStore.add(object);
                });
            });
        }

        #getAll(objectStoreName) {
            if (!this.#db) return;

            const trx = this.#db.transaction(objectStoreName, 'readonly');
            const objectStore = trx.objectStore(objectStoreName);

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

        #clearAll(objectStoreName) {
            if (!this.#db) return;

            const trx = this.#db.transaction(objectStoreName, 'readwrite');
            const objectStore = trx.objectStore(objectStoreName);

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
