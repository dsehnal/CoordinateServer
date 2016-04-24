"use strict";
var Logger = (function () {
    function Logger() {
    }
    Logger.log = function (msg) {
        console.log("[" + new Date().toLocaleString('en-US') + "] " + msg);
    };
    Logger.error = function (msg) {
        console.error("[" + new Date().toLocaleString('en-US') + "] " + msg);
    };
    return Logger;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Logger;
