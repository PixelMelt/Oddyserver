// ==UserScript==
// @name         Starblast wsHook
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Modify websocket traffic externally without replacing webpage
// @author       @dankdmitron (aka @dpleshkov)
// @match        https://starblast.io/
// @icon         https://starblast.dankdmitron.dev/favicon.ico
// @grant        none
// ==/UserScript==


// Taken from https://github.com/skepticfx/wshook/blob/master/wsHook.js
window.wsHook = {};
(function () {
    // Mutable MessageEvent.
    // Subclasses MessageEvent and makes data, origin and other MessageEvent properites mutatble.
    function MutableMessageEvent (o) {
        this.bubbles = o.bubbles || false
        this.cancelBubble = o.cancelBubble || false
        this.cancelable = o.cancelable || false
        this.currentTarget = o.currentTarget || null
        this.data = o.data || null
        this.defaultPrevented = o.defaultPrevented || false
        this.eventPhase = o.eventPhase || 0
        this.lastEventId = o.lastEventId || ''
        this.origin = o.origin || ''
        this.path = o.path || new Array(0)
        this.ports = o.ports || new Array(0)
        this.returnValue = o.returnValue || true
        this.source = o.source || null
        this.srcElement = o.srcElement || null
        this.target = o.target || null
        this.timeStamp = o.timeStamp || null
        this.type = o.type || 'message'
        this.__proto__ = o.__proto__ || MessageEvent.__proto__
    }

    var before = wsHook.before = function (data, url, wsObject) {
        return data
    }
    var after = wsHook.after = function (e, url, wsObject) {
        return e
    }
    var modifyUrl = wsHook.modifyUrl = function(url) {
        return url
    }
    wsHook.resetHooks = function () {
        wsHook.before = before
        wsHook.after = after
        wsHook.modifyUrl = modifyUrl
    }

    var _WS = WebSocket
    WebSocket = function (url, protocols) {
        var WSObject
        url = wsHook.modifyUrl(url) || url
        this.url = url
        this.protocols = protocols
        if (!this.protocols) { WSObject = new _WS(url) } else { WSObject = new _WS(url, protocols) }

        var _send = WSObject.send
        WSObject.send = function (data) {
            arguments[0] = wsHook.before(data, WSObject.url, WSObject) || data
            _send.apply(this, arguments)
        }

        // Events needs to be proxied and bubbled down.
        WSObject._addEventListener = WSObject.addEventListener
        WSObject.addEventListener = function () {
            var eventThis = this
            // if eventName is 'message'
            if (arguments[0] === 'message') {
                arguments[1] = (function (userFunc) {
                    return function instrumentAddEventListener () {
                        arguments[0] = wsHook.after(new MutableMessageEvent(arguments[0]), WSObject.url, WSObject)
                        if (arguments[0] === null) return
                        userFunc.apply(eventThis, arguments)
                    }
                })(arguments[1])
            }
            return WSObject._addEventListener.apply(this, arguments)
        }

        Object.defineProperty(WSObject, 'onmessage', {
            'set': function () {
                var eventThis = this
                var userFunc = arguments[0]
                var onMessageHandler = function () {
                    arguments[0] = wsHook.after(new MutableMessageEvent(arguments[0]), WSObject.url, WSObject)
                    if (arguments[0] === null) return
                    userFunc.apply(eventThis, arguments)
                }
                WSObject._addEventListener.apply(this, ['message', onMessageHandler, false])
            }
        })

        return WSObject
    }
})()

// Synchronously converts a blob to a Uint8Array
// This is necessary if we want to block certain binary packets
window.blobToUint8Array = function(b) {
    let uri = URL.createObjectURL(b);
    let xhr = new XMLHttpRequest();

    xhr.overrideMimeType("application/x-binary; charset=ISO-8859-1");

    xhr.open('GET', uri, false);
    xhr.send();

    URL.revokeObjectURL(uri);

    let ui8 = new Uint8Array(xhr.response.length);

    for (let i = 0; i < xhr.response.length; ++i) {
        ui8[i] = xhr.response.charCodeAt(i);
    }

    return ui8;
}

window.wsHook.modifyUrl = function(url) {
    let gameLink = window.location.href;
    let match = gameLink.match(/!(.*)/);
    if (match) {
        return match[0].substring(1);
    }
    return url;
}