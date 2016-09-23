"use strict";
var config = {
    cacheParams: {
        useCache: true,
        maxApproximateSizeInBytes: 2 * 1014 * 1024 * 1024,
        entryTimeoutInMs: 10 * 60 * 1000 // 10 minutes
    },
    shutdownParams: {
        // 0 for off, server will shut down after this amount of minutes.
        timeoutMinutes: 24 * 60 /* a day */,
        // modifies the shutdown timer by +/- timeoutVarianceMinutes (to avoid multiple instances shutting at the same time)
        timeoutVarianceMinutes: 60
    },
    defaultPort: 1337,
    // enable/disable multicore support using cluster library
    useCluster: false,
    appPrefix: '/CoordinateServer',
    mapPdbIdToFilename: function (id) {
        return "E:/databases/PDB/updated/" + id + ".cif";
        //return `e:/test/quick/${id}_updated.cif`;
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = config;
