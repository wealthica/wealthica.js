/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 681:
/***/ ((module) => {

// jschannel-react-native.js

/*
 * js_channel (modified for React Native WebView)
 * Lightweight abstraction on top of postMessage for rich interactions.
 * Supports: query/response, query/update/response, notifications, error handling.
 * Based on json-rpc, focused on inter-window/WebView RPC.
 *
 * Modifications for react-native-webview:
 * - Handles window.ReactNativeWebView for posting messages.
 * - Adjusts origin and source handling in s_onMessage.
 * - Modifies postMessage calls to use the correct signature for ReactNativeWebView.
 * - Allows 'react-native-webview' as a valid origin.
 * - Bypasses some checks (like window === cfg.window) when in RN environment.
 * - Adds a 'force' flag to postMessage calls originating from callbacks/ready state changes
 * to potentially bypass 'ready' checks in the RN context.
 */

; var Channel = (function () {
    "use strict";

    // current transaction id
    var s_curTranId = Math.floor(Math.random() * 1000001);

    // bound channels table
    var s_boundChans = {};

    // add a channel to s_boundChans
    function s_addBoundChan(win, origin, scope, handler) {
        function hasWin(arr) {
            // In RN WebView, 'win' might be the ReactNativeWebView object, not a WindowProxy
            for (var i = 0; i < arr.length; i++) if (arr[i].win === win) return true;
            return false;
        }

        var exists = false;

        if (origin === '*') {
            for (var k in s_boundChans) {
                if (!s_boundChans.hasOwnProperty(k)) continue;
                if (k === '*') continue;
                if (typeof s_boundChans[k][scope] === 'object') {
                    exists = hasWin(s_boundChans[k][scope]);
                    if (exists) break;
                }
            }
        } else {
            // Check '*' first
            if (s_boundChans['*'] && s_boundChans['*'][scope]) {
                exists = hasWin(s_boundChans['*'][scope]);
            }
            // Check specific origin if '*' didn't match or doesn't exist
            if (!exists && s_boundChans[origin] && s_boundChans[origin][scope]) {
                exists = hasWin(s_boundChans[origin][scope]);
            }
        }

        if (exists) throw "A channel is already bound to the same window/interface which overlaps with origin '" + origin + "' and has scope '" + scope + "'";

        if (typeof s_boundChans[origin] != 'object') s_boundChans[origin] = {};
        if (typeof s_boundChans[origin][scope] != 'object') s_boundChans[origin][scope] = [];
        s_boundChans[origin][scope].push({ win: win, handler: handler });
    }

    // remove a channel from s_boundChans
    function s_removeBoundChan(win, origin, scope) {
        if (s_boundChans[origin] && s_boundChans[origin][scope]) {
            var arr = s_boundChans[origin][scope];
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].win === win) {
                    arr.splice(i, 1);
                    break; // Assume only one instance per win/origin/scope
                }
            }
            if (arr.length === 0) {
                delete s_boundChans[origin][scope];
                // Optional: Clean up origin if empty
                // if (Object.keys(s_boundChans[origin]).length === 0) {
                //     delete s_boundChans[origin];
                // }
            }
        }
    }

    // check if is array helper
    function s_isArray(obj) {
        if (Array.isArray) return Array.isArray(obj);
        else {
            return (obj.constructor.toString().indexOf("Array") != -1);
        }
    }

    // outstanding transaction table
    var s_transIds = {};

    // global message handler
    var s_onMessage = function (e) {
        try {
            var m = JSON.parse(e.data);
            if (typeof m !== 'object' || m === null) throw "malformed";
        } catch (err) {
            // Ignore non-JSON messages
            // console.debug("jschannel: received non-JSON message: ", e.data);
            return;
        }

        var w, o, s, i, meth;

        // Adapt for react-native-webview environment
        if (window.ReactNativeWebView) {
            o = '*'; // Origin isn't typically provided or meaningful in RNWebView postMessage
            w = window.ReactNativeWebView; // The interface object acts as the 'window'
        } else {
            o = e.origin;
            w = e.source;
        }

        // Extract scope and method
        if (typeof m.method === 'string') {
            var ar = m.method.split('::');
            if (ar.length == 2) {
                s = ar[0];
                meth = ar[1];
            } else {
                // If no scope prefix is found, assume default scope (empty string)
                s = '';
                meth = m.method;
            }
        }

        if (typeof m.id !== 'undefined') i = m.id;

        // Route message based on properties
        if (typeof meth === 'string') {
            // Request or Notification
            var delivered = false;
            // Check specific origin first (standard behavior)
            if (s_boundChans[o] && s_boundChans[o][s]) {
                for (var j = 0; j < s_boundChans[o][s].length; j++) {
                    if (s_boundChans[o][s][j].win === w) {
                        s_boundChans[o][s][j].handler(o, meth, m);
                        delivered = true;
                        break;
                    }
                }
            }
            // If not delivered, check wildcard origin '*' (common for RNWebView)
            if (!delivered && s_boundChans['*'] && s_boundChans['*'][s]) {
                for (var j = 0; j < s_boundChans['*'][s].length; j++) {
                    if (s_boundChans['*'][s][j].win === w) {
                        s_boundChans['*'][s][j].handler(o, meth, m);
                        delivered = true; // Mark delivered even if via wildcard
                        break;
                    }
                }
            }
            // if (!delivered) {
            //     console.debug("jschannel: dropped message, no handler for", o, s, meth, w);
            // }
        } else if (typeof i !== 'undefined') {
            // Response, Error, or Callback Invocation
            if (s_transIds[i]) {
                // Pass origin (o), method (meth will be undefined here), and message (m)
                s_transIds[i](o, meth, m);
            }
            // else {
            //    console.debug("jschannel: dropped message, unknown transaction id:", i);
            // }
        }
        // else {
        //    console.debug("jschannel: dropped message, missing method and id:", m);
        // }
    };

    // Setup postMessage event listeners
    if (window.addEventListener) window.addEventListener('message', s_onMessage, false);
    else if (window.attachEvent) window.attachEvent('onmessage', s_onMessage);

    // Channel builder
    return {
        build: function (cfg) {
            var debug = function (m) {
                if (cfg.debugOutput && window.console && window.console.log) {
                    try { if (typeof m !== 'string') m = JSON.stringify(m); } catch (e) { /* ignore */ }
                    console.log("[" + chanId + "] " + m);
                }
            };

            /* Capability checks */
            // window.postMessage is not the primary mechanism in RNWebView, ReactNativeWebView.postMessage is.
            // Allow build to proceed if ReactNativeWebView is present.
            var hasPostMessage = !!(window.postMessage || window.ReactNativeWebView);
            if (!hasPostMessage) throw ("jschannel cannot run this environment, no postMessage or ReactNativeWebView found");
            if (!window.JSON || !window.JSON.stringify || !window.JSON.parse) {
                throw ("jschannel cannot run this browser, no JSON support");
            }

            /* Basic argument validation */
            if (typeof cfg !== 'object' || cfg === null) throw ("Channel build invoked without a config object");

            var isReactNativeWebView = !!window.ReactNativeWebView;

            if (isReactNativeWebView) {
                // In RNWebView, the 'window' is the ReactNativeWebView object itself
                if (!window.ReactNativeWebView.postMessage || typeof window.ReactNativeWebView.postMessage !== 'function') {
                    throw ("ReactNativeWebView.postMessage is not a function");
                }
                cfg.window = window.ReactNativeWebView;
                // Default origin for RN WebView if not specified, '*' is safer than a specific string
                if (typeof cfg.origin === 'undefined') cfg.origin = '*';
            } else {
                // Standard browser environment
                if (!cfg.window || typeof cfg.window.postMessage !== 'function') {
                    throw ("Channel.build() called without a valid window argument");
                }
                if (window === cfg.window) throw ("Target window is same as present window -- not allowed");
                // Require explicit origin in standard env
                if (typeof cfg.origin !== 'string') throw ("Channel.build() requires an origin argument");
            }


            // Validate origin
            var validOrigin = false;
            if (typeof cfg.origin === 'string') {
                if (cfg.origin === "*") {
                    validOrigin = true;
                } else if (isReactNativeWebView && cfg.origin === 'react-native-webview') {
                    console.warn("jschannel: 'react-native-webview' origin is deprecated, prefer '*'.");
                    validOrigin = true; // Allow for backward compatibility but warn
                } else {
                    var oMatch = cfg.origin.match(/^https?:\/\/(?:[-a-zA-Z0-9_\.])+(?::\d+)?/);
                    if (oMatch !== null) {
                        cfg.origin = oMatch[0].toLowerCase();
                        validOrigin = true;
                    }
                }
            }

            if (!validOrigin) throw ("Channel.build() called with an invalid origin: " + cfg.origin);

            // Validate scope
            var scope = ''; // Default scope is empty string
            if (typeof cfg.scope !== 'undefined') {
                if (typeof cfg.scope !== 'string') throw 'scope, when specified, must be a string';
                if (cfg.scope.split('::').length > 1) throw "scope may not contain double colons: '::'";
                scope = cfg.scope; // Use provided scope
            }

            /* Private variables */
            var chanId = (function () {
                var text = "";
                var alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                for (var i = 0; i < 5; i++) text += alpha.charAt(Math.floor(Math.random() * alpha.length));
                return text;
            })();

            var regTbl = {};      // Method registry
            var outTbl = {};      // Outbound transactions
            var inTbl = {};       // Inbound transactions
            var ready = false;     // Channel ready state
            var pendingQueue = [];// Queue for messages before ready

            // Transaction creation logic
            var createTransaction = function (id, origin, callbacks) {
                var shouldDelayReturn = false;
                var completed = false;
                var localDebug = function (m) { debug("transaction(" + id + "): " + m); };

                return {
                    origin: origin,
                    invoke: function (cbName, v) {
                        if (completed) { localDebug("Warning: invoke called after completion"); return; }
                        if (!inTbl[id]) { localDebug("Warning: invoke called for nonexistent transaction"); return; } // Changed from throw to warn

                        var valid = false;
                        for (var i = 0; i < callbacks.length; i++) if (cbName === callbacks[i]) { valid = true; break; }
                        if (!valid) throw "Request supports no such callback '" + cbName + "'";

                        localDebug("sending callback '" + cbName + "'");
                        postMessage({ id: id, callback: cbName, params: v }, isReactNativeWebView); // Force post in RN
                    },
                    error: function (error, message) {
                        if (completed) { localDebug("Warning: error called after completion"); return; }
                        completed = true;
                        if (!inTbl[id]) { localDebug("Warning: error called for nonexistent transaction"); return; } // Changed from throw to warn

                        delete inTbl[id];
                        // Don't delete from s_transIds here, that's for outbound calls
                        localDebug("sending error: " + error + " / " + message);
                        postMessage({ id: id, error: error, message: message }, isReactNativeWebView); // Force post in RN
                    },
                    complete: function (v) {
                        if (completed) { localDebug("Warning: complete called after completion"); return; }
                        completed = true;
                        if (!inTbl[id]) { localDebug("Warning: complete called for nonexistent transaction"); return; } // Changed from throw to warn

                        delete inTbl[id];
                        // Don't delete from s_transIds here
                        localDebug("sending complete");
                        postMessage({ id: id, result: v }, isReactNativeWebView); // Force post in RN
                    },
                    delayReturn: function (delay) {
                        if (typeof delay === 'boolean') {
                            shouldDelayReturn = (delay === true);
                        }
                        return shouldDelayReturn;
                    },
                    completed: function () {
                        return completed;
                    }
                };
            };

            // Timeout handler for outbound requests
            var setTransactionTimeout = function (transId, timeout, method) {
                return window.setTimeout(function () {
                    if (outTbl[transId]) {
                        var msg = "timeout (" + timeout + "ms) exceeded on method '" + method + "'";
                        debug(msg + " for transaction " + transId);
                        try {
                            // Ensure error callback exists before calling
                            if (typeof outTbl[transId].error === 'function') {
                                outTbl[transId].error("timeout_error", msg);
                            }
                        } catch (e) {
                            debug("Exception executing timeout handler: " + e);
                        } finally {
                            // Clean up regardless of error callback success
                            delete outTbl[transId];
                            delete s_transIds[transId];
                        }
                    }
                }, timeout);
            };

            // Internal message handler for routing based on cfg
            var onMessage = function (origin, method, m) {
                // Observer hook
                if (typeof cfg.gotMessageObserver === 'function') {
                    try {
                        // Provide a clone to prevent observer mutation affecting logic
                        cfg.gotMessageObserver(origin, JSON.parse(JSON.stringify(m)));
                    } catch (e) {
                        debug("gotMessageObserver() raised an exception: " + e.toString());
                    }
                }

                // Message routing logic
                if (m.id && method) {
                    // Request
                    debug("received request: " + method + "() from " + origin + " (id: " + m.id + ")");
                    if (regTbl[method]) {
                        var trans = createTransaction(m.id, origin, m.callbacks ? m.callbacks : []);
                        inTbl[m.id] = { callbacks: m.callbacks }; // Store info about the inbound transaction
                        try {
                            // Setup callbacks in params object if needed
                            if (m.callbacks && s_isArray(m.callbacks) && m.callbacks.length > 0) {
                                for (var i = 0; i < m.callbacks.length; i++) {
                                    var path = m.callbacks[i];
                                    var obj = m.params || {}; // Ensure params exists
                                    var pathItems = path.split('/');
                                    var currentObj = obj;
                                    for (var j = 0; j < pathItems.length - 1; j++) {
                                        var cp = pathItems[j];
                                        if (typeof currentObj[cp] !== 'object' || currentObj[cp] === null) currentObj[cp] = {};
                                        currentObj = currentObj[cp];
                                    }
                                    // Assign the function to the final path item
                                    currentObj[pathItems[pathItems.length - 1]] = (function (cbName) {
                                        return function (params) {
                                            // Use the captured cbName
                                            return trans.invoke(cbName, params);
                                        };
                                    })(path); // Immediately invoke to capture 'path'
                                }
                            }

                            var resp = regTbl[method](trans, m.params);
                            if (!trans.delayReturn() && !trans.completed()) {
                                trans.complete(resp);
                            }
                        } catch (e) {
                            debug("Exception executing bound method '" + method + "': " + e.toString());
                            var error = "runtime_error";
                            var message = e.toString();
                            if (typeof e === 'string') {
                                message = e;
                            } else if (typeof e === 'object' && e !== null) {
                                if (s_isArray(e) && e.length == 2 && typeof e[0] === 'string') {
                                    error = e[0];
                                    message = e[1];
                                } else if (typeof e.error === 'string') {
                                    error = e.error;
                                    message = (typeof e.message === 'string') ? e.message : JSON.stringify(e.message);
                                } else {
                                    try { message = JSON.stringify(e); } catch (e2) { /* use toString */ }
                                }
                            }
                            // Ensure transaction wasn't already completed by the exception handler
                            if (!trans.completed()) {
                                trans.error(error, message);
                            }
                        }
                    } else {
                        debug("No handler registered for method: " + method);
                        // Optionally send a method_not_found error back
                        // createTransaction(m.id, origin, []).error("method_not_found", "Method '" + method + "' is not bound.");
                    }
                } else if (m.id && m.callback) {
                    // Callback invocation
                    debug("received callback: " + m.callback + " for transaction " + m.id);
                    if (outTbl[m.id] && outTbl[m.id].callbacks && outTbl[m.id].callbacks[m.callback]) {
                        try {
                            outTbl[m.id].callbacks[m.callback](m.params);
                        } catch (e) {
                            debug("Exception executing callback function for '" + m.callback + "': " + e);
                            // Maybe call the main error handler? Depends on desired behavior.
                            // if (typeof outTbl[m.id].error === 'function') {
                            //     outTbl[m.id].error("callback_execution_error", "Exception in callback '" + m.callback + "': " + e.toString());
                            //     delete outTbl[m.id];
                            //     delete s_transIds[m.id];
                            // }
                        }
                    } else {
                        debug("ignoring invalid callback invocation, id: " + m.id + ", callback: " + m.callback);
                    }
                } else if (m.id) {
                    // Response or Error
                    debug("received response/error for transaction " + m.id);
                    if (outTbl[m.id]) {
                        // Clear any timeout associated with this transaction
                        if (outTbl[m.id].timeoutId) {
                            window.clearTimeout(outTbl[m.id].timeoutId);
                        }
                        try {
                            if (m.error) {
                                if (typeof outTbl[m.id].error === 'function') {
                                    outTbl[m.id].error(m.error, m.message);
                                } else {
                                    debug("No error handler for transaction " + m.id + ", error: " + m.error);
                                }
                            } else {
                                if (typeof outTbl[m.id].success === 'function') {
                                    // Provide result or undefined if not present
                                    outTbl[m.id].success(m.result);
                                } else {
                                    debug("No success handler for transaction " + m.id);
                                }
                            }
                        } catch (e) {
                            debug("Exception executing success/error handler for transaction " + m.id + ": " + e);
                        } finally {
                            // Clean up state regardless of handler success/failure
                            delete outTbl[m.id];
                            delete s_transIds[m.id];
                        }
                    } else {
                        debug("ignoring response for unknown/completed transaction: " + m.id);
                    }
                } else if (method) {
                    // Notification
                    debug("received notification: " + method + "() from " + origin);
                    if (regTbl[method]) {
                        try {
                            // Notifications have no transaction object, just pass origin and params
                            regTbl[method]({ origin: origin }, m.params);
                        } catch (e) {
                            debug("Exception executing notification handler '" + method + "': " + e);
                            // Cannot send error back for notification
                        }
                    } else {
                        debug("No handler registered for notification: " + method);
                    }
                } else {
                    debug("Received message that is not a request, response, or notification: " + JSON.stringify(m));
                }
            };

            // Register this channel instance in the global routing table
            s_addBoundChan(cfg.window, cfg.origin, scope, onMessage);

            // Method scoping helper
            var scopeMethod = function (m) {
                if (scope && scope.length) {
                    // Ensure method name doesn't already have a scope conflict? No, allow it.
                    return scope + "::" + m;
                }
                return m;
            };

            // Post message wrapper
            var postMessage = function (msg, force) {
                if (!msg) throw "postMessage called with null message";

                var msgString = JSON.stringify(msg); // Stringify once

                var verb = (ready ? "post  " : "queue ");
                debug(verb + " message: " + msgString + (force ? " (forced)" : ""));

                if (!force && !ready) {
                    pendingQueue.push(msg); // Push the object, not the string
                } else {
                    // Observer hook
                    if (typeof cfg.postMessageObserver === 'function') {
                        try {
                            cfg.postMessageObserver(cfg.origin, JSON.parse(msgString)); // Pass parsed clone
                        } catch (e) {
                            debug("postMessageObserver() raised an exception: " + e.toString());
                        }
                    }

                    // Post using the correct method for the environment
                    if (isReactNativeWebView) {
                        cfg.window.postMessage(msgString);
                    } else {
                        cfg.window.postMessage(msgString, cfg.origin);
                    }
                }
            };

            // Ready state handler
            var onReady = function (trans, type) {
                debug('Received __ready message type: ' + type);
                if (ready) {
                    debug("Warning: received ready message while already in ready state.");
                    // If it's a ping, we can just pong back maybe?
                    if (type === 'ping') {
                        obj.notify({ method: '__ready', params: 'pong' });
                    }
                    return; // Don't re-initialize
                }

                // Assign Left/Right role based on first message received.
                // This helps debugging but isn't essential for function.
                if (type === 'ping') {
                    chanId += '-R'; // Received Ping first, we are Right/Responder
                } else { // type === 'pong'
                    chanId += '-L'; // Received Pong first, we are Left/Initiator
                }
                debug('Channel determined role: ' + chanId);

                obj.unbind('__ready'); // Unbind the ready handler itself
                ready = true;
                debug('Channel ready.');

                // If we received a 'ping', send back a 'pong'
                if (type === 'ping') {
                    obj.notify({ method: '__ready', params: 'pong' });
                }

                // Flush the pending queue
                debug("Flushing " + pendingQueue.length + " queued messages.");
                while (pendingQueue.length > 0) {
                    // Dequeue from front, post immediately (force=true)
                    postMessage(pendingQueue.shift(), true);
                }

                // Invoke the external onReady callback
                if (typeof cfg.onReady === 'function') {
                    try {
                        cfg.onReady(obj); // Pass the channel object itself
                    } catch (e) {
                        debug("Exception in onReady callback: " + e);
                    }
                }
            };

            // Public channel object
            var obj = {
                unbind: function (method) {
                    var scopedMethod = scopeMethod(method);
                    if (regTbl[scopedMethod]) {
                        delete regTbl[scopedMethod];
                        debug("Unbound method: " + scopedMethod);
                        return true;
                    }
                    return false;
                },
                bind: function (method, cb) {
                    if (!method || typeof method !== 'string') throw "'method' argument to bind must be string";
                    if (!cb || typeof cb !== 'function') throw "callback missing from bind params";

                    var scopedMethod = scopeMethod(method);
                    if (regTbl[scopedMethod]) throw "Method '" + scopedMethod + "' is already bound!";
                    regTbl[scopedMethod] = cb;
                    debug("Bound method: " + scopedMethod);
                    return this; // Allow chaining
                },
                call: function (m) {
                    if (!m) throw 'missing arguments to call function';
                    if (!m.method || typeof m.method !== 'string') throw "'method' argument to call must be string";
                    if (!m.success || typeof m.success !== 'function') throw "'success' callback missing from call";
                    // m.error is optional, but should be a function if provided
                    if (m.error && typeof m.error !== 'function') throw "'error' callback must be a function if provided";


                    var callbacks = {};
                    var callbackNames = [];
                    var seen = []; // For recursion detection

                    // Recursively find functions in params and replace them with placeholders
                    var pruneFunctions = function (path, currentParam) {
                        if (currentParam === null || typeof currentParam !== 'object') return; // Only traverse objects/arrays

                        if (seen.indexOf(currentParam) >= 0) {
                            throw "params cannot be a recursive data structure containing functions";
                        }
                        seen.push(currentParam);

                        for (var k in currentParam) {
                            if (!currentParam.hasOwnProperty(k)) continue;
                            var child = currentParam[k];
                            var np = path + (path.length ? '/' : '') + k; // Build path string

                            if (typeof child === 'function') {
                                callbacks[np] = child; // Store the function
                                callbackNames.push(np); // Store the path
                                // Do NOT delete the function from the original params object
                                // The remote side might need the structure. We send names separately.
                                // delete currentParam[k]; // This was the original behavior, potentially problematic.
                            } else if (typeof child === 'object') {
                                pruneFunctions(np, child); // Recurse
                            }
                        }
                        // Remove from seen list after processing children
                        seen.pop();
                    };


                    // Clone params to avoid modifying the caller's object, then prune.
                    // Deep clone is safer but complex; shallow might suffice if functions aren't nested deeply.
                    // Using JSON parse/stringify for a simple deep clone (loses functions, Dates, etc. - but we handle functions separately)
                    var paramsClone = m.params ? JSON.parse(JSON.stringify(m.params)) : undefined;
                    // Re-run pruneFunctions on the original m.params just to get the callback names/functions
                    // but don't modify m.params itself.
                    pruneFunctions("", m.params);


                    // Build request message
                    var currentId = s_curTranId++;
                    var scopedMethod = scopeMethod(m.method);
                    var msg = { id: currentId, method: scopedMethod, params: paramsClone }; // Send the cloned params
                    if (callbackNames.length) msg.callbacks = callbackNames;


                    // Store transaction details
                    outTbl[currentId] = {
                        callbacks: callbacks, // The actual functions
                        error: m.error,       // Error handler
                        success: m.success,   // Success handler
                        // Store timeoutId if timeout is set
                        timeoutId: m.timeout ? setTransactionTimeout(currentId, m.timeout, scopedMethod) : null
                    };

                    // Map transaction ID to the internal message handler
                    s_transIds[currentId] = onMessage;


                    debug("calling method '" + scopedMethod + "' with id " + currentId);
                    // Post the message. Use 'force' in RNWebView context as ready state might be ambiguous.
                    postMessage(msg, isReactNativeWebView);
                },
                notify: function (m) {
                    if (!m) throw 'missing arguments to notify function';
                    if (!m.method || typeof m.method !== 'string') throw "'method' argument to notify must be string";

                    var scopedMethod = scopeMethod(m.method);
                    debug("sending notification: " + scopedMethod);
                    // Clone params to avoid modification issues
                    var paramsClone = m.params ? JSON.parse(JSON.stringify(m.params)) : undefined;
                    postMessage({ method: scopedMethod, params: paramsClone }, isReactNativeWebView); // Force post in RN
                },
                destroy: function () {
                    debug("Destroying channel: " + chanId);
                    s_removeBoundChan(cfg.window, cfg.origin, scope);

                    // Remove global listener only if no other channels depend on it?
                    // Hard to track safely, maybe better to leave the listener.
                    // If this is the *only* channel, could remove:
                    // if (window.removeEventListener) window.removeEventListener('message', s_onMessage, false);
                    // else if(window.detachEvent) window.detachEvent('onmessage', s_onMessage);

                    // Clear internal state
                    ready = false;
                    regTbl = {};
                    inTbl = {};
                    // Cancel any pending outbound timeouts and clear handlers
                    for (var id in outTbl) {
                        if (outTbl.hasOwnProperty(id)) {
                            if (outTbl[id].timeoutId) {
                                window.clearTimeout(outTbl[id].timeoutId);
                            }
                            delete s_transIds[id]; // Remove from global handler map too
                        }
                    }
                    outTbl = {};
                    cfg.origin = null; // Prevent further use
                    pendingQueue = [];
                    chanId = ""; // Clear ID
                }
            };

            // Bind the internal ready handler
            obj.bind('__ready', onReady);

            // Initiate the ready handshake immediately after build.
            // Use setTimeout to ensure the current execution context completes.
            // Force post in RNWebView context.
            debug("Initiating ready handshake (sending ping)");
            window.setTimeout(function () {
                postMessage({ method: scopeMethod('__ready'), params: "ping" }, isReactNativeWebView);
            }, 0);

            return obj;
        } // End of build function
    }; // End of return object
})(); // End of IIFE

// Add export for environments that support it (like Node.js or bundlers)
if ( true && module.exports) {
    module.exports = Channel;
}

/***/ }),

/***/ 669:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var _isObject2 = __webpack_require__(218);

var _isObject3 = _interopRequireDefault(_isObject2);

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _jsChannel = __webpack_require__(681);

var _jsChannel2 = _interopRequireDefault(_jsChannel);

var _eventemitter = __webpack_require__(729);

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _es6Promise = __webpack_require__(702);

var _iframeResizer = __webpack_require__(303);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* global window */


var AddonContainer = function (_EventEmitter) {
  _inherits(AddonContainer, _EventEmitter);

  function AddonContainer() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, AddonContainer);

    var _this = _possibleConstructorReturn(this, (AddonContainer.__proto__ || Object.getPrototypeOf(AddonContainer)).call(this));

    _this.options = options;

    if (!options.iframe) throw new Error('Iframe not defined');

    // Init iframe resizer. This will receive size changes from the addons
    // and resize the iframe accordingly
    (0, _iframeResizer.iframeResizer)({
      checkOrigin: true,
      heightCalculationMethod: window.ieVersion <= 10 ? 'max' : 'lowestElement',
      resizeFrom: 'child',
      resizedCallback: function resizedCallback(data) {
        _this.emit('iframeResized', data);
      }
    }, options.iframe);

    // Create js channel
    _this.channel = _jsChannel2.default.build({
      window: options.iframe.contentWindow,
      origin: options.origin || '*',
      scope: options.id || options.iframe.contentWindow.location.origin,
      postMessageObserver: function postMessageObserver(origin, message) {
        _this.emit('postMessage', origin, message);
      },
      gotMessageObserver: function gotMessageObserver(origin, message) {
        _this.emit('gotMessage', origin, message);
      }
    });

    ['saveData', 'request', 'addTransaction', 'editTransaction', 'addInstitution', 'addInvestment', 'editInstitution', 'editAsset', 'editLiability', 'deleteInstitution', 'deleteAsset', 'deleteLiability', 'downloadDocument', 'upgradePremium', 'getSharings', 'switchUser', 'printPage', 'setLoadingStatus'].forEach(function (event) {
      _this.channel.bind(event, function (tx, data) {
        var eventName = event;
        var eventData = data;

        tx.delayReturn(true);

        var callback = function callback(err, result) {
          if (err) return tx.error(err);

          return tx.complete(result);
        };

        if (['setLoadingStatus', 'upgradePremium'].includes(event)) {
          _this.emit(eventName, eventData !== undefined ? eventData : callback, eventData !== undefined ? callback : undefined);
        } else {
          _this.emit(eventName, eventData || callback, eventData ? callback : undefined);
        }
      });
    });

    _this.channel.call({
      method: 'init',
      params: options.options,
      success: function success(result) {
        _this.emit('init', result);
      }
    });
    return _this;
  }

  _createClass(AddonContainer, [{
    key: 'trigger',
    value: function trigger(eventName, eventData) {
      var _this2 = this;

      var params = { eventName: eventName };
      if (eventData) params.eventData = eventData;

      return new _es6Promise.Promise(function (resolve, reject) {
        _this2.channel.call({
          method: '_event',
          params: params,
          success: resolve,
          error: reject
        });
      });
    }
  }, {
    key: 'update',
    value: function update(data) {
      var _this3 = this;

      return new _es6Promise.Promise(function (resolve, reject) {
        if (!(0, _isObject3.default)(data)) throw new Error('Data must be an object');

        _this3.channel.call({
          method: 'update',
          params: data,
          success: resolve,
          error: reject
        });
      });
    }
  }, {
    key: 'reload',
    value: function reload() {
      var _this4 = this;

      return new _es6Promise.Promise(function (resolve, reject) {
        _this4.channel.call({
          method: 'reload',
          success: resolve,
          error: reject
        });
      });
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.channel.destroy();
    }
  }]);

  return AddonContainer;
}(_eventemitter2.default);

