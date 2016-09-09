import * as Queries from './Queries'

import Logger from '../Utils/Logger'

import * as Core from 'LiteMol-core'
import { CoordinateServerConfig, CoordinateServer } from './CoordinateServer'

import * as CifWriters from '../Writers/CifWriter'
import CifStringWriter from '../Writers/CifStringWriter'

import * as Provider from '../Data/Provider'

import ApiVersion from './Version'

import Perf = Core.Utils.PerformanceMonitor;

let querySerial = 0;

export function executeQuery(
    moleculeWrapper: Provider.MoleculeWrapper,
    query: Queries.ApiQuery,
    parameters: { [name: string]: string } & Queries.CommonQueryParams,
    outputStreamProvider: () => { write: (data: string) => boolean, end: (data?: string) => void }) {

    querySerial++;

    let molecule = moleculeWrapper.molecule;
    let reqId = `'${querySerial}:${molecule.molecule.id}/${query.name}'`;
    Logger.log(`${reqId}: Processing.`);

    let serverConfig = new CoordinateServerConfig();

    let description = query.description;

    let commonParams = Queries.filterCommonQueryParams(parameters);

    //    {
    //    atomSitesOnly: !!parameters.atomSitesOnly,
    //    modelId: parameters.modelId,
    //    format: parameters.format
    //};

    serverConfig.commonParams = commonParams;
    serverConfig.includedCategories = description.includedCategories ? description.includedCategories : Queries.DefaultCategories;
    serverConfig.writer = description.writer ? description.writer : new CifWriters.DefaultCifWriter();
    serverConfig.useFCif = (parameters['format'] || '').toLowerCase() === 'fcif';
    
    let params: any,
        modelTransform = description.modelTransform ? description.modelTransform : (p: any, m: any) => m;

    try {
        params = Queries.filterQueryParams(parameters, description)
    } catch (e) {

        Logger.error(`${reqId}: Query params error: ${e}`);

        let wcfg = new CifWriters.CifWriterConfig();
        wcfg.commonParams = commonParams;
        wcfg.type = query.name;        
        let msg = serverConfig.writer.writeError(molecule.molecule.id, '' + e, wcfg);

        let stream = outputStreamProvider();
        stream.end(msg);
        return;
    }

    Logger.log(`${reqId}: Query params ${JSON.stringify(params)}`);
    
    CoordinateServer.process(
        reqId,
        molecule,

        query,
        params,

        serverConfig,

        result => {
            let stream = outputStreamProvider();

            let writeTime = Perf.currentTime();

            if (result.error) {

                Logger.error(`${reqId}: Failed. (${result.error})`);
                stream.end(result.errorCif);
                return;
            } else {
                result.data.writeTo(stream);
            }

            writeTime = Perf.currentTime() - writeTime;
            stream.end(getStatsCif(moleculeWrapper, result.timeQuery, result.timeSerialize, writeTime));

            let totalTime = moleculeWrapper.ioTime + moleculeWrapper.parseTime + result.timeSerialize + result.timeQuery + writeTime;

            let cached = moleculeWrapper.source === Provider.MoleculeSource.Cache ? 'cached; ' : '';
            Logger.log(`${reqId}: Done in ${Perf.format(totalTime)} (${cached}io ${Perf.format(moleculeWrapper.ioTime)}, parse ${Perf.format(moleculeWrapper.parseTime)}, query ${Perf.format(result.timeQuery)}, serialize ${Perf.format(result.timeSerialize)}, write ${Perf.format(writeTime)})`);
        });
}

function getStatsCif(molecule: Provider.MoleculeWrapper,
    queryTime: number, serializeTime: number, writeTime: number) {

    let writer = new CifStringWriter();

    writer.write(`_coordinate_server_stats.molecule_cached     ${molecule.source === Provider.MoleculeSource.Cache ? 'yes' : 'no'}`); writer.newline();
    writer.write(`_coordinate_server_stats.io_time_ms          ${molecule.ioTime | 0}`); writer.newline();
    writer.write(`_coordinate_server_stats.parse_time_ms       ${molecule.parseTime | 0}`); writer.newline();
    writer.write(`_coordinate_server_stats.query_time_ms       ${queryTime | 0}`); writer.newline();
    writer.write(`_coordinate_server_stats.serialize_time_ms   ${serializeTime | 0}`); writer.newline();
    writer.write(`_coordinate_server_stats.write_time_ms       ${writeTime | 0}`); writer.newline();
    writer.write(`#\n`);

    return writer.writer.asString();
}
