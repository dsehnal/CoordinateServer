"use strict";
var ServerConfig;
(function (ServerConfig) {
    ServerConfig.defaultPort = 1337;
    // enable/disable multicore support using cluster library
    ServerConfig.useCluster = false;
    ServerConfig.appPrefix = '/CoordinateServer';
    function mapPdbIdToFilename(id) {
        return "E:/databases/PDB/updated/" + id + ".cif";
    }
    ServerConfig.mapPdbIdToFilename = mapPdbIdToFilename;
})(ServerConfig || (ServerConfig = {}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ServerConfig;
