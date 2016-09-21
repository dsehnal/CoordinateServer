"use strict";
var Queries = require('./Queries');
var Api = require('./Api');
var Molecule = require('../Data/Molecule');
var Provider = require('../Data/Provider');
var Cache = require('../Data/Cache');
var Experimental = require('./ExperimentalWebApi');
var ServerConfig_1 = require('../ServerConfig');
var WriterContext = require('../Writers/Context');
function makePath(p) {
    return ServerConfig_1.default.appPrefix + '/' + p;
}
var WebApiCache = new Cache.Cache(ServerConfig_1.default.cacheParams);
function writeHeader(response, id, queryType, encoding) {
    if (response.headersSent)
        return;
    var isBCif = (encoding || '').trim().toLowerCase() === 'bcif';
    var ct = isBCif ? 'application/octet-stream' : 'text/plain; charset=utf-8';
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
function execute(response, query, molecule, params) {
    Api.executeQuery(molecule, query, params, function () {
        writeHeader(response, molecule.molecule.molecule.id, query.name, params.encoding);
        return response;
    });
}
function do404(response) {
    response.writeHead(404);
    response.end();
}
function doCifError(response, message, id, queryName, params) {
    writeHeader(response, id, queryName, params.encoding);
    WriterContext.writeError(response, params.encoding, id, message, { queryType: queryName });
    response.end();
}
function mapQuery(app, query) {
    app.get(makePath(':id/' + query.name), function (req, res) {
        var id = req.params.id;
        var filename = ServerConfig_1.default.mapPdbIdToFilename(id);
        var addToCache = ServerConfig_1.default.cacheParams.useCache;
        if (ServerConfig_1.default.cacheParams.useCache) {
            var molecule = WebApiCache.get(Molecule.Molecule.createKey(filename));
            if (molecule) {
                execute(res, query, molecule, req.query);
                return;
            }
        }
        Provider.readMolecule(filename, function (parserErr, m) {
            if (parserErr) {
                doCifError(res, parserErr, id, query.name, req.query);
                return;
            }
            if (addToCache)
                WebApiCache.add(m.molecule);
            execute(res, query, m, req.query);
        }, function (ioErr) {
            do404(res);
        }, function (unExpectedErr) {
            doCifError(res, '' + unExpectedErr, id, query.name, req.query);
        });
    });
}
function init(app) {
    for (var _i = 0, _a = Queries.QueryList; _i < _a.length; _i++) {
        var q = _a[_i];
        mapQuery(app, q);
    }
    Experimental.init(app, WebApiCache);
}
exports.init = init;