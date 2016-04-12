"use strict";
var ServerConfig;
(function (ServerConfig) {
    ServerConfig.defaultPort = 1337;
    // enable/disable multicore support using cluster library
    ServerConfig.useCluster = false;
    //export var appPrefix = '/CoordinateServer';
    //export function mapPdbIdToFilename(id: string) {
    //    return `E:/databases/PDB/updated/${id}.cif`;
    //}
    ServerConfig.appPrefix = '/CoordinateServer';
    function mapPdbIdToFilename(id) {
        return "c:/test/quick/" + id + "_updated.cif";
    }
    ServerConfig.mapPdbIdToFilename = mapPdbIdToFilename;
})(ServerConfig || (ServerConfig = {}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ServerConfig;
