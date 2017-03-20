/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Logger = (function () {
    function Logger() {
    }
    Logger.getDateString = function () {
        return new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    };
    Logger.log = function (msg) {
        console.log("[" + Logger.getDateString() + "] " + msg);
    };
    Logger.error = function (msg) {
        console.error("[" + Logger.getDateString() + "] " + msg);
    };
    return Logger;
}());
exports.default = Logger;
