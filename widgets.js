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
                padding: '5px',
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
        #db = new Database();
        #widgets = null;
        #sdWrapperMutationObserver = null;
        #draggedWidget = null;

        constructor() {
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

        // builders

        #createWidgetsDelayed() {
            setTimeout(() => this.#createWidgets(), DELAY);
        }

        async #createWidgets() {
            this.#widgets = this.#createWidgetsDiv();
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
                const widget = this.#createWidget(widgetInfo);
                this.#widgets.appendChild(widget);
            });
        }

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
            for (const widget of this.#widgets.children) {
                widgetOrders.push({order: index, id: widget.id})
                index++;
            }
            return widgetOrders;
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
            widgetDiv.draggable = true;
            widgetDiv.ondragstart = (e) => {
                this.#draggedWidget = e.target;
                this.#createDragAndDropAreas();
            };
            widgetDiv.ondragover = (e) => e.preventDefault();
            widgetDiv.ondrop = (e) => {
                const targetWidget = e.target.parentElement;
                if (targetWidget != this.#draggedWidget) {
                    this.#widgets.insertBefore(this.#draggedWidget, targetWidget);
                }
                this.#removeDragAndDropAreas();
                const widgetOrders = this.#generateWidgetOrdersFromStartPage();
                this.#db.clearWidgetOrders().then(() => {
                    this.#db.addWidgetOrders(widgetOrders);
                });
                return false;
            };
            widgetDiv.ondragend = () => {
                this.#removeDragAndDropAreas();
            };
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

        #createDragAndDropAreas() {
            const dragArea = this.#createWidgetDragArea(this.#draggedWidget);
            this.#draggedWidget.appendChild(dragArea);
            for (const widget of this.#widgets.children) {
                if (widget === this.#draggedWidget) {
                    continue;
                }
                const dropArea = this.#createWidgetDropArea(widget);
                widget.appendChild(dropArea);
            }
        }

        #createWidgetDragArea(widgetDiv) {
            const dragArea = document.createElement('div');
            dragArea.className = 'WidgetDragArea';
            dragArea.style.position = 'absolute';
            dragArea.style.left = 0;
            dragArea.style.top = 0;
            dragArea.style.width = widgetDiv.style.width;
            dragArea.style.height = widgetDiv.style.height;
            dragArea.style.backgroundColor = 'var(--colorBgAlphaBlur)';
            dragArea.style.backdropFilter = 'blur(1px)';
            return dragArea;
        }

        #createWidgetDropArea(widgetDiv) {
            const dropArea = document.createElement('div');
            dropArea.className = 'WidgetDropArea';
            dropArea.style.position = 'absolute';
            dropArea.style.left = 0;
            dropArea.style.top = 0;
            dropArea.style.width = widgetDiv.style.width;
            dropArea.style.height = widgetDiv.style.height;
            return dropArea;
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

        #reloadWidgets() {
            if (!this.#widgetsDiv) {
                return;
            }
            for (const widget of this.#widgets.children) {
                const webview = widget.children[0];
                webview.reload();
            }
        }

        #removeDragAndDropAreas() {
            for (const dropArea of this.#dropAreas) {
                dropArea.parentElement.removeChild(dropArea);
            }
            this.#dragArea?.parentElement?.removeChild(this.#dragArea);
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

        get #reloadButton() {
            return document.querySelector('button[name=Reload]');
        }

        get #isStartPage() {
            const startPageTitle = this.#getMessage('Start Page', 'title');
            return this.#title.innerText === startPageTitle;
        }

        get #dropAreas() {
            return document.querySelectorAll('.WidgetDropArea');
        }

        get #dragArea() {
            return document.querySelector('.WidgetDragArea');
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