module.exports = AddonContainer;

/***/ }),

/***/ 702:
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   v4.2.8+1e68dce6
 */

(function (global, factory) {
	 true ? module.exports = factory() :
	0;
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  var type = typeof x;
  return x !== null && (type === 'object' || type === 'function');
}

function isFunction(x) {
  return typeof x === 'function';
}



var _isArray = void 0;
if (Array.isArray) {
  _isArray = Array.isArray;
} else {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
}

var isArray = _isArray;

var len = 0;
var vertxNext = void 0;
var customSchedulerFn = void 0;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  if (typeof vertxNext !== 'undefined') {
    return function () {
      vertxNext(flush);
    };
  }

  return useSetTimeout();
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var vertx = Function('return this')().require('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = void 0;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && "function" === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;


  if (_state) {
    var callback = arguments[_state - 1];
    asap(function () {
      return invokeCallback(_state, child, callback, parent._result);
    });
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve$1(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(2);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function tryThen(then$$1, value, fulfillmentHandler, rejectionHandler) {
  try {
    then$$1.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then$$1) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then$$1, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return resolve(promise, value);
    }, function (reason) {
      return reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$1) {
  if (maybeThenable.constructor === promise.constructor && then$$1 === then && maybeThenable.constructor.resolve === resolve$1) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$1 === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$1)) {
      handleForeignThenable(promise, maybeThenable, then$$1);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    var then$$1 = void 0;
    try {
      then$$1 = value.then;
    } catch (error) {
      reject(promise, error);
      return;
    }
    handleMaybeThenable(promise, value, then$$1);
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;


  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = void 0,
      callback = void 0,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = void 0,
      error = void 0,
      succeeded = true;

  if (hasCallback) {
    try {
      value = callback(detail);
    } catch (e) {
      succeeded = false;
      error = e;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (succeeded === false) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch (e) {
    reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
}

var Enumerator = function () {
  function Enumerator(Constructor, input) {
    this._instanceConstructor = Constructor;
    this.promise = new Constructor(noop);

    if (!this.promise[PROMISE_ID]) {
      makePromise(this.promise);
    }

    if (isArray(input)) {
      this.length = input.length;
      this._remaining = input.length;

      this._result = new Array(this.length);

      if (this.length === 0) {
        fulfill(this.promise, this._result);
      } else {
        this.length = this.length || 0;
        this._enumerate(input);
        if (this._remaining === 0) {
          fulfill(this.promise, this._result);
        }
      }
    } else {
      reject(this.promise, validationError());
    }
  }

  Enumerator.prototype._enumerate = function _enumerate(input) {
    for (var i = 0; this._state === PENDING && i < input.length; i++) {
      this._eachEntry(input[i], i);
    }
  };

  Enumerator.prototype._eachEntry = function _eachEntry(entry, i) {
    var c = this._instanceConstructor;
    var resolve$$1 = c.resolve;


    if (resolve$$1 === resolve$1) {
      var _then = void 0;
      var error = void 0;
      var didError = false;
      try {
        _then = entry.then;
      } catch (e) {
        didError = true;
        error = e;
      }

      if (_then === then && entry._state !== PENDING) {
        this._settledAt(entry._state, i, entry._result);
      } else if (typeof _then !== 'function') {
        this._remaining--;
        this._result[i] = entry;
      } else if (c === Promise$1) {
        var promise = new c(noop);
        if (didError) {
          reject(promise, error);
        } else {
          handleMaybeThenable(promise, entry, _then);
        }
        this._willSettleAt(promise, i);
      } else {
        this._willSettleAt(new c(function (resolve$$1) {
          return resolve$$1(entry);
        }), i);
      }
    } else {
      this._willSettleAt(resolve$$1(entry), i);
    }
  };

  Enumerator.prototype._settledAt = function _settledAt(state, i, value) {
    var promise = this.promise;


    if (promise._state === PENDING) {
      this._remaining--;

      if (state === REJECTED) {
        reject(promise, value);
      } else {
        this._result[i] = value;
      }
    }

    if (this._remaining === 0) {
      fulfill(promise, this._result);
    }
  };

  Enumerator.prototype._willSettleAt = function _willSettleAt(promise, i) {
    var enumerator = this;

    subscribe(promise, undefined, function (value) {
      return enumerator._settledAt(FULFILLED, i, value);
    }, function (reason) {
      return enumerator._settledAt(REJECTED, i, reason);
    });
  };

  return Enumerator;
}();

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject$1(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

/**
  Promise objects represent the eventual result of an asynchronous operation. The
  primary way of interacting with a promise is through its `then` method, which
  registers callbacks to receive either a promise's eventual value or the reason
  why the promise cannot be fulfilled.

  Terminology
  -----------

  - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
  - `thenable` is an object or function that defines a `then` method.
  - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
  - `exception` is a value that is thrown using the throw statement.
  - `reason` is a value that indicates why a promise was rejected.
  - `settled` the final resting state of a promise, fulfilled or rejected.

  A promise can be in one of three states: pending, fulfilled, or rejected.

  Promises that are fulfilled have a fulfillment value and are in the fulfilled
  state.  Promises that are rejected have a rejection reason and are in the
  rejected state.  A fulfillment value is never a thenable.

  Promises can also be said to *resolve* a value.  If this value is also a
  promise, then the original promise's settled state will match the value's
  settled state.  So a promise that *resolves* a promise that rejects will
  itself reject, and a promise that *resolves* a promise that fulfills will
  itself fulfill.


  Basic Usage:
  ------------

  ```js
  let promise = new Promise(function(resolve, reject) {
    // on success
    resolve(value);

    // on failure
    reject(reason);
  });

  promise.then(function(value) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Advanced Usage:
  ---------------

  Promises shine when abstracting away asynchronous interactions such as
  `XMLHttpRequest`s.

  ```js
  function getJSON(url) {
    return new Promise(function(resolve, reject){
      let xhr = new XMLHttpRequest();

      xhr.open('GET', url);
      xhr.onreadystatechange = handler;
      xhr.responseType = 'json';
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.send();

      function handler() {
        if (this.readyState === this.DONE) {
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
          }
        }
      };
    });
  }

  getJSON('/posts.json').then(function(json) {
    // on fulfillment
  }, function(reason) {
    // on rejection
  });
  ```

  Unlike callbacks, promises are great composable primitives.

  ```js
  Promise.all([
    getJSON('/posts'),
    getJSON('/comments')
  ]).then(function(values){
    values[0] // => postsJSON
    values[1] // => commentsJSON

    return values;
  });
  ```

  @class Promise
  @param {Function} resolver
  Useful for tooling.
  @constructor
*/

var Promise$1 = function () {
  function Promise(resolver) {
    this[PROMISE_ID] = nextId();
    this._result = this._state = undefined;
    this._subscribers = [];

    if (noop !== resolver) {
      typeof resolver !== 'function' && needsResolver();
      this instanceof Promise ? initializePromise(this, resolver) : needsNew();
    }
  }

  /**
  The primary way of interacting with a promise is through its `then` method,
  which registers callbacks to receive either a promise's eventual value or the
  reason why the promise cannot be fulfilled.
   ```js
  findUser().then(function(user){
    // user is available
  }, function(reason){
    // user is unavailable, and you are given the reason why
  });
  ```
   Chaining
  --------
   The return value of `then` is itself a promise.  This second, 'downstream'
  promise is resolved with the return value of the first promise's fulfillment
  or rejection handler, or rejected if the handler throws an exception.
   ```js
  findUser().then(function (user) {
    return user.name;
  }, function (reason) {
    return 'default name';
  }).then(function (userName) {
    // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
    // will be `'default name'`
  });
   findUser().then(function (user) {
    throw new Error('Found user, but still unhappy');
  }, function (reason) {
    throw new Error('`findUser` rejected and we're unhappy');
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
    // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
  });
  ```
  If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.
   ```js
  findUser().then(function (user) {
    throw new PedagogicalException('Upstream error');
  }).then(function (value) {
    // never reached
  }).then(function (value) {
    // never reached
  }, function (reason) {
    // The `PedgagocialException` is propagated all the way down to here
  });
  ```
   Assimilation
  ------------
   Sometimes the value you want to propagate to a downstream promise can only be
  retrieved asynchronously. This can be achieved by returning a promise in the
  fulfillment or rejection handler. The downstream promise will then be pending
  until the returned promise is settled. This is called *assimilation*.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // The user's comments are now available
  });
  ```
   If the assimliated promise rejects, then the downstream promise will also reject.
   ```js
  findUser().then(function (user) {
    return findCommentsByAuthor(user);
  }).then(function (comments) {
    // If `findCommentsByAuthor` fulfills, we'll have the value here
  }, function (reason) {
    // If `findCommentsByAuthor` rejects, we'll have the reason here
  });
  ```
   Simple Example
  --------------
   Synchronous Example
   ```javascript
  let result;
   try {
    result = findResult();
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
  findResult(function(result, err){
    if (err) {
      // failure
    } else {
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findResult().then(function(result){
    // success
  }, function(reason){
    // failure
  });
  ```
   Advanced Example
  --------------
   Synchronous Example
   ```javascript
  let author, books;
   try {
    author = findAuthor();
    books  = findBooksByAuthor(author);
    // success
  } catch(reason) {
    // failure
  }
  ```
   Errback Example
   ```js
   function foundBooks(books) {
   }
   function failure(reason) {
   }
   findAuthor(function(author, err){
    if (err) {
      failure(err);
      // failure
    } else {
      try {
        findBoooksByAuthor(author, function(books, err) {
          if (err) {
            failure(err);
          } else {
            try {
              foundBooks(books);
            } catch(reason) {
              failure(reason);
            }
          }
        });
      } catch(error) {
        failure(err);
      }
      // success
    }
  });
  ```
   Promise Example;
   ```javascript
  findAuthor().
    then(findBooksByAuthor).
    then(function(books){
      // found books
  }).catch(function(reason){
    // something went wrong
  });
  ```
   @method then
  @param {Function} onFulfilled
  @param {Function} onRejected
  Useful for tooling.
  @return {Promise}
  */

  /**
  `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
  as the catch block of a try/catch statement.
  ```js
  function findAuthor(){
  throw new Error('couldn't find that author');
  }
  // synchronous
  try {
  findAuthor();
  } catch(reason) {
  // something went wrong
  }
  // async with promises
  findAuthor().catch(function(reason){
  // something went wrong
  });
  ```
  @method catch
  @param {Function} onRejection
  Useful for tooling.
  @return {Promise}
  */


  Promise.prototype.catch = function _catch(onRejection) {
    return this.then(null, onRejection);
  };

  /**
    `finally` will be invoked regardless of the promise's fate just as native
    try/catch/finally behaves
  
    Synchronous example:
  
    ```js
    findAuthor() {
      if (Math.random() > 0.5) {
        throw new Error();
      }
      return new Author();
    }
  
    try {
      return findAuthor(); // succeed or fail
    } catch(error) {
      return findOtherAuther();
    } finally {
      // always runs
      // doesn't affect the return value
    }
    ```
  
    Asynchronous example:
  
    ```js
    findAuthor().catch(function(reason){
      return findOtherAuther();
    }).finally(function(){
      // author was either found, or not
    });
    ```
  
    @method finally
    @param {Function} callback
    @return {Promise}
  */


  Promise.prototype.finally = function _finally(callback) {
    var promise = this;
    var constructor = promise.constructor;

    if (isFunction(callback)) {
      return promise.then(function (value) {
        return constructor.resolve(callback()).then(function () {
          return value;
        });
      }, function (reason) {
        return constructor.resolve(callback()).then(function () {
          throw reason;
        });
      });
    }

    return promise.then(callback, callback);
  };

  return Promise;
}();

Promise$1.prototype.then = then;
Promise$1.all = all;
Promise$1.race = race;
Promise$1.resolve = resolve$1;
Promise$1.reject = reject$1;
Promise$1._setScheduler = setScheduler;
Promise$1._setAsap = setAsap;
Promise$1._asap = asap;

/*global self*/
function polyfill() {
  var local = void 0;

  if (typeof __webpack_require__.g !== 'undefined') {
    local = __webpack_require__.g;
  } else if (typeof self !== 'undefined') {
    local = self;
  } else {
    try {
      local = Function('return this')();
    } catch (e) {
      throw new Error('polyfill failed because global object is unavailable in this environment');
    }
  }

  var P = local.Promise;

  if (P) {
    var promiseToString = null;
    try {
      promiseToString = Object.prototype.toString.call(P.resolve());
    } catch (e) {
      // silently ignored
    }

    if (promiseToString === '[object Promise]' && !P.cast) {
      return;
    }
  }

  local.Promise = Promise$1;
}

// Strange compat..
Promise$1.polyfill = polyfill;
Promise$1.Promise = Promise$1;

return Promise$1;

})));



//# sourceMappingURL=es6-promise.map


/***/ }),

/***/ 729:
/***/ ((module) => {

"use strict";


var has = Object.prototype.hasOwnProperty
  , prefix = '~';

/**
 * Constructor to create a storage for our `EE` objects.
 * An `Events` instance is a plain object whose properties are event names.
 *
 * @constructor
 * @private
 */
function Events() {}

//
// We try to not inherit from `Object.prototype`. In some engines creating an
// instance in this way is faster than calling `Object.create(null)` directly.
// If `Object.create(null)` is not supported we prefix the event names with a
// character to make sure that the built-in object properties are not
// overridden or used as an attack vector.
//
if (Object.create) {
  Events.prototype = Object.create(null);

  //
  // This hack is needed because the `__proto__` property is still inherited in
  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
  //
  if (!new Events().__proto__) prefix = false;
}

/**
 * Representation of a single event listener.
 *
 * @param {Function} fn The listener function.
 * @param {*} context The context to invoke the listener with.
 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
 * @constructor
 * @private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Add a listener for a given event.
 *
 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} context The context to invoke the listener with.
 * @param {Boolean} once Specify if the listener is a one-time listener.
 * @returns {EventEmitter}
 * @private
 */
function addListener(emitter, event, fn, context, once) {
  if (typeof fn !== 'function') {
    throw new TypeError('The listener must be a function');
  }

  var listener = new EE(fn, context || emitter, once)
    , evt = prefix ? prefix + event : event;

  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
  else emitter._events[evt] = [emitter._events[evt], listener];

  return emitter;
}

/**
 * Clear event by name.
 *
 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
 * @param {(String|Symbol)} evt The Event name.
 * @private
 */
function clearEvent(emitter, evt) {
  if (--emitter._eventsCount === 0) emitter._events = new Events();
  else delete emitter._events[evt];
}

/**
 * Minimal `EventEmitter` interface that is molded against the Node.js
 * `EventEmitter` interface.
 *
 * @constructor
 * @public
 */
function EventEmitter() {
  this._events = new Events();
  this._eventsCount = 0;
}

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var names = []
    , events
    , name;

  if (this._eventsCount === 0) return names;

  for (name in (events = this._events)) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return the listeners registered for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Array} The registered listeners.
 * @public
 */
EventEmitter.prototype.listeners = function listeners(event) {
  var evt = prefix ? prefix + event : event
    , handlers = this._events[evt];

  if (!handlers) return [];
  if (handlers.fn) return [handlers.fn];

  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
    ee[i] = handlers[i].fn;
  }

  return ee;
};

/**
 * Return the number of listeners listening to a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Number} The number of listeners.
 * @public
 */
EventEmitter.prototype.listenerCount = function listenerCount(event) {
  var evt = prefix ? prefix + event : event
    , listeners = this._events[evt];

  if (!listeners) return 0;
  if (listeners.fn) return 1;
  return listeners.length;
};

/**
 * Calls each of the listeners registered for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Boolean} `true` if the event had listeners, else `false`.
 * @public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if (listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Add a listener for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  return addListener(this, event, fn, context, false);
};

/**
 * Add a one-time listener for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  return addListener(this, event, fn, context, true);
};

/**
 * Remove the listeners of a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn Only remove the listeners that match this function.
 * @param {*} context Only remove the listeners that have this context.
 * @param {Boolean} once Only remove one-time listeners.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return this;
  if (!fn) {
    clearEvent(this, evt);
    return this;
  }

  var listeners = this._events[evt];

  if (listeners.fn) {
    if (
      listeners.fn === fn &&
      (!once || listeners.once) &&
      (!context || listeners.context === context)
    ) {
      clearEvent(this, evt);
    }
  } else {
    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
      if (
        listeners[i].fn !== fn ||
        (once && !listeners[i].once) ||
        (context && listeners[i].context !== context)
      ) {
        events.push(listeners[i]);
      }
    }

    //
    // Reset the array, or remove it completely if we have no more listeners.
    //
    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
    else clearEvent(this, evt);
  }

  return this;
};

/**
 * Remove all listeners, or those of the specified event.
 *
 * @param {(String|Symbol)} [event] The event name.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  var evt;

  if (event) {
    evt = prefix ? prefix + event : event;
    if (this._events[evt]) clearEvent(this, evt);
  } else {
    this._events = new Events();
    this._eventsCount = 0;
  }

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Allow `EventEmitter` to be imported as module namespace.
//
EventEmitter.EventEmitter = EventEmitter;

//
// Expose the module.
//
if (true) {
  module.exports = EventEmitter;
}


/***/ }),

