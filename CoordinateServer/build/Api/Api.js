"use strict";
var Queries = require('./Queries');
var Logger_1 = require('../Utils/Logger');
var Core = require('LiteMol-core');
var CoordinateServer_1 = require('./CoordinateServer');
var WriterContext = require('../Writers/Context');
var Provider = require('../Data/Provider');
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
    Logger_1.default.log(reqId + ": Processing.");
    var description = query.description;
    var commonParams = Queries.filterCommonQueryParams(parameters);
    var writer = WriterContext.createWriter(parameters.encoding, molecule.molecule.id);
    var queryParams, modelTransform = description.modelTransform ? description.modelTransform : function (p, m) { return m; };
    try {
        queryParams = Queries.filterQueryParams(parameters, description);
    }
    catch (e) {
        Logger_1.default.error(reqId + ": Query params error: " + e);
        var stream = outputStreamProvider();
        WriterContext.writeError(stream, commonParams.encoding, molecule.molecule.id, '' + e, { queryType: query.name });
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
    Logger_1.default.log(reqId + ": Query params " + JSON.stringify(queryParams));
    var wrappedOutput = wrapOutputStream(outputStreamProvider);
    CoordinateServer_1.processQuery(reqId, molecule, query, serverConfig.params, WriterContext.getFormatter(commonParams.format), serverConfig, function (result) {
        var stream = wrappedOutput();
        var encodeTime = 0;
        if (result.error) {
            Logger_1.default.error(reqId + ": Failed. (" + result.error + ")");
            WriterContext.writeError(stream, serverConfig.params.common.encoding, molecule.molecule.id, result.error, { params: serverConfig.params, queryType: query.name });
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
                Logger_1.default.error(reqId + ": Failed (Encode). (" + e + ")");
                //WriterContext.writeError(stream, serverConfig.params.common.encoding, molecule.molecule.id, `Encoding error: ${e}`, { params: serverConfig.params, queryType: query.name });                
                stream.end();
                if (onDone)
                    onDone();
                return;
            }
            perf.end('encode');
            encodeTime = perf.time('encode');
            try {
                writer.flush(stream);
            }
            catch (e) {
                Logger_1.default.error(reqId + ": Failed (Flush). (" + e + ")");
            }
            finally {
                stream.end();
            }
        }
        var totalTime = moleculeWrapper.ioTime + moleculeWrapper.parseTime + result.timeFormat + result.timeQuery + encodeTime;
        var cached = moleculeWrapper.source === Provider.MoleculeSource.Cache ? 'cached; ' : '';
        Logger_1.default.log(reqId + ": Done in " + Perf.format(totalTime) + " (" + cached + "io " + Perf.format(moleculeWrapper.ioTime) + ", parse " + Perf.format(moleculeWrapper.parseTime) + ", query " + Perf.format(result.timeQuery) + ", format " + Perf.format(result.timeFormat) + ", encode " + Perf.format(encodeTime) + ")");
        if (onDone)
            onDone();
    });
}
exports.executeQuery = executeQuery;
