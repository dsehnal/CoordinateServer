﻿import * as Queries from './Queries'

import Logger from '../Utils/Logger'

import * as Core from 'LiteMol-core'
import { CoordinateServerConfig, CoordinateServer } from './CoordinateServer'

import CifWriter from '../Writers/CifWriter'
import * as WriterContext from '../Writers/Context'

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
    
    let description = query.description;
    let commonParams = Queries.filterCommonQueryParams(parameters);
    let writer = WriterContext.createWriter(parameters.encoding, molecule.molecule.id);
            
    let queryParams: any,
        modelTransform = description.modelTransform ? description.modelTransform : (p: any, m: any) => m;

    try {
        queryParams = Queries.filterQueryParams(parameters, description)
    } catch (e) {
        Logger.error(`${reqId}: Query params error: ${e}`);


        let stream = outputStreamProvider();
        WriterContext.writeError(stream, commonParams.encoding, molecule.molecule.id, '' + e, { queryType: query.name });        
        stream.end();
        return;
    }
    
    let serverConfig: CoordinateServerConfig = {
        params: { common: Queries.filterCommonQueryParams(parameters), query: queryParams },
        includedCategories: description.includedCategories ? description.includedCategories : Queries.DefaultCategories,
        writer
    }

    Logger.log(`${reqId}: Query params ${JSON.stringify(queryParams)}`);
    
    CoordinateServer.process(
        reqId,
        molecule,

        query,
        serverConfig.params,

        WriterContext.getFormatter(commonParams.format),

        serverConfig,

        result => {
            let stream = outputStreamProvider();
            
            if (result.error) {

                Logger.error(`${reqId}: Failed. (${result.error})`);
                WriterContext.writeError(stream, serverConfig.params.common.encoding, molecule.molecule.id, result.error, { params: serverConfig.params, queryType: query.name });                
                stream.end();
                return;
            } else {
                let stats = WriterContext.createStatsCategory(moleculeWrapper, result.timeQuery, result.timeFormat);
                writer.writeCategory(stats);
                writer.serialize(stream);
                stream.end();
            }

            let totalTime = moleculeWrapper.ioTime + moleculeWrapper.parseTime + result.timeFormat + result.timeQuery;

            let cached = moleculeWrapper.source === Provider.MoleculeSource.Cache ? 'cached; ' : '';
            Logger.log(`${reqId}: Done in ${Perf.format(totalTime)} (${cached}io ${Perf.format(moleculeWrapper.ioTime)}, parse ${Perf.format(moleculeWrapper.parseTime)}, query ${Perf.format(result.timeQuery)}, format ${Perf.format(result.timeFormat)})`);
        });
}