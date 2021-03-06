﻿/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

import * as Queries from './queries'
import Logger from '../utils/logger'
import * as Core from '../lib/LiteMol-core'
import { CoordinateServerConfig, processQuery } from './coordinate-server'
import * as WriterContext from '../writers/context'
import * as Provider from '../data/provider'

import Perf = Core.Utils.PerformanceMonitor;

let querySerial = 0;

function wrapOutputStream(outputStreamProvider: () => { write: (data: string) => boolean, end: (data?: string) => void }): () => { write: (data: string) => boolean, end: (data?: string) => void } {

    let stream: any;
    return () => {
        if (!stream) {
            stream = outputStreamProvider();
        }
        return stream;
    };
}

export function executeQuery(
    moleculeWrapper: Provider.MoleculeWrapper,
    query: Queries.ApiQuery,
    parameters: { [name: string]: string } & Queries.CommonQueryParams,
    outputStreamProvider: () => { write: (data: string) => boolean, end: (data?: string) => void },
    onDone?: () => void) {

    querySerial++;

    let molecule = moleculeWrapper.molecule;
    let reqId = `'${querySerial}:${molecule.molecule.id}/${query.name}'`;
    Logger.log(`${reqId}: Processing.`);
    
    let description = query.description;
    let commonParams = Queries.filterCommonQueryParams(parameters);
    let writer = WriterContext.createWriter(parameters.encoding, molecule.molecule.id);
            
    let queryParams: any;

    try {
        queryParams = Queries.filterQueryParams(parameters, description)
    } catch (e) {
        Logger.error(`${reqId}: Query params error: ${e}`);


        let stream = outputStreamProvider();
        WriterContext.writeError(WriterContext.wrapStream(stream), commonParams.encoding, molecule.molecule.id, '' + e, { queryType: query.name });        
        stream.end();
        if (onDone) onDone();
        return;
    }
    
    let serverConfig: CoordinateServerConfig = {
        params: { common: Queries.filterCommonQueryParams(parameters), query: queryParams },
        includedCategories: description.includedCategories ? description.includedCategories : Queries.DefaultCategories,
        writer
    }

    Logger.log(`${reqId}: Query params ${JSON.stringify(queryParams)}`);

    let wrappedOutput = wrapOutputStream(outputStreamProvider);

    processQuery(
        reqId,
        molecule,

        query,
        serverConfig.params,

        WriterContext.getFormatter(commonParams.format),

        serverConfig,

        result => {
            let stream = wrappedOutput();            

            let encodeTime = 0;
            if (result.error) {
                Logger.error(`${reqId}: Failed. (${result.error})`);
                WriterContext.writeError(WriterContext.wrapStream(stream), serverConfig.params.common.encoding, molecule.molecule.id, result.error, { params: serverConfig.params, queryType: query.name });                
                stream.end();
                if (onDone) onDone();
                return;
            } else {

                let perf = new Core.Utils.PerformanceMonitor();

                perf.start('encode');
                try {
                    let stats = WriterContext.createStatsCategory(moleculeWrapper, result.timeQuery!, result.timeFormat!);
                    writer.writeCategory(stats);
                    writer.encode();
                } catch (e) {
                    Logger.error(`${reqId}: Failed (Encode). (${e})`);
                    //WriterContext.writeError(stream, serverConfig.params.common.encoding, molecule.molecule.id, `Encoding error: ${e}`, { params: serverConfig.params, queryType: query.name });                
                    stream.end();
                    if (onDone) onDone();
                    return;
                }
                perf.end('encode');
                encodeTime = perf.time('encode');

                try {
                    writer.flush(WriterContext.wrapStream(stream));
                } catch (e) {
                    Logger.error(`${reqId}: Failed (Flush). (${e})`);
                } finally {
                    stream.end();
                }
            }

            let totalTime = moleculeWrapper.ioTime + moleculeWrapper.parseTime + result.timeFormat! + result.timeQuery! + encodeTime;

            let cached = moleculeWrapper.source === Provider.MoleculeSource.Cache ? 'cached; ' : '';
            Logger.log(`${reqId}: Done in ${Perf.format(totalTime)} (${cached}io ${Perf.format(moleculeWrapper.ioTime)}, parse ${Perf.format(moleculeWrapper.parseTime)}, query ${Perf.format(result.timeQuery!)}, format ${Perf.format(result.timeFormat!)}, encode ${Perf.format(encodeTime)})`);
            
            if (onDone) onDone();
        });
}