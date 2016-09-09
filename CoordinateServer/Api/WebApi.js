"use strict";
var Queries = require('./Queries');
var Api = require('./Api');
var CifWriters = require('../Writers/CifWriter');
var Molecule = require('../Data/Molecule');
var Provider = require('../Data/Provider');
var Cache = require('../Data/Cache');
var Experimental = require('./ExperimentalWebApi');
var ServerConfig_1 = require('../ServerConfig');
function makePath(p) {
    return ServerConfig_1.default.appPrefix + '/' + p;
}
var WebApiCache = new Cache.Cache(ServerConfig_1.default.cacheParams);
function execute(response, query, molecule, params) {
    Api.executeQuery(molecule, query, params, function () {
        response.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'X-Requested-With'
        });
        return response;
    });
}
function do404(response) {
    response.writeHead(404);
    response.end();
}
function doCifError(response, message, id, queryName, params) {
    response.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'X-Requested-With'
    });
    var wcfg = new CifWriters.CifWriterConfig();
    wcfg.commonParams = {
        atomSitesOnly: !!params.atomSitesOnly,
        modelId: params.modelId,
        format: params.format
    };
    wcfg.type = queryName;
    var msg = new CifWriters.DefaultCifWriter().writeError(id, message, wcfg);
    response.end(msg);
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
