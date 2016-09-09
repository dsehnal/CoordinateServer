const config = {

    cacheParams: {
        useCache: true,
        maxApproximateSizeInBytes: 2 * 1014 * 1024 * 1024, // 2 GB
        entryTimeoutInMs: 10 * 60 * 1000 // 10 minutes
    },
    defaultPort: 1337,

    // enable/disable multicore support using cluster library
    useCluster: false,

    appPrefix: '/CoordinateServer',

    //mapPdbIdToFilename(id: string) {
    //    return `E:/databases/PDB/updated/${id}.cif`;
    //}

    mapPdbIdToFilename(id: string) {
        return `e:/test/quick/${id}_updated.cif`;
    }
};

export default config;