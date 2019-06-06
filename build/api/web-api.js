"use strict";
/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var Queries = require("./queries");
var Api = require("./api");
var Molecule = require("../data/molecule");
var Provider = require("../data/provider");
var Cache = require("../data/cache");
var server_config_1 = require("../server-config");
var WriterContext = require("../writers/context");
var logger_1 = require("../utils/logger");
function makePath(p) {
    return server_config_1.default.appPrefix + '/' + p;
}
var WebApiCache = new Cache.Cache(server_config_1.default.cacheParams);
exports.ApiState = {
    pendingQueries: 0,
    shutdownOnZeroPending: false
};
function writeHeader(response, id, queryType, encoding) {
    if (response.headersSent)
        return;
    var isBCif = (encoding || '').trim().toLowerCase() === 'bcif';
    if (isBCif) {
        response.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'X-Requested-With',
            'Content-Disposition': "inline; filename=\"" + (id || '').replace(/[ \n\t]/g, '').toLowerCase() + "_" + queryType + ".bcif\""
        });
    }
    else {
        response.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'X-Requested-With'
        });
    }
}
function handleQueryEnd() {
    exports.ApiState.pendingQueries = Math.max(exports.ApiState.pendingQueries - 1, 0);
    if (exports.ApiState.pendingQueries === 0 && exports.ApiState.shutdownOnZeroPending) {
        logger_1.default.log("Shut down due to timeout.");
        process.exit(0);
    }
}
function execute(response, query, molecule, params) {
    Api.executeQuery(molecule, query, params, function () {
        writeHeader(response, molecule.molecule.molecule.id, query.name, params.encoding);
        return response;
    }, function () { return handleQueryEnd(); });
}
function do404(response) {
    response.writeHead(404);
    response.end();
}
function doCifError(response, message, id, queryName, params) {
    writeHeader(response, id, queryName, params.encoding);
    WriterContext.writeError(WriterContext.wrapStream(response), params.encoding, id, message, { queryType: queryName });
    response.end();
}
function mapQuery(app, query) {
    app.get(makePath(':id/' + query.name), function (req, res) {
        logger_1.default.log("[server] Query '" + req.params.id + "/" + query.name + "'...");
        exports.ApiState.pendingQueries++;
        var id = req.params.id;
        var filename = server_config_1.default.mapPdbIdToFilename(id, req.query && req.query.dataSource);
        var addToCache = server_config_1.default.cacheParams.useCache;
        if (server_config_1.default.cacheParams.useCache) {
            var molecule = WebApiCache.get(Molecule.Molecule.createKey(filename));
            if (molecule) {
                execute(res, query, molecule, req.query);
                return;
            }
        }
        Provider.readMolecule(filename, function (parserErr, m) {
            if (parserErr) {
                doCifError(res, parserErr, id, query.name, req.query);
                handleQueryEnd();
                return;
            }
            if (addToCache && m.source !== Provider.MoleculeSource.Cache)
                WebApiCache.add(m.molecule);
            execute(res, query, m, req.query);
        }, function (ioErr) {
            do404(res);
            handleQueryEnd();
        }, function (unExpectedErr) {
            doCifError(res, '' + unExpectedErr, id, query.name, req.query);
            handleQueryEnd();
        });
    });
}
function init(app) {
    for (var _i = 0, _a = Queries.QueryList; _i < _a.length; _i++) {
        var q = _a[_i];
        mapQuery(app, q);
    }
}
exports.init = init;
