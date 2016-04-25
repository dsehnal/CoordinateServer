"use strict";
var Logger_1 = require('../Utils/Logger');
var StringWriter_1 = require('../Writers/StringWriter');
var Molecule = require('../Data/Molecule');
var Provider = require('../Data/Provider');
var Cache = require('../Data/Cache');
var ServerConfig_1 = require('../ServerConfig');
function makePath(p) {
    return ServerConfig_1.default.appPrefix + '/' + p;
}
var WebApiCache = new Cache.Cache(ServerConfig_1.default.cacheParams);
function writeJson(response, data) {
    response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'X-Requested-With'
    });
    response.end(data);
}
function writeCIF(response, data) {
    response.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'X-Requested-With'
    });
    data.writeTo(response);
    response.end();
}
function do404(response) {
    response.writeHead(404);
    response.end();
}
function writeCifCategories(id, data, cats) {
    var writer = new StringWriter_1.default();
    writer.write('data_' + id);
    writer.newline();
    writer.write('#');
    writer.newline();
    for (var _i = 0, cats_1 = cats; _i < cats_1.length; _i++) {
        var c = cats_1[_i];
        writer.write(data.substring(c.startIndex, c.endIndex));
    }
    return writer;
}
function makeCategoriesJson(id, data, cats) {
    return JSON.stringify({
        data: id,
        categories: cats.map(function (c) { return c.toJSON(); })
    }, null, 2);
}
function categories(molecule, req, res) {
    try {
        var block_1 = molecule.molecule.cif;
        var cats = (req.query.names || '')
            .split(',')
            .map(function (c) { return block_1.getCategory(c.trim()); })
            .filter(function (c) { return !!c; });
        var isJson = !!req.query.json;
        if (isJson) {
            var json = makeCategoriesJson(block_1.header, block_1.data, cats);
            writeJson(res, json);
        }
        else {
            var cif = writeCifCategories(block_1.header, block_1.data, cats);
            writeCIF(res, cif);
        }
    }
    catch (e) {
        Logger_1.default.log('[Experimental] ' + e);
    }
}
function mapCategories(app, cache) {
    app.get(makePath(':id/categories'), function (req, res) {
        var id = req.params.id;
        var filename = ServerConfig_1.default.mapPdbIdToFilename(id);
        var addToCache = ServerConfig_1.default.cacheParams.useCache;
        if (ServerConfig_1.default.cacheParams.useCache) {
            var molecule = WebApiCache.get(Molecule.Molecule.createKey(filename));
            if (molecule) {
                categories(molecule, req, res);
                return;
            }
        }
        Provider.readMolecule(filename, function (parserErr, m) {
            if (parserErr) {
                Logger_1.default.log('[Experimental] ' + parserErr);
                do404(res);
                return;
            }
            if (addToCache)
                WebApiCache.add(m.molecule);
            categories(m, req, res);
        }, function (ioErr) {
            Logger_1.default.log('[Experimental] ' + ioErr);
            do404(res);
        }, function (unExpectedErr) {
            Logger_1.default.log('[Experimental] ' + unExpectedErr);
            do404(res);
        });
    });
}
function init(app, cache) {
    mapCategories(app, cache);
}
exports.init = init;