/***/ 303:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";



module.exports = __webpack_require__(457);


/***/ }),

/***/ 402:
/***/ ((module) => {

/*
 * File: iframeResizer.contentWindow.js
 * Desc: Include this file in any page being loaded into an iframe
 *       to force the iframe to resize to the content size.
 * Requires: iframeResizer.js on host page.
 * Doc: https://github.com/davidjbradshaw/iframe-resizer
 * Author: David J. Bradshaw - dave@bradshaw.net
 * Contributor: Jure Mav - jure.mav@gmail.com
 * Contributor: Ian Caunce - ian@hallnet.co.uk
 */


;(function(undefined) {
	'use strict';

	if(typeof window === 'undefined') return; // don't run for server side render

	var
		autoResize            = true,
		base                  = 10,
		bodyBackground        = '',
		bodyMargin            = 0,
		bodyMarginStr         = '',
		bodyObserver          = null,
		bodyPadding           = '',
		calculateWidth        = false,
		doubleEventList       = {'resize':1,'click':1},
		eventCancelTimer      = 128,
		firstRun              = true,
		height                = 1,
		heightCalcModeDefault = 'bodyOffset',
		heightCalcMode        = heightCalcModeDefault,
		initLock              = true,
		initMsg               = '',
		inPageLinks           = {},
		interval              = 32,
		intervalTimer         = null,
		logging               = false,
		msgID                 = '[iFrameSizer]',  //Must match host page msg ID
		msgIdLen              = msgID.length,
		myID                  = '',
		observer              = null,
		resetRequiredMethods  = {max:1,min:1,bodyScroll:1,documentElementScroll:1},
		resizeFrom            = 'child',
		sendPermit            = true,
		target                = window.parent,
		targetOriginDefault   = '*',
		tolerance             = 0,
		triggerLocked         = false,
		triggerLockedTimer    = null,
		throttledTimer        = 16,
		width                 = 1,
		widthCalcModeDefault  = 'scroll',
		widthCalcMode         = widthCalcModeDefault,
		win                   = window,
		messageCallback       = function(){ warn('MessageCallback function not defined'); },
		readyCallback         = function(){},
		pageInfoCallback      = function(){},
		customCalcMethods     = {
			height: function(){
				warn('Custom height calculation function not defined');
				return document.documentElement.offsetHeight;
			},
			width: function(){
				warn('Custom width calculation function not defined');
				return document.body.scrollWidth;
			}
		},
		eventHandlersByName   = {};


	function addEventListener(el,evt,func){
		/* istanbul ignore else */ // Not testable in phantonJS
		if ('addEventListener' in window){
			el.addEventListener(evt,func, false);
		} else if ('attachEvent' in window){ //IE
			el.attachEvent('on'+evt,func);
		}
	}

	function removeEventListener(el,evt,func){
		/* istanbul ignore else */ // Not testable in phantonJS
		if ('removeEventListener' in window){
			el.removeEventListener(evt,func, false);
		} else if ('detachEvent' in window){ //IE
			el.detachEvent('on'+evt,func);
		}
	}

	function capitalizeFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}

	//Based on underscore.js
	function throttle(func) {
		var
			context, args, result,
			timeout = null,
			previous = 0,
			later = function() {
				previous = getNow();
				timeout = null;
				result = func.apply(context, args);
				if (!timeout) {
					context = args = null;
				}
			};

		return function() {
			var now = getNow();

			if (!previous) {
				previous = now;
			}

			var remaining = throttledTimer - (now - previous);

			context = this;
			args = arguments;

			if (remaining <= 0 || remaining > throttledTimer) {
				if (timeout) {
					clearTimeout(timeout);
					timeout = null;
				}

				previous = now;
				result = func.apply(context, args);

				if (!timeout) {
					context = args = null;
				}

			} else if (!timeout) {
				timeout = setTimeout(later, remaining);
			}

			return result;
		};
	}

	var getNow = Date.now || function() {
		/* istanbul ignore next */ // Not testable in PhantonJS
		return new Date().getTime();
	};

	function formatLogMsg(msg){
		return msgID + '[' + myID + ']' + ' ' + msg;
	}

	function log(msg){
		if (logging && ('object' === typeof window.console)){
			console.log(formatLogMsg(msg));
		}
	}

	function warn(msg){
		if ('object' === typeof window.console){
			console.warn(formatLogMsg(msg));
		}
	}


	function init(){
		readDataFromParent();
		log('Initialising iFrame ('+location.href+')');
		readDataFromPage();
		setMargin();
		setBodyStyle('background',bodyBackground);
		setBodyStyle('padding',bodyPadding);
		injectClearFixIntoBodyElement();
		checkHeightMode();
		checkWidthMode();
		stopInfiniteResizingOfIFrame();
		setupPublicMethods();
		startEventListeners();
		inPageLinks = setupInPageLinks();
		sendSize('init','Init message from host page');
		readyCallback();
	}

	function readDataFromParent(){

		function strBool(str){
			return 'true' === str ? true : false;
		}

		var data = initMsg.substr(msgIdLen).split(':');

		myID               = data[0];
		bodyMargin         = (undefined !== data[1]) ? Number(data[1])   : bodyMargin; //For V1 compatibility
		calculateWidth     = (undefined !== data[2]) ? strBool(data[2])  : calculateWidth;
		logging            = (undefined !== data[3]) ? strBool(data[3])  : logging;
		interval           = (undefined !== data[4]) ? Number(data[4])   : interval;
		autoResize         = (undefined !== data[6]) ? strBool(data[6])  : autoResize;
		bodyMarginStr      = data[7];
		heightCalcMode     = (undefined !== data[8]) ? data[8]           : heightCalcMode;
		bodyBackground     = data[9];
		bodyPadding        = data[10];
		tolerance          = (undefined !== data[11]) ? Number(data[11]) : tolerance;
		inPageLinks.enable = (undefined !== data[12]) ? strBool(data[12]): false;
		resizeFrom         = (undefined !== data[13]) ? data[13]         : resizeFrom;
		widthCalcMode      = (undefined !== data[14]) ? data[14]         : widthCalcMode;
	}

	function readDataFromPage(){
		function readData(){
			var data = window.iFrameResizer;

			log('Reading data from page: ' + JSON.stringify(data));

			messageCallback     = ('messageCallback'         in data) ? data.messageCallback         : messageCallback;
			readyCallback       = ('readyCallback'           in data) ? data.readyCallback           : readyCallback;
			targetOriginDefault = ('targetOrigin'            in data) ? data.targetOrigin            : targetOriginDefault;
			heightCalcMode      = ('heightCalculationMethod' in data) ? data.heightCalculationMethod : heightCalcMode;
			widthCalcMode       = ('widthCalculationMethod'  in data) ? data.widthCalculationMethod  : widthCalcMode;
		}

		function setupCustomCalcMethods(calcMode, calcFunc){
			if ('function' === typeof calcMode) {
				log('Setup custom ' + calcFunc + 'CalcMethod');
				customCalcMethods[calcFunc] = calcMode;
				calcMode = 'custom';
			}

			return calcMode;
		}

		if(('iFrameResizer' in window) && (Object === window.iFrameResizer.constructor)) {
			readData();
			heightCalcMode = setupCustomCalcMethods(heightCalcMode, 'height');
			widthCalcMode  = setupCustomCalcMethods(widthCalcMode,  'width');
		}

		log('TargetOrigin for parent set to: ' + targetOriginDefault);
	}


	function chkCSS(attr,value){
		if (-1 !== value.indexOf('-')){
			warn('Negative CSS value ignored for '+attr);
			value='';
		}
		return value;
	}

	function setBodyStyle(attr,value){
		if ((undefined !== value) && ('' !== value) && ('null' !== value)){
			document.body.style[attr] = value;
			log('Body '+attr+' set to "'+value+'"');
		}
	}

	function setMargin(){
		//If called via V1 script, convert bodyMargin from int to str
		if (undefined === bodyMarginStr){
			bodyMarginStr = bodyMargin+'px';
		}

		setBodyStyle('margin',chkCSS('margin',bodyMarginStr));
	}

	function stopInfiniteResizingOfIFrame(){
		document.documentElement.style.height = '';
		document.body.style.height = '';
		log('HTML & body height set to "auto"');
	}


	function manageTriggerEvent(options){

		var listener = {
			add:    function(eventName){
				function handleEvent(){
					sendSize(options.eventName,options.eventType);
				}

				eventHandlersByName[eventName] = handleEvent;

				addEventListener(window,eventName,handleEvent);
			},
			remove: function(eventName){
				var handleEvent = eventHandlersByName[eventName];
				delete eventHandlersByName[eventName];

				removeEventListener(window,eventName,handleEvent);
			}
		};

		if(options.eventNames && Array.prototype.map){
			options.eventName = options.eventNames[0];
			options.eventNames.map(listener[options.method]);
		} else {
			listener[options.method](options.eventName);
		}

		log(capitalizeFirstLetter(options.method) + ' event listener: ' + options.eventType);
	}

	function manageEventListeners(method){
		manageTriggerEvent({method:method, eventType: 'Animation Start',           eventNames: ['animationstart','webkitAnimationStart'] });
		manageTriggerEvent({method:method, eventType: 'Animation Iteration',       eventNames: ['animationiteration','webkitAnimationIteration'] });
		manageTriggerEvent({method:method, eventType: 'Animation End',             eventNames: ['animationend','webkitAnimationEnd'] });
		manageTriggerEvent({method:method, eventType: 'Input',                     eventName:  'input' });
		manageTriggerEvent({method:method, eventType: 'Mouse Up',                  eventName:  'mouseup' });
		manageTriggerEvent({method:method, eventType: 'Mouse Down',                eventName:  'mousedown' });
		manageTriggerEvent({method:method, eventType: 'Orientation Change',        eventName:  'orientationchange' });
		manageTriggerEvent({method:method, eventType: 'Print',                     eventName:  ['afterprint', 'beforeprint'] });
		manageTriggerEvent({method:method, eventType: 'Ready State Change',        eventName:  'readystatechange' });
		manageTriggerEvent({method:method, eventType: 'Touch Start',               eventName:  'touchstart' });
		manageTriggerEvent({method:method, eventType: 'Touch End',                 eventName:  'touchend' });
		manageTriggerEvent({method:method, eventType: 'Touch Cancel',              eventName:  'touchcancel' });
		manageTriggerEvent({method:method, eventType: 'Transition Start',          eventNames: ['transitionstart','webkitTransitionStart','MSTransitionStart','oTransitionStart','otransitionstart'] });
		manageTriggerEvent({method:method, eventType: 'Transition Iteration',      eventNames: ['transitioniteration','webkitTransitionIteration','MSTransitionIteration','oTransitionIteration','otransitioniteration'] });
		manageTriggerEvent({method:method, eventType: 'Transition End',            eventNames: ['transitionend','webkitTransitionEnd','MSTransitionEnd','oTransitionEnd','otransitionend'] });
		if('child' === resizeFrom){
			manageTriggerEvent({method:method, eventType: 'IFrame Resized',        eventName:  'resize' });
		}
	}

	function checkCalcMode(calcMode,calcModeDefault,modes,type){
		if (calcModeDefault !== calcMode){
			if (!(calcMode in modes)){
				warn(calcMode + ' is not a valid option for '+type+'CalculationMethod.');
				calcMode=calcModeDefault;
			}
			log(type+' calculation method set to "'+calcMode+'"');
		}

		return calcMode;
	}

	function checkHeightMode(){
		heightCalcMode = checkCalcMode(heightCalcMode,heightCalcModeDefault,getHeight,'height');
	}

	function checkWidthMode(){
		widthCalcMode = checkCalcMode(widthCalcMode,widthCalcModeDefault,getWidth,'width');
	}

	function startEventListeners(){
		if ( true === autoResize ) {
			manageEventListeners('add');
			setupMutationObserver();
		}
		else {
			log('Auto Resize disabled');
		}
	}

	function stopMsgsToParent(){
		log('Disable outgoing messages');
		sendPermit = false;
	}

	function removeMsgListener(){
		log('Remove event listener: Message');
		removeEventListener(window, 'message', receiver);
	}

	function disconnectMutationObserver(){
		if (null !== bodyObserver){
			/* istanbul ignore next */ // Not testable in PhantonJS
			bodyObserver.disconnect();
		}
	}

	function stopEventListeners(){
		manageEventListeners('remove');
		disconnectMutationObserver();
		clearInterval(intervalTimer);
	}

	function teardown(){
		stopMsgsToParent();
		removeMsgListener();
		if (true === autoResize) stopEventListeners();
	}

	function injectClearFixIntoBodyElement(){
		var clearFix = document.createElement('div');
		clearFix.style.clear   = 'both';
		clearFix.style.display = 'block'; //Guard against this having been globally redefined in CSS.
		document.body.appendChild(clearFix);
	}

	function setupInPageLinks(){

		function getPagePosition (){
			return {
				x: (window.pageXOffset !== undefined) ? window.pageXOffset : document.documentElement.scrollLeft,
				y: (window.pageYOffset !== undefined) ? window.pageYOffset : document.documentElement.scrollTop
			};
		}

		function getElementPosition(el){
			var
				elPosition   = el.getBoundingClientRect(),
				pagePosition = getPagePosition();

			return {
				x: parseInt(elPosition.left,10) + parseInt(pagePosition.x,10),
				y: parseInt(elPosition.top,10)  + parseInt(pagePosition.y,10)
			};
		}

		function findTarget(location){
			function jumpToTarget(target){
				var jumpPosition = getElementPosition(target);

				log('Moving to in page link (#'+hash+') at x: '+jumpPosition.x+' y: '+jumpPosition.y);
				sendMsg(jumpPosition.y, jumpPosition.x, 'scrollToOffset'); // X&Y reversed at sendMsg uses height/width
			}

			var
				hash     = location.split('#')[1] || location, //Remove # if present
				hashData = decodeURIComponent(hash),
				target   = document.getElementById(hashData) || document.getElementsByName(hashData)[0];

			if (undefined !== target){
				jumpToTarget(target);
			} else {
				log('In page link (#' + hash + ') not found in iFrame, so sending to parent');
				sendMsg(0,0,'inPageLink','#'+hash);
			}
		}

		function checkLocationHash(){
			if ('' !== location.hash && '#' !== location.hash){
				findTarget(location.href);
			}
		}

		function bindAnchors(){
			function setupLink(el){
				function linkClicked(e){
					e.preventDefault();

					/*jshint validthis:true */
					findTarget(this.getAttribute('href'));
				}

				if ('#' !== el.getAttribute('href')){
					addEventListener(el,'click',linkClicked);
				}
			}

			Array.prototype.forEach.call( document.querySelectorAll( 'a[href^="#"]' ), setupLink );
		}

		function bindLocationHash(){
			addEventListener(window,'hashchange',checkLocationHash);
		}

		function initCheck(){ //check if page loaded with location hash after init resize
			setTimeout(checkLocationHash,eventCancelTimer);
		}

		function enableInPageLinks(){
			/* istanbul ignore else */ // Not testable in phantonJS
			if(Array.prototype.forEach && document.querySelectorAll){
				log('Setting up location.hash handlers');
				bindAnchors();
				bindLocationHash();
				initCheck();
			} else {
				warn('In page linking not fully supported in this browser! (See README.md for IE8 workaround)');
			}
		}

		if(inPageLinks.enable){
			enableInPageLinks();
		} else {
			log('In page linking not enabled');
		}

		return {
			findTarget:findTarget
		};
	}

	function setupPublicMethods(){
		log('Enable public methods');

		win.parentIFrame = {

			autoResize: function autoResizeF(resize){
				if (true === resize && false === autoResize) {
					autoResize=true;
					startEventListeners();
					//sendSize('autoResize','Auto Resize enabled');
				} else if (false === resize && true === autoResize) {
					autoResize=false;
					stopEventListeners();
				}

				return autoResize;
			},

			close: function closeF(){
				sendMsg(0,0,'close');
				teardown();
			},

			getId: function getIdF(){
				return myID;
			},

			getPageInfo: function getPageInfoF(callback){
				if ('function' === typeof callback){
					pageInfoCallback = callback;
					sendMsg(0,0,'pageInfo');
				} else {
					pageInfoCallback = function(){};
					sendMsg(0,0,'pageInfoStop');
				}
			},

			moveToAnchor: function moveToAnchorF(hash){
				inPageLinks.findTarget(hash);
			},

			reset: function resetF(){
				resetIFrame('parentIFrame.reset');
			},

			scrollTo: function scrollToF(x,y){
				sendMsg(y,x,'scrollTo'); // X&Y reversed at sendMsg uses height/width
			},

			scrollToOffset: function scrollToF(x,y){
				sendMsg(y,x,'scrollToOffset'); // X&Y reversed at sendMsg uses height/width
			},

			sendMessage: function sendMessageF(msg,targetOrigin){
				sendMsg(0,0,'message',JSON.stringify(msg),targetOrigin);
			},

			setHeightCalculationMethod: function setHeightCalculationMethodF(heightCalculationMethod){
				heightCalcMode = heightCalculationMethod;
				checkHeightMode();
			},

			setWidthCalculationMethod: function setWidthCalculationMethodF(widthCalculationMethod){
				widthCalcMode = widthCalculationMethod;
				checkWidthMode();
			},

			setTargetOrigin: function setTargetOriginF(targetOrigin){
				log('Set targetOrigin: '+targetOrigin);
				targetOriginDefault = targetOrigin;
			},

			size: function sizeF(customHeight, customWidth){
				var valString = ''+(customHeight?customHeight:'')+(customWidth?','+customWidth:'');
				//lockTrigger();
				sendSize('size','parentIFrame.size('+valString+')', customHeight, customWidth);
			}
		};
	}

	function initInterval(){
		if ( 0 !== interval ){
			log('setInterval: '+interval+'ms');
			intervalTimer = setInterval(function(){
				sendSize('interval','setInterval: '+interval);
			},Math.abs(interval));
		}
	}

	/* istanbul ignore next */  //Not testable in PhantomJS
	function setupBodyMutationObserver(){
		function addImageLoadListners(mutation) {
			function addImageLoadListener(element){
				if (false === element.complete) {
					log('Attach listeners to ' + element.src);
					element.addEventListener('load', imageLoaded, false);
					element.addEventListener('error', imageError, false);
					elements.push(element);
				}
			}

			if (mutation.type === 'attributes' && mutation.attributeName === 'src'){
				addImageLoadListener(mutation.target);
			} else if (mutation.type === 'childList'){
				Array.prototype.forEach.call(
					mutation.target.querySelectorAll('img'),
					addImageLoadListener
				);
			}
		}

		function removeFromArray(element){
			elements.splice(elements.indexOf(element),1);
		}

		function removeImageLoadListener(element){
			log('Remove listeners from ' + element.src);
			element.removeEventListener('load', imageLoaded, false);
			element.removeEventListener('error', imageError, false);
			removeFromArray(element);
		}

		function imageEventTriggered(event,type,typeDesc){
			removeImageLoadListener(event.target);
			sendSize(type, typeDesc + ': ' + event.target.src, undefined, undefined);
		}

		function imageLoaded(event) {
			imageEventTriggered(event,'imageLoad','Image loaded');
		}

		function imageError(event) {
			imageEventTriggered(event,'imageLoadFailed','Image load failed');
		}

		function mutationObserved(mutations) {
			sendSize('mutationObserver','mutationObserver: ' + mutations[0].target + ' ' + mutations[0].type);

			//Deal with WebKit asyncing image loading when tags are injected into the page
			mutations.forEach(addImageLoadListners);
		}

		function createMutationObserver(){
			var
				target = document.querySelector('body'),

				config = {
					attributes            : true,
					attributeOldValue     : false,
					characterData         : true,
					characterDataOldValue : false,
					childList             : true,
					subtree               : true
				};

			observer = new MutationObserver(mutationObserved);

			log('Create body MutationObserver');
			observer.observe(target, config);

			return observer;
		}

		var
			elements         = [],
			MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
			observer         = createMutationObserver();

		return {
			disconnect: function (){
				if ('disconnect' in observer){
					log('Disconnect body MutationObserver');
					observer.disconnect();
					elements.forEach(removeImageLoadListener);
				}
			}
		};
	}

	function setupMutationObserver(){
		var	forceIntervalTimer = 0 > interval;

		/* istanbul ignore if */ // Not testable in PhantomJS
		if (window.MutationObserver || window.WebKitMutationObserver){
			if (forceIntervalTimer) {
				initInterval();
			} else {
				bodyObserver = setupBodyMutationObserver();
			}
		} else {
			log('MutationObserver not supported in this browser!');
			initInterval();
		}
	}


	// document.documentElement.offsetHeight is not reliable, so
	// we have to jump through hoops to get a better value.
	function getComputedStyle(prop,el) {
		/* istanbul ignore next */  //Not testable in PhantomJS
		function convertUnitsToPxForIE8(value) {
			var PIXEL = /^\d+(px)?$/i;

			if (PIXEL.test(value)) {
				return parseInt(value,base);
			}

			var
				style = el.style.left,
				runtimeStyle = el.runtimeStyle.left;

			el.runtimeStyle.left = el.currentStyle.left;
			el.style.left = value || 0;
			value = el.style.pixelLeft;
			el.style.left = style;
			el.runtimeStyle.left = runtimeStyle;

			return value;
		}

		var retVal = 0;
		el =  el || document.body;

		/* istanbul ignore else */ // Not testable in phantonJS
		if (('defaultView' in document) && ('getComputedStyle' in document.defaultView)) {
			retVal = document.defaultView.getComputedStyle(el, null);
			retVal = (null !== retVal) ? retVal[prop] : 0;
		} else {//IE8
			retVal =  convertUnitsToPxForIE8(el.currentStyle[prop]);
		}

		return parseInt(retVal,base);
	}

	function chkEventThottle(timer){
		if(timer > throttledTimer/2){
			throttledTimer = 2*timer;
			log('Event throttle increased to ' + throttledTimer + 'ms');
		}
	}

	//Idea from https://github.com/guardian/iframe-messenger
	function getMaxElement(side,elements) {
		var
			elementsLength = elements.length,
			elVal          = 0,
			maxVal         = 0,
			Side           = capitalizeFirstLetter(side),
			timer          = getNow();

		for (var i = 0; i < elementsLength; i++) {
			elVal = elements[i].getBoundingClientRect()[side] + getComputedStyle('margin'+Side,elements[i]);
			if (elVal > maxVal) {
				maxVal = elVal;
			}
		}

		timer = getNow() - timer;

		log('Parsed '+elementsLength+' HTML elements');
		log('Element position calculated in ' + timer + 'ms');

		chkEventThottle(timer);

		return maxVal;
	}

	function getAllMeasurements(dimention){
		return [
			dimention.bodyOffset(),
			dimention.bodyScroll(),
			dimention.documentElementOffset(),
			dimention.documentElementScroll()
		];
	}

	function getTaggedElements(side,tag){
		function noTaggedElementsFound(){
			warn('No tagged elements ('+tag+') found on page');
			return document.querySelectorAll('body *');
		}

		var elements = document.querySelectorAll('['+tag+']');

		if (0 === elements.length) noTaggedElementsFound();

		return getMaxElement(side,elements);
	}

	function getAllElements(){
		return document.querySelectorAll('body *');
	}

	var
		getHeight = {
			bodyOffset: function getBodyOffsetHeight(){
				return  document.body.offsetHeight + getComputedStyle('marginTop') + getComputedStyle('marginBottom');
			},

			offset: function(){
				return getHeight.bodyOffset(); //Backwards compatability
			},

			bodyScroll: function getBodyScrollHeight(){
				return document.body.scrollHeight;
			},

			custom: function getCustomWidth(){
				return customCalcMethods.height();
			},

			documentElementOffset: function getDEOffsetHeight(){
				return document.documentElement.offsetHeight;
			},

			documentElementScroll: function getDEScrollHeight(){
				return document.documentElement.scrollHeight;
			},

			max: function getMaxHeight(){
				return Math.max.apply(null,getAllMeasurements(getHeight));
			},

			min: function getMinHeight(){
				return Math.min.apply(null,getAllMeasurements(getHeight));
			},

			grow: function growHeight(){
				return getHeight.max(); //Run max without the forced downsizing
			},

			lowestElement: function getBestHeight(){
				return Math.max(getHeight.bodyOffset(), getMaxElement('bottom',getAllElements()));
			},

			taggedElement: function getTaggedElementsHeight(){
				return getTaggedElements('bottom','data-iframe-height');
			}
		},

		getWidth = {
			bodyScroll: function getBodyScrollWidth(){
				return document.body.scrollWidth;
			},

			bodyOffset: function getBodyOffsetWidth(){
				return document.body.offsetWidth;
			},

			custom: function getCustomWidth(){
				return customCalcMethods.width();
			},

			documentElementScroll: function getDEScrollWidth(){
				return document.documentElement.scrollWidth;
			},

			documentElementOffset: function getDEOffsetWidth(){
				return document.documentElement.offsetWidth;
			},

			scroll: function getMaxWidth(){
				return Math.max(getWidth.bodyScroll(), getWidth.documentElementScroll());
			},

			max: function getMaxWidth(){
				return Math.max.apply(null,getAllMeasurements(getWidth));
			},

			min: function getMinWidth(){
				return Math.min.apply(null,getAllMeasurements(getWidth));
			},

			rightMostElement: function rightMostElement(){
				return getMaxElement('right', getAllElements());
			},

			taggedElement: function getTaggedElementsWidth(){
				return getTaggedElements('right', 'data-iframe-width');
			}
		};


	function sizeIFrame(triggerEvent, triggerEventDesc, customHeight, customWidth){

		function resizeIFrame(){
			height = currentHeight;
			width  = currentWidth;

			sendMsg(height,width,triggerEvent);
		}

		function isSizeChangeDetected(){
			function checkTolarance(a,b){
				var retVal = Math.abs(a-b) <= tolerance;
				return !retVal;
			}

			currentHeight = (undefined !== customHeight)  ? customHeight : getHeight[heightCalcMode]();
			currentWidth  = (undefined !== customWidth )  ? customWidth  : getWidth[widthCalcMode]();

			return	checkTolarance(height,currentHeight) || (calculateWidth && checkTolarance(width,currentWidth));
		}

		function isForceResizableEvent(){
			return !(triggerEvent in {'init':1,'interval':1,'size':1});
		}

		function isForceResizableCalcMode(){
			return (heightCalcMode in resetRequiredMethods) || (calculateWidth && widthCalcMode in resetRequiredMethods);
		}

		function logIgnored(){
			log('No change in size detected');
		}

		function checkDownSizing(){
			if (isForceResizableEvent() && isForceResizableCalcMode()){
				resetIFrame(triggerEventDesc);
			} else if (!(triggerEvent in {'interval':1})){
				logIgnored();
			}
		}

		var	currentHeight,currentWidth;

		if (isSizeChangeDetected() || 'init' === triggerEvent){
			lockTrigger();
			resizeIFrame();
		} else {
			checkDownSizing();
		}
	}

	var sizeIFrameThrottled = throttle(sizeIFrame);

	function sendSize(triggerEvent, triggerEventDesc, customHeight, customWidth){
		function recordTrigger(){
			if (!(triggerEvent in {'reset':1,'resetPage':1,'init':1})){
				log( 'Trigger event: ' + triggerEventDesc );
			}
		}

		function isDoubleFiredEvent(){
			return  triggerLocked && (triggerEvent in doubleEventList);
		}

		if (!isDoubleFiredEvent()){
			recordTrigger();
			sizeIFrameThrottled(triggerEvent, triggerEventDesc, customHeight, customWidth);
		} else {
			log('Trigger event cancelled: '+triggerEvent);
		}
	}

	function lockTrigger(){
		if (!triggerLocked){
			triggerLocked = true;
			log('Trigger event lock on');
		}
		clearTimeout(triggerLockedTimer);
		triggerLockedTimer = setTimeout(function(){
			triggerLocked = false;
			log('Trigger event lock off');
			log('--');
		},eventCancelTimer);
	}

	function triggerReset(triggerEvent){
		height = getHeight[heightCalcMode]();
		width  = getWidth[widthCalcMode]();

		sendMsg(height,width,triggerEvent);
	}

	function resetIFrame(triggerEventDesc){
		var hcm = heightCalcMode;
		heightCalcMode = heightCalcModeDefault;

		log('Reset trigger event: ' + triggerEventDesc);
		lockTrigger();
		triggerReset('reset');

		heightCalcMode = hcm;
	}

	function sendMsg(height,width,triggerEvent,msg,targetOrigin){
		function setTargetOrigin(){
			if (undefined === targetOrigin){
				targetOrigin = targetOriginDefault;
			} else {
				log('Message targetOrigin: '+targetOrigin);
			}
		}

		function sendToParent(){
			var
				size  = height + ':' + width,
				message = myID + ':' +  size + ':' + triggerEvent + (undefined !== msg ? ':' + msg : '');

			log('Sending message to host page (' + message + ')');
			target.postMessage( msgID + message, targetOrigin);
		}

		if(true === sendPermit){
			setTargetOrigin();
			sendToParent();
		}
	}

	function receiver(event) {
		var processRequestFromParent = {
			init: function initFromParent(){
				function fireInit(){
					initMsg = event.data;
					target  = event.source;

					init();
					firstRun = false;
					setTimeout(function(){ initLock = false;},eventCancelTimer);
				}

				if (document.readyState === "interactive" || document.readyState === "complete"){
					fireInit();
				} else {
					log('Waiting for page ready');
					addEventListener(window,'readystatechange',processRequestFromParent.initFromParent);
				}
			},

			reset: function resetFromParent(){
				if (!initLock){
					log('Page size reset by host page');
					triggerReset('resetPage');
				} else {
					log('Page reset ignored by init');
				}
			},

			resize: function resizeFromParent(){
				sendSize('resizeParent','Parent window requested size check');
			},

			moveToAnchor: function moveToAnchorF(){
				inPageLinks.findTarget(getData());
			},
			inPageLink: function inPageLinkF() {this.moveToAnchor();}, //Backward compatability

			pageInfo: function pageInfoFromParent(){
				var msgBody = getData();
				log('PageInfoFromParent called from parent: ' + msgBody );
				pageInfoCallback(JSON.parse(msgBody));
				log(' --');
			},

			message: function messageFromParent(){
				var msgBody = getData();

				log('MessageCallback called from parent: ' + msgBody );
				messageCallback(JSON.parse(msgBody));
				log(' --');
			}
		};

		function isMessageForUs(){
			return msgID === (''+event.data).substr(0,msgIdLen); //''+ Protects against non-string messages
		}

		function getMessageType(){
			return event.data.split(']')[1].split(':')[0];
		}

		function getData(){
			return event.data.substr(event.data.indexOf(':')+1);
		}

		function isMiddleTier(){
			return !( true && module.exports) && ('iFrameResize' in window);
		}

		function isInitMsg(){
			//Test if this message is from a child below us. This is an ugly test, however, updating
			//the message format would break backwards compatibity.
			return event.data.split(':')[2] in {'true':1,'false':1};
		}

		function callFromParent(){
			var messageType = getMessageType();

			if (messageType in processRequestFromParent){
				processRequestFromParent[messageType]();
			} else if (!isMiddleTier() && !isInitMsg()){
				warn('Unexpected message ('+event.data+')');
			}
		}

		function processMessage(){
			if (false === firstRun) {
				callFromParent();
			} else if (isInitMsg()) {
				processRequestFromParent.init();
			} else {
				log('Ignored message of type "' + getMessageType() + '". Received before initialization.');
			}
		}

		if (isMessageForUs()){
			processMessage();
		}
	}

	//Normally the parent kicks things off when it detects the iFrame has loaded.
	//If this script is async-loaded, then tell parent page to retry init.
	function chkLateLoaded(){
		if('loading' !== document.readyState){
			window.parent.postMessage('[iFrameResizerChild]Ready','*');
		}
	}

	addEventListener(window, 'message', receiver);
	chkLateLoaded();

	

})();


/***/ }),

/***/ 28:
/***/ ((module, exports) => {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*
 * File: iframeResizer.js
 * Desc: Force iframes to size to content.
 * Requires: iframeResizer.contentWindow.js to be loaded into the target frame.
 * Doc: https://github.com/davidjbradshaw/iframe-resizer
 * Author: David J. Bradshaw - dave@bradshaw.net
 * Contributor: Jure Mav - jure.mav@gmail.com
 * Contributor: Reed Dadoune - reed@dadoune.com
 */


;(function(undefined) {
	'use strict';

	if(typeof window === 'undefined') return; // don't run for server side render

	var
		count                 = 0,
		logEnabled            = false,
		hiddenCheckEnabled    = false,
		msgHeader             = 'message',
		msgHeaderLen          = msgHeader.length,
		msgId                 = '[iFrameSizer]', //Must match iframe msg ID
		msgIdLen              = msgId.length,
		pagePosition          = null,
		requestAnimationFrame = window.requestAnimationFrame,
		resetRequiredMethods  = {max:1,scroll:1,bodyScroll:1,documentElementScroll:1},
		settings              = {},
		timer                 = null,
		logId                 = 'Host Page',

		defaults              = {
			autoResize                : true,
			bodyBackground            : null,
			bodyMargin                : null,
			bodyMarginV1              : 8,
			bodyPadding               : null,
			checkOrigin               : true,
			inPageLinks               : false,
			enablePublicMethods       : true,
			heightCalculationMethod   : 'bodyOffset',
			id                        : 'iFrameResizer',
			interval                  : 32,
			log                       : false,
			maxHeight                 : Infinity,
			maxWidth                  : Infinity,
			minHeight                 : 0,
			minWidth                  : 0,
			resizeFrom                : 'parent',
			scrolling                 : false,
			sizeHeight                : true,
			sizeWidth                 : false,
			warningTimeout            : 5000,
			tolerance                 : 0,
			widthCalculationMethod    : 'scroll',
			closedCallback            : function(){},
			initCallback              : function(){},
			messageCallback           : function(){warn('MessageCallback function not defined');},
			resizedCallback           : function(){},
			scrollCallback            : function(){return true;}
		};

	function addEventListener(obj,evt,func){
		/* istanbul ignore else */ // Not testable in PhantonJS
		if ('addEventListener' in window){
			obj.addEventListener(evt,func, false);
		} else if ('attachEvent' in window){//IE
			obj.attachEvent('on'+evt,func);
		}
	}

	function removeEventListener(el,evt,func){
		/* istanbul ignore else */ // Not testable in phantonJS
		if ('removeEventListener' in window){
			el.removeEventListener(evt,func, false);
		} else if ('detachEvent' in window){ //IE
			el.detachEvent('on'+evt,func);
		}
	}

	function setupRequestAnimationFrame(){
		var
			vendors = ['moz', 'webkit', 'o', 'ms'],
			x;

		// Remove vendor prefixing if prefixed and break early if not
		for (x = 0; x < vendors.length && !requestAnimationFrame; x += 1) {
			requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
		}

		if (!(requestAnimationFrame)){
			log('setup','RequestAnimationFrame not supported');
		}
	}

	function getMyID(iframeId){
		var retStr = 'Host page: '+iframeId;

		if (window.top !== window.self){
			if (window.parentIFrame && window.parentIFrame.getId){
				retStr = window.parentIFrame.getId()+': '+iframeId;
			} else {
				retStr = 'Nested host page: '+iframeId;
			}
		}

		return retStr;
	}

	function formatLogHeader(iframeId){
		return msgId + '[' + getMyID(iframeId) + ']';
	}

	function isLogEnabled(iframeId){
		return settings[iframeId] ? settings[iframeId].log : logEnabled;
	}

	function log(iframeId,msg){
		output('log',iframeId,msg,isLogEnabled(iframeId));
	}

	function info(iframeId,msg){
		output('info',iframeId,msg,isLogEnabled(iframeId));
	}

	function warn(iframeId,msg){
		output('warn',iframeId,msg,true);
	}

	function output(type,iframeId,msg,enabled){
		if (true === enabled && 'object' === typeof window.console){
			console[type](formatLogHeader(iframeId),msg);
		}
	}

	function iFrameListener(event){
		function resizeIFrame(){
			function resize(){
				setSize(messageData);
				setPagePosition(iframeId);
				callback('resizedCallback',messageData);
			}

			ensureInRange('Height');
			ensureInRange('Width');

			syncResize(resize,messageData,'init');
		}

		function processMsg(){
			var data = msg.substr(msgIdLen).split(':');

			return {
				iframe: settings[data[0]] && settings[data[0]].iframe,
				id:     data[0],
				height: data[1],
				width:  data[2],
				type:   data[3]
			};
		}

		function ensureInRange(Dimension){
			var
				max  = Number(settings[iframeId]['max' + Dimension]),
				min  = Number(settings[iframeId]['min' + Dimension]),
				dimension = Dimension.toLowerCase(),
				size = Number(messageData[dimension]);

			log(iframeId,'Checking ' + dimension + ' is in range ' + min + '-' + max);

			if (size<min) {
				size=min;
				log(iframeId,'Set ' + dimension + ' to min value');
			}

			if (size>max) {
				size=max;
				log(iframeId,'Set ' + dimension + ' to max value');
			}

			messageData[dimension] = '' + size;
		}


		function isMessageFromIFrame(){
			function checkAllowedOrigin(){
				function checkList(){
					var
						i = 0,
						retCode = false;

					log(iframeId,'Checking connection is from allowed list of origins: ' + checkOrigin);

					for (; i < checkOrigin.length; i++) {
						if (checkOrigin[i] === origin) {
							retCode = true;
							break;
						}
					}
					return retCode;
				}

				function checkSingle(){
					var remoteHost  = settings[iframeId] && settings[iframeId].remoteHost;
					log(iframeId,'Checking connection is from: '+remoteHost);
					return origin === remoteHost;
				}

				return checkOrigin.constructor === Array ? checkList() : checkSingle();
			}

			var
				origin      = event.origin,
				checkOrigin = settings[iframeId] && settings[iframeId].checkOrigin;

			if (checkOrigin && (''+origin !== 'null') && !checkAllowedOrigin()) {
				throw new Error(
					'Unexpected message received from: ' + origin +
					' for ' + messageData.iframe.id +
					'. Message was: ' + event.data +
					'. This error can be disabled by setting the checkOrigin: false option or by providing of array of trusted domains.'
				);
			}

			return true;
		}

		function isMessageForUs(){
			return msgId === (('' + msg).substr(0,msgIdLen)) && (msg.substr(msgIdLen).split(':')[0] in settings); //''+Protects against non-string msg
		}

		function isMessageFromMetaParent(){
			//Test if this message is from a parent above us. This is an ugly test, however, updating
			//the message format would break backwards compatibity.
			var retCode = messageData.type in {'true':1,'false':1,'undefined':1};

			if (retCode){
				log(iframeId,'Ignoring init message from meta parent page');
			}

			return retCode;
		}

		function getMsgBody(offset){
			return msg.substr(msg.indexOf(':')+msgHeaderLen+offset);
		}

		function forwardMsgFromIFrame(msgBody){
			log(iframeId,'MessageCallback passed: {iframe: '+ messageData.iframe.id + ', message: ' + msgBody + '}');
			callback('messageCallback',{
				iframe: messageData.iframe,
				message: JSON.parse(msgBody)
			});
			log(iframeId,'--');
		}

		function getPageInfo(){
			var
				bodyPosition   = document.body.getBoundingClientRect(),
				iFramePosition = messageData.iframe.getBoundingClientRect();

			return JSON.stringify({
				iframeHeight: iFramePosition.height,
				iframeWidth:  iFramePosition.width,
				clientHeight: Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
				clientWidth:  Math.max(document.documentElement.clientWidth,  window.innerWidth  || 0),
				offsetTop:    parseInt(iFramePosition.top  - bodyPosition.top,  10),
				offsetLeft:   parseInt(iFramePosition.left - bodyPosition.left, 10),
				scrollTop:    window.pageYOffset,
				scrollLeft:   window.pageXOffset
			});
		}

		function sendPageInfoToIframe(iframe,iframeId){
			function debouncedTrigger(){
				trigger(
					'Send Page Info',
					'pageInfo:' + getPageInfo(),
					iframe,
					iframeId
				);
			}

			debouce(debouncedTrigger,32);
		}


		function startPageInfoMonitor(){
			function setListener(type,func){
				function sendPageInfo(){
					if (settings[id]){
						sendPageInfoToIframe(settings[id].iframe,id);
					} else {
						stop();
					}
				}

				['scroll','resize'].forEach(function(evt){
					log(id, type +  evt + ' listener for sendPageInfo');
					func(window,evt,sendPageInfo);
				});
			}

			function stop(){
				setListener('Remove ', removeEventListener);
			}

			function start(){
				setListener('Add ', addEventListener);
			}

			var id = iframeId; //Create locally scoped copy of iFrame ID

			start();

			if (settings[id]) {
				settings[id].stopPageInfo = stop;
			}
		}

		function stopPageInfoMonitor(){
			if (settings[iframeId] && settings[iframeId].stopPageInfo){
				settings[iframeId].stopPageInfo();
				delete settings[iframeId].stopPageInfo;
			}
		}

		function checkIFrameExists(){
			var retBool = true;

			if (null === messageData.iframe) {
				warn(iframeId,'IFrame ('+messageData.id+') not found');
				retBool = false;
			}
			return retBool;
		}

		function getElementPosition(target){
			var iFramePosition = target.getBoundingClientRect();

			getPagePosition(iframeId);

			return {
				x: Math.floor( Number(iFramePosition.left) + Number(pagePosition.x) ),
				y: Math.floor( Number(iFramePosition.top)  + Number(pagePosition.y) )
			};
		}

		function scrollRequestFromChild(addOffset){
			/* istanbul ignore next */  //Not testable in Karma
			function reposition(){
				pagePosition = newPosition;
				scrollTo();
				log(iframeId,'--');
			}

			function calcOffset(){
				return {
					x: Number(messageData.width) + offset.x,
					y: Number(messageData.height) + offset.y
				};
			}

			function scrollParent(){
				if (window.parentIFrame){
					window.parentIFrame['scrollTo'+(addOffset?'Offset':'')](newPosition.x,newPosition.y);
				} else {
					warn(iframeId,'Unable to scroll to requested position, window.parentIFrame not found');
				}
			}

			var
				offset = addOffset ? getElementPosition(messageData.iframe) : {x:0,y:0},
				newPosition = calcOffset();

			log(iframeId,'Reposition requested from iFrame (offset x:'+offset.x+' y:'+offset.y+')');

			if(window.top !== window.self){
				scrollParent();
			} else {
				reposition();
			}
		}

		function scrollTo(){
			if (false !== callback('scrollCallback',pagePosition)){
				setPagePosition(iframeId);
			} else {
				unsetPagePosition();
			}
		}

		function findTarget(location){
			function jumpToTarget(){
				var jumpPosition = getElementPosition(target);

				log(iframeId,'Moving to in page link (#'+hash+') at x: '+jumpPosition.x+' y: '+jumpPosition.y);
				pagePosition = {
					x: jumpPosition.x,
					y: jumpPosition.y
				};

				scrollTo();
				log(iframeId,'--');
			}

			function jumpToParent(){
				if (window.parentIFrame){
					window.parentIFrame.moveToAnchor(hash);
				} else {
					log(iframeId,'In page link #'+hash+' not found and window.parentIFrame not found');
				}
			}

			var
				hash     = location.split('#')[1] || '',
				hashData = decodeURIComponent(hash),
				target   = document.getElementById(hashData) || document.getElementsByName(hashData)[0];

			if (target){
				jumpToTarget();
			} else if(window.top!==window.self){
				jumpToParent();
			} else {
				log(iframeId,'In page link #'+hash+' not found');
			}
		}

		function callback(funcName,val){
			return chkCallback(iframeId,funcName,val);
		}

		function actionMsg(){

			if(settings[iframeId] && settings[iframeId].firstRun) firstRun();

			switch(messageData.type){
			case 'close':
				if(settings[iframeId].closeRequestCallback) chkCallback(iframeId, 'closeRequestCallback', settings[iframeId].iframe);
				else closeIFrame(messageData.iframe);
				break;
			case 'message':
				forwardMsgFromIFrame(getMsgBody(6));
				break;
			case 'scrollTo':
				scrollRequestFromChild(false);
				break;
			case 'scrollToOffset':
				scrollRequestFromChild(true);
				break;
			case 'pageInfo':
				sendPageInfoToIframe(settings[iframeId] && settings[iframeId].iframe,iframeId);
				startPageInfoMonitor();
				break;
			case 'pageInfoStop':
				stopPageInfoMonitor();
				break;
			case 'inPageLink':
				findTarget(getMsgBody(9));
				break;
			case 'reset':
				resetIFrame(messageData);
				break;
			case 'init':
				resizeIFrame();
				callback('initCallback',messageData.iframe);
				break;
			default:
				resizeIFrame();
			}
		}

		function hasSettings(iframeId){
			var retBool = true;

			if (!settings[iframeId]){
				retBool = false;
				warn(messageData.type + ' No settings for ' + iframeId + '. Message was: ' + msg);
			}

			return retBool;
		}

		function iFrameReadyMsgReceived(){
			for (var iframeId in settings){
				trigger('iFrame requested init',createOutgoingMsg(iframeId),document.getElementById(iframeId),iframeId);
			}
		}

		function firstRun() {
			if (settings[iframeId]) {
				settings[iframeId].firstRun = false;
			}
		}

		function clearWarningTimeout() {
			if (settings[iframeId]) {
				clearTimeout(settings[iframeId].msgTimeout);
				settings[iframeId].warningTimeout = 0;
			}
		}

		var
			msg = event.data,
			messageData = {},
			iframeId = null;

		if('[iFrameResizerChild]Ready' === msg){
			iFrameReadyMsgReceived();
		} else if (isMessageForUs()){
			messageData = processMsg();
			iframeId    = logId = messageData.id;
			if (settings[iframeId]) {
				settings[iframeId].loaded = true;
			}

			if (!isMessageFromMetaParent() && hasSettings(iframeId)){
				log(iframeId,'Received: '+msg);

				if ( checkIFrameExists() && isMessageFromIFrame() ){
					actionMsg();
				}
			}
		} else {
			info(iframeId,'Ignored: '+msg);
		}

	}


	function chkCallback(iframeId,funcName,val){
		var
			func = null,
			retVal = null;

		if(settings[iframeId]){
			func = settings[iframeId][funcName];

			if( 'function' === typeof func){
				retVal = func(val);
			} else {
				throw new TypeError(funcName+' on iFrame['+iframeId+'] is not a function');
			}
		}

		return retVal;
	}

	function closeIFrame(iframe){
		var iframeId = iframe.id;

		log(iframeId,'Removing iFrame: '+iframeId);
		if (iframe.parentNode) { iframe.parentNode.removeChild(iframe); }
		chkCallback(iframeId,'closedCallback',iframeId);
		log(iframeId,'--');
		delete settings[iframeId];
	}

	function getPagePosition(iframeId){
		if(null === pagePosition){
			pagePosition = {
				x: (window.pageXOffset !== undefined) ? window.pageXOffset : document.documentElement.scrollLeft,
				y: (window.pageYOffset !== undefined) ? window.pageYOffset : document.documentElement.scrollTop
			};
			log(iframeId,'Get page position: '+pagePosition.x+','+pagePosition.y);
		}
	}

	function setPagePosition(iframeId){
		if(null !== pagePosition){
			window.scrollTo(pagePosition.x,pagePosition.y);
			log(iframeId,'Set page position: '+pagePosition.x+','+pagePosition.y);
			unsetPagePosition();
		}
	}

	function unsetPagePosition(){
		pagePosition = null;
	}

	function resetIFrame(messageData){
		function reset(){
			setSize(messageData);
			trigger('reset','reset',messageData.iframe,messageData.id);
		}

		log(messageData.id,'Size reset requested by '+('init'===messageData.type?'host page':'iFrame'));
		getPagePosition(messageData.id);
		syncResize(reset,messageData,'reset');
	}

	function setSize(messageData){
		function setDimension(dimension){
			messageData.iframe.style[dimension] = messageData[dimension] + 'px';
			log(
				messageData.id,
				'IFrame (' + iframeId +
				') ' + dimension +
				' set to ' + messageData[dimension] + 'px'
			);
		}

		function chkZero(dimension){
			//FireFox sets dimension of hidden iFrames to zero.
			//So if we detect that set up an event to check for
			//when iFrame becomes visible.

			/* istanbul ignore next */  //Not testable in PhantomJS
			if (!hiddenCheckEnabled && '0' === messageData[dimension]){
				hiddenCheckEnabled = true;
				log(iframeId,'Hidden iFrame detected, creating visibility listener');
				fixHiddenIFrames();
			}
		}

		function processDimension(dimension){
			setDimension(dimension);
			chkZero(dimension);
		}

		var iframeId = messageData.iframe.id;

		if(settings[iframeId]){
			if( settings[iframeId].sizeHeight) { processDimension('height'); }
			if( settings[iframeId].sizeWidth ) { processDimension('width'); }
		}
	}

	function syncResize(func,messageData,doNotSync){
		/* istanbul ignore if */  //Not testable in PhantomJS
		if(doNotSync!==messageData.type && requestAnimationFrame){
			log(messageData.id,'Requesting animation frame');
			requestAnimationFrame(func);
		} else {
			func();
		}
	}

	function trigger(calleeMsg, msg, iframe, id, noResponseWarning) {
		function postMessageToIFrame(){
			var target = settings[id] && settings[id].targetOrigin;
			log(id,'[' + calleeMsg + '] Sending msg to iframe['+id+'] ('+msg+') targetOrigin: '+target);
			iframe.contentWindow.postMessage( msgId + msg, target );
		}

		function iFrameNotFound(){
			warn(id,'[' + calleeMsg + '] IFrame('+id+') not found');
		}

		function chkAndSend(){
			if(iframe && 'contentWindow' in iframe && (null !== iframe.contentWindow)){ //Null test for PhantomJS
				postMessageToIFrame();
			} else {
				iFrameNotFound();
			}
		}

		function warnOnNoResponse() {
			function warning() {
				if (settings[id] && !settings[id].loaded && !errorShown) {
					errorShown = true;
					warn(id, 'IFrame has not responded within '+ settings[id].warningTimeout/1000 +' seconds. Check iFrameResizer.contentWindow.js has been loaded in iFrame. This message can be ingored if everything is working, or you can set the warningTimeout option to a higher value or zero to suppress this warning.');
				}
			}

			if (!!noResponseWarning && settings[id] && !!settings[id].warningTimeout) {
				settings[id].msgTimeout = setTimeout(warning, settings[id].warningTimeout);
			}
		}

		var errorShown = false;

		id = id || iframe.id;

		if(settings[id]) {
			chkAndSend();
			warnOnNoResponse();
		}

	}

	function createOutgoingMsg(iframeId){
		return iframeId +
			':' + settings[iframeId].bodyMarginV1 +
			':' + settings[iframeId].sizeWidth +
			':' + settings[iframeId].log +
			':' + settings[iframeId].interval +
			':' + settings[iframeId].enablePublicMethods +
			':' + settings[iframeId].autoResize +
			':' + settings[iframeId].bodyMargin +
			':' + settings[iframeId].heightCalculationMethod +
			':' + settings[iframeId].bodyBackground +
			':' + settings[iframeId].bodyPadding +
			':' + settings[iframeId].tolerance +
			':' + settings[iframeId].inPageLinks +
			':' + settings[iframeId].resizeFrom +
			':' + settings[iframeId].widthCalculationMethod;
	}

	function setupIFrame(iframe,options){
		function setLimits(){
			function addStyle(style){
				if ((Infinity !== settings[iframeId][style]) && (0 !== settings[iframeId][style])){
					iframe.style[style] = settings[iframeId][style] + 'px';
					log(iframeId,'Set '+style+' = '+settings[iframeId][style]+'px');
				}
			}

			function chkMinMax(dimension){
				if (settings[iframeId]['min'+dimension]>settings[iframeId]['max'+dimension]){
					throw new Error('Value for min'+dimension+' can not be greater than max'+dimension);
				}
			}

			chkMinMax('Height');
			chkMinMax('Width');

			addStyle('maxHeight');
			addStyle('minHeight');
			addStyle('maxWidth');
			addStyle('minWidth');
		}

		function newId(){
			var id = ((options && options.id) || defaults.id + count++);
			if  (null !== document.getElementById(id)){
				id = id + count++;
			}
			return id;
		}

		function ensureHasId(iframeId){
			logId=iframeId;
			if (''===iframeId){
				iframe.id = iframeId =  newId();
				logEnabled = (options || {}).log;
				logId=iframeId;
				log(iframeId,'Added missing iframe ID: '+ iframeId +' (' + iframe.src + ')');
			}


			return iframeId;
		}

		function setScrolling(){
			log(iframeId,'IFrame scrolling ' + (settings[iframeId] && settings[iframeId].scrolling ? 'enabled' : 'disabled') + ' for ' + iframeId);
			iframe.style.overflow = false === (settings[iframeId] && settings[iframeId].scrolling) ? 'hidden' : 'auto';
			switch(settings[iframeId] && settings[iframeId].scrolling) {
				case true:
					iframe.scrolling = 'yes';
					break;
				case false:
					iframe.scrolling = 'no';
					break;
				default:
					iframe.scrolling = settings[iframeId] ? settings[iframeId].scrolling : 'no';
			}
		}

		//The V1 iFrame script expects an int, where as in V2 expects a CSS
		//string value such as '1px 3em', so if we have an int for V2, set V1=V2
		//and then convert V2 to a string PX value.
		function setupBodyMarginValues(){
			if (('number'===typeof(settings[iframeId] && settings[iframeId].bodyMargin)) || ('0'===(settings[iframeId] && settings[iframeId].bodyMargin))){
				settings[iframeId].bodyMarginV1 = settings[iframeId].bodyMargin;
				settings[iframeId].bodyMargin   = '' + settings[iframeId].bodyMargin + 'px';
			}
		}

		function checkReset(){
			// Reduce scope of firstRun to function, because IE8's JS execution
			// context stack is borked and this value gets externally
			// changed midway through running this function!!!
			var
				firstRun           = settings[iframeId] && settings[iframeId].firstRun,
				resetRequertMethod = settings[iframeId] && settings[iframeId].heightCalculationMethod in resetRequiredMethods;

			if (!firstRun && resetRequertMethod){
				resetIFrame({iframe:iframe, height:0, width:0, type:'init'});
			}
		}

		function setupIFrameObject(){
			if(Function.prototype.bind && settings[iframeId]){ //Ignore unpolyfilled IE8.
				settings[iframeId].iframe.iFrameResizer = {

					close        : closeIFrame.bind(null,settings[iframeId].iframe),

					resize       : trigger.bind(null,'Window resize', 'resize', settings[iframeId].iframe),

					moveToAnchor : function(anchor){
						trigger('Move to anchor','moveToAnchor:'+anchor, settings[iframeId].iframe,iframeId);
					},

					sendMessage  : function(message){
						message = JSON.stringify(message);
						trigger('Send Message','message:'+message, settings[iframeId].iframe, iframeId);
					}
				};
			}
		}

		//We have to call trigger twice, as we can not be sure if all
		//iframes have completed loading when this code runs. The
		//event listener also catches the page changing in the iFrame.
		function init(msg){
			function iFrameLoaded(){
				trigger('iFrame.onload', msg, iframe, undefined , true);
				checkReset();
			}

			addEventListener(iframe,'load',iFrameLoaded);
			trigger('init', msg, iframe, undefined, true);
		}

		function checkOptions(options){
			if ('object' !== typeof options){
				throw new TypeError('Options is not an object');
			}
		}

		function copyOptions(options){
			for (var option in defaults) {
				if (defaults.hasOwnProperty(option)){
					settings[iframeId][option] = options.hasOwnProperty(option) ? options[option] : defaults[option];
				}
			}
		}

		function getTargetOrigin (remoteHost){
			return ('' === remoteHost || 'file://' === remoteHost) ? '*' : remoteHost;
		}

		function processOptions(options){
			options = options || {};
			settings[iframeId] = {
				firstRun	: true,
				iframe		: iframe,
				remoteHost	: iframe.src.split('/').slice(0,3).join('/')
			};

			checkOptions(options);
			copyOptions(options);

			if (settings[iframeId]) {
				settings[iframeId].targetOrigin = true === settings[iframeId].checkOrigin ? getTargetOrigin(settings[iframeId].remoteHost) : '*';
			}
		}

		function beenHere(){
			return (iframeId in settings && 'iFrameResizer' in iframe);
		}

		var iframeId = ensureHasId(iframe.id);

		if (!beenHere()){
			processOptions(options);
			setScrolling();
			setLimits();
			setupBodyMarginValues();
			init(createOutgoingMsg(iframeId));
			setupIFrameObject();
		} else {
			warn(iframeId,'Ignored iFrame, already setup.');
		}
	}

	function debouce(fn,time){
		if (null === timer){
			timer = setTimeout(function(){
				timer = null;
				fn();
			}, time);
		}
	}

	/* istanbul ignore next */  //Not testable in PhantomJS
	function fixHiddenIFrames(){
		function checkIFrames(){
			function checkIFrame(settingId){
				function chkDimension(dimension){
					return '0px' === (settings[settingId] && settings[settingId].iframe.style[dimension]);
				}

				function isVisible(el) {
					return (null !== el.offsetParent);
				}

				if (settings[settingId] && isVisible(settings[settingId].iframe) && (chkDimension('height') || chkDimension('width'))){
					trigger('Visibility change', 'resize', settings[settingId].iframe, settingId);
				}
			}

			for (var settingId in settings){
				checkIFrame(settingId);
			}
		}

		function mutationObserved(mutations){
			log('window','Mutation observed: ' + mutations[0].target + ' ' + mutations[0].type);
			debouce(checkIFrames,16);
		}

		function createMutationObserver(){
			var
				target = document.querySelector('body'),

				config = {
					attributes            : true,
					attributeOldValue     : false,
					characterData         : true,
					characterDataOldValue : false,
					childList             : true,
					subtree               : true
				},

				observer = new MutationObserver(mutationObserved);

			observer.observe(target, config);
		}

		var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

		if (MutationObserver) createMutationObserver();
	}


	function resizeIFrames(event){
		function resize(){
			sendTriggerMsg('Window '+event,'resize');
		}

		log('window','Trigger event: '+event);
		debouce(resize,16);
	}

	/* istanbul ignore next */  //Not testable in PhantomJS
	function tabVisible() {
		function resize(){
			sendTriggerMsg('Tab Visable','resize');
		}

		if('hidden' !== document.visibilityState) {
			log('document','Trigger event: Visiblity change');
			debouce(resize,16);
		}
	}

	function sendTriggerMsg(eventName,event){
		function isIFrameResizeEnabled(iframeId) {
			return	settings[iframeId] &&
					'parent' === settings[iframeId].resizeFrom &&
					settings[iframeId].autoResize &&
					!settings[iframeId].firstRun;
		}

		for (var iframeId in settings){
			if(isIFrameResizeEnabled(iframeId)){
				trigger(eventName, event, document.getElementById(iframeId), iframeId);
			}
		}
	}

	function setupEventListeners(){
		addEventListener(window,'message',iFrameListener);

		addEventListener(window,'resize', function(){resizeIFrames('resize');});

		addEventListener(document,'visibilitychange',tabVisible);
		addEventListener(document,'-webkit-visibilitychange',tabVisible); //Andriod 4.4
		addEventListener(window,'focusin',function(){resizeIFrames('focus');}); //IE8-9
		addEventListener(window,'focus',function(){resizeIFrames('focus');});
	}


	function factory(){
		function init(options,element){
			function chkType(){
				if(!element.tagName) {
					throw new TypeError('Object is not a valid DOM element');
				} else if ('IFRAME' !== element.tagName.toUpperCase()) {
					throw new TypeError('Expected <IFRAME> tag, found <'+element.tagName+'>');
				}
			}

			if(element) {
				chkType();
				setupIFrame(element, options);
				iFrames.push(element);
			}
		}

		function warnDeprecatedOptions(options) {
			if (options && options.enablePublicMethods) {
				warn('enablePublicMethods option has been removed, public methods are now always available in the iFrame');
			}
		}

		var iFrames;

		setupRequestAnimationFrame();
		setupEventListeners();

		return function iFrameResizeF(options,target){
			iFrames = []; //Only return iFrames past in on this call

			warnDeprecatedOptions(options);

			switch (typeof(target)){
			case 'undefined':
			case 'string':
				Array.prototype.forEach.call(
					document.querySelectorAll( target || 'iframe' ),
					init.bind(undefined, options)
				);
				break;
			case 'object':
				init(options,target);
				break;
			default:
				throw new TypeError('Unexpected data type ('+typeof(target)+')');
			}

			return iFrames;
		};
	}

	function createJQueryPublicMethod($){
		if (!$.fn) {
			info('','Unable to bind to jQuery, it is not fully loaded.');
		} else if (!$.fn.iFrameResize){
			$.fn.iFrameResize = function $iFrameResizeF(options) {
				function init(index, element) {
					setupIFrame(element, options);
				}

				return this.filter('iframe').each(init).end();
			};
		}
	}

	if (window.jQuery) { createJQueryPublicMethod(window.jQuery); }

	if (true) {
		!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	} else {}

})();


/***/ }),

/***/ 457:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

exports.iframeResizer = __webpack_require__(28);
exports.iframeResizerContentWindow = __webpack_require__(402);


/***/ }),

/***/ 218:
/***/ ((module) => {

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

module.exports = isObject;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(669);
/******/ 	exports.AddonContainer = __webpack_exports__;
/******/ 	
/******/ })()
;