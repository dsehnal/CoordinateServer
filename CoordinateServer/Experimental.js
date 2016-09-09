"use strict";
var ServerConfig_1 = require('./ServerConfig');
var ExperimentalApi = (function () {
    function ExperimentalApi(app) {
        this.app = app;
    }
    ExperimentalApi.makePath = function (p) {
        return ServerConfig_1.default.appPrefix + '/' + p;
    };
    ExperimentalApi.prototype.init = function () {
    };
    return ExperimentalApi;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ExperimentalApi;
