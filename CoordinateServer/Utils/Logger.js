"use strict";
var Logger = (function () {
    function Logger() {
    }
    Logger.log = function (msg) {
        console.log("[" + new Date().toLocaleString('us') + "] " + msg);
    };
    Logger.error = function (msg) {
        console.error("[" + new Date().toLocaleString('us') + "] " + msg);
    };
    return Logger;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Logger;
