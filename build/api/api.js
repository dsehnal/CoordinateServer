/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Queries = require("./queries");
var logger_1 = require("../utils/logger");
var Core = require("../lib/LiteMol-core");
var coordinate_server_1 = require("./coordinate-server");
var WriterContext = require("../writers/context");
var Provider = require("../data/provider");
var Perf = Core.Utils.PerformanceMonitor;
var querySerial = 0;
function wrapOutputStream(outputStreamProvider) {
    var stream;
    return function () {
        if (!stream) {
            stream = outputStreamProvider();
        }
        return stream;
    };
}
function executeQuery(moleculeWrapper, query, parameters, outputStreamProvider, onDone) {
    querySerial++;
    var molecule = moleculeWrapper.molecule;
    var reqId = "'" + querySerial + ":" + molecule.molecule.id + "/" + query.name + "'";
    logger_1.default.log(reqId + ": Processing.");
    var description = query.description;
    var commonParams = Queries.filterCommonQueryParams(parameters);
    var writer = WriterContext.createWriter(parameters.encoding, molecule.molecule.id);
    var queryParams;
    try {
        queryParams = Queries.filterQueryParams(parameters, description);
    }
    catch (e) {
        logger_1.default.error(reqId + ": Query params error: " + e);
        var stream = outputStreamProvider();
        WriterContext.writeError(WriterContext.wrapStream(stream), commonParams.encoding, molecule.molecule.id, '' + e, { queryType: query.name });
        stream.end();
        if (onDone)
            onDone();
        return;
    }
    var serverConfig = {
        params: { common: Queries.filterCommonQueryParams(parameters), query: queryParams },
        includedCategories: description.includedCategories ? description.includedCategories : Queries.DefaultCategories,
        writer: writer
    };
    logger_1.default.log(reqId + ": Query params " + JSON.stringify(queryParams));
    var wrappedOutput = wrapOutputStream(outputStreamProvider);
    coordinate_server_1.processQuery(reqId, molecule, query, serverConfig.params, WriterContext.getFormatter(commonParams.format), serverConfig, function (result) {
        var stream = wrappedOutput();
        var encodeTime = 0;
        if (result.error) {
            logger_1.default.error(reqId + ": Failed. (" + result.error + ")");
            WriterContext.writeError(WriterContext.wrapStream(stream), serverConfig.params.common.encoding, molecule.molecule.id, result.error, { params: serverConfig.params, queryType: query.name });
            stream.end();
            if (onDone)
                onDone();
            return;
        }
        else {
            var perf = new Core.Utils.PerformanceMonitor();
            perf.start('encode');
            try {
                var stats = WriterContext.createStatsCategory(moleculeWrapper, result.timeQuery, result.timeFormat);
                writer.writeCategory(stats);
                writer.encode();
            }
            catch (e) {
                logger_1.default.error(reqId + ": Failed (Encode). (" + e + ")");
                //WriterContext.writeError(stream, serverConfig.params.common.encoding, molecule.molecule.id, `Encoding error: ${e}`, { params: serverConfig.params, queryType: query.name });                
                stream.end();
                if (onDone)
                    onDone();
                return;
            }
            perf.end('encode');
            encodeTime = perf.time('encode');
            try {
                writer.flush(WriterContext.wrapStream(stream));
            }
            catch (e) {
                logger_1.default.error(reqId + ": Failed (Flush). (" + e + ")");
            }
            finally {
                stream.end();
            }
        }
        var totalTime = moleculeWrapper.ioTime + moleculeWrapper.parseTime + result.timeFormat + result.timeQuery + encodeTime;
        var cached = moleculeWrapper.source === Provider.MoleculeSource.Cache ? 'cached; ' : '';
        logger_1.default.log(reqId + ": Done in " + Perf.format(totalTime) + " (" + cached + "io " + Perf.format(moleculeWrapper.ioTime) + ", parse " + Perf.format(moleculeWrapper.parseTime) + ", query " + Perf.format(result.timeQuery) + ", format " + Perf.format(result.timeFormat) + ", encode " + Perf.format(encodeTime) + ")");
        if (onDone)
            onDone();
    });
}
exports.executeQuery = executeQuery;
