/*
* Copyright (c) 2016 David Sehnal
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0

* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
"use strict";
var ServerConfig_1 = require('./ServerConfig');
var fs = require('fs');
var Core = require('LiteMol-core');
var CifWriters = require('./Writers/CifWriter');
var PdbWriters = require('./Writers/PdbWriter');
var Logger_1 = require('./Utils/Logger');
var Cif = Core.Formats.Cif;
var CoordinateServerConfig = (function () {
    function CoordinateServerConfig() {
    }
    return CoordinateServerConfig;
}());
exports.CoordinateServerConfig = CoordinateServerConfig;
var CoordinateServer = (function () {
    function CoordinateServer() {
    }
    CoordinateServer.process = function (queryType, reqId, moleculeId, modelTransform, queryParams, queryProvider, config, performance, next) {
        var filename = ServerConfig_1.default.mapPdbIdToFilename(moleculeId);
        performance.start('io');
        fs.readFile(filename, 'utf8', function (err, data) {
            performance.end('io');
            if (err) {
                next({ is404: true, error: '' + err }, undefined);
                return;
            }
            var writerConfig = new CifWriters.CifWriterConfig();
            writerConfig.type = queryType;
            writerConfig.params = Object.keys(queryParams).map(function (p) { return ({ name: p, value: queryParams[p] }); });
            writerConfig.atomSitesOnly = config.atomSitesOnly;
            writerConfig.apiVersion = config.apiVersion;
            writerConfig.includedCategories = config.includedCategories;
            try {
                performance.start('parse');
                var dict = Cif.Parser.parse(data), block = dict.result.dataBlocks[0], mol = Cif.mmCif.ofDataBlock(block);
                performance.end('parse');
                performance.start('query');
                var models = [];
                var found = 0;
                for (var _i = 0, _a = mol.models; _i < _a.length; _i++) {
                    var model = _a[_i];
                    var transformed = modelTransform(queryParams, model);
                    var query = queryProvider(queryParams, model, transformed).compile();
                    var fragments = query(transformed.queryContext);
                    if (fragments.length > 0) {
                        models.push({ model: transformed, fragments: fragments });
                        found += fragments.length;
                    }
                }
                Logger_1.default.log(reqId + ": Found " + found + " fragment(s).");
                performance.end('query');
                performance.start('write');
                var ret = config.writer.writeFragment(block, models, writerConfig);
                next(undefined, ret);
            }
            catch (e) {
                next({ is404: false, error: '' + e, cif: config.writer.writeError(moleculeId, '' + e, writerConfig) }, undefined);
            }
        });
    };
    CoordinateServer.processPdb = function (id, next) {
        var filename = ServerConfig_1.default.mapPdbIdToFilename(id);
        fs.readFile(filename, 'utf8', function (err, data) {
            if (err) {
                next('' + err, undefined);
                return;
            }
            try {
                var dict = Cif.Parser.parse(data), block = dict.result.dataBlocks[0];
                var ret = new PdbWriters.PdbWriter().write(block);
                next(undefined, ret);
            }
            catch (e) {
                next('' + e, undefined);
            }
        });
    };
    return CoordinateServer;
}());
exports.CoordinateServer = CoordinateServer;
