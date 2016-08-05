"use strict";
var Queries = require('./Queries');
var Logger_1 = require('../Utils/Logger');
var Core = require('LiteMol-core');
var CoordinateServer_1 = require('./CoordinateServer');
var CifWriters = require('../Writers/CifWriter');
var CifStringWriter_1 = require('../Writers/CifStringWriter');
var Provider = require('../Data/Provider');
var Perf = Core.Utils.PerformanceMonitor;
var querySerial = 0;
function executeQuery(moleculeWrapper, query, parameters, outputStreamProvider) {
    querySerial++;
    var molecule = moleculeWrapper.molecule;
    var reqId = "'" + querySerial + ":" + molecule.molecule.id + "/" + query.name + "'";
    Logger_1.default.log(reqId + ": Processing.");
    var serverConfig = new CoordinateServer_1.CoordinateServerConfig();
    var description = query.description;
    var commonParams = {
        atomSitesOnly: !!parameters.atomSitesOnly,
        modelId: parameters.modelId
    };
    serverConfig.commonParams = commonParams;
    serverConfig.includedCategories = description.includedCategories ? description.includedCategories : Queries.DefaultCategories;
    serverConfig.writer = description.writer ? description.writer : new CifWriters.DefaultCifWriter();
    serverConfig.useFCif = (parameters['format'] || '').toLowerCase() === 'fcif';
    var params, modelTransform = description.modelTransform ? description.modelTransform : function (p, m) { return m; };
    try {
        params = Queries.filterQueryParams(parameters, description);
    }
    catch (e) {
        Logger_1.default.error(reqId + ": Query params error: " + e);
        var wcfg = new CifWriters.CifWriterConfig();
        wcfg.commonParams = commonParams;
        wcfg.type = query.name;
        var msg = serverConfig.writer.writeError(molecule.molecule.id, '' + e, wcfg);
        var stream = outputStreamProvider();
        stream.end(msg);
        return;
    }
    Logger_1.default.log(reqId + ": Query params " + JSON.stringify(params));
    CoordinateServer_1.CoordinateServer.process(reqId, molecule, query, params, serverConfig, function (result) {
        var stream = outputStreamProvider();
        var writeTime = Perf.currentTime();
        if (result.error) {
            Logger_1.default.error(reqId + ": Failed. (" + result.error + ")");
            stream.end(result.errorCif);
            return;
        }
        else {
            result.data.writeTo(stream);
        }
        writeTime = Perf.currentTime() - writeTime;
        stream.end(getStatsCif(moleculeWrapper, result.timeQuery, result.timeSerialize, writeTime));
        var totalTime = moleculeWrapper.ioTime + moleculeWrapper.parseTime + result.timeSerialize + result.timeQuery + writeTime;
        var cached = moleculeWrapper.source === Provider.MoleculeSource.Cache ? 'cached; ' : '';
        Logger_1.default.log(reqId + ": Done in " + Perf.format(totalTime) + " (" + cached + "io " + Perf.format(moleculeWrapper.ioTime) + ", parse " + Perf.format(moleculeWrapper.parseTime) + ", query " + Perf.format(result.timeQuery) + ", serialize " + Perf.format(result.timeSerialize) + ", write " + Perf.format(writeTime) + ")");
    });
}
exports.executeQuery = executeQuery;
function getStatsCif(molecule, queryTime, serializeTime, writeTime) {
    var writer = new CifStringWriter_1.default();
    writer.write("_coordinate_server_stats.molecule_cached     " + (molecule.source === Provider.MoleculeSource.Cache ? 'yes' : 'no'));
    writer.newline();
    writer.write("_coordinate_server_stats.io_time_ms          " + (molecule.ioTime | 0));
    writer.newline();
    writer.write("_coordinate_server_stats.parse_time_ms       " + (molecule.parseTime | 0));
    writer.newline();
    writer.write("_coordinate_server_stats.query_time_ms       " + (queryTime | 0));
    writer.newline();
    writer.write("_coordinate_server_stats.serialize_time_ms   " + (serializeTime | 0));
    writer.newline();
    writer.write("_coordinate_server_stats.write_time_ms       " + (writeTime | 0));
    writer.newline();
    writer.write("#\n");
    return writer.writer.asString();
}
