"use strict";
var config = {
    cacheParams: {
        useCache: true,
        maxApproximateSizeInBytes: 2 * 1014 * 1024 * 1024,
        entryTimeoutInMs: 10 * 60 * 1000 // 10 minutes
    },
    defaultPort: 1337,
    // enable/disable multicore support using cluster library
    useCluster: false,
    appPrefix: '/CoordinateServer',
    mapPdbIdToFilename: function (id) {
        return "E:/databases/PDB/updated/" + id + ".cif";
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = config;
