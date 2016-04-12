namespace ServerConfig {
    
    export var defaultPort = 1337;

    // enable/disable multicore support using cluster library
    export var useCluster = false;

    //export var appPrefix = '/CoordinateServer';
    //export function mapPdbIdToFilename(id: string) {
    //    return `E:/databases/PDB/updated/${id}.cif`;
    //}

    export var appPrefix = '/CoordinateServer';
    export function mapPdbIdToFilename(id: string) {
        return `c:/test/quick/${id}_updated.cif`;
    }
}

export default ServerConfig;