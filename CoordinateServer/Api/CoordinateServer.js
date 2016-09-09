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
var Core = require('LiteMol-core');
var CifWriters = require('../Writers/CifWriter');
var Logger_1 = require('../Utils/Logger');
var CoordinateServerConfig = (function () {
    function CoordinateServerConfig() {
        this.useFCif = false;
    }
    return CoordinateServerConfig;
}());
exports.CoordinateServerConfig = CoordinateServerConfig;
var CoordinateServer = (function () {
    function CoordinateServer() {
    }
    CoordinateServer.process = function (reqId, molecule, query, queryParams, config, next) {
        var perf = new Core.Utils.PerformanceMonitor();
        var writerConfig = new CifWriters.CifWriterConfig();
        writerConfig.type = query.name;
        writerConfig.params = Object.keys(queryParams).map(function (p) { return ({ name: p, value: queryParams[p] }); });
        writerConfig.commonParams = config.commonParams;
        writerConfig.includedCategories = config.includedCategories;
        writerConfig.useFCif = config.useFCif;
        try {
            var models = [];
            perf.start('query');
            var found = 0;
            var singleModel = !!config.commonParams.modelId;
            var singleModelId = config.commonParams.modelId;
            var foundModel = false;
            for (var _i = 0, _a = molecule.models; _i < _a.length; _i++) {
                var modelWrap = _a[_i];
                var fragments = void 0;
                var model = modelWrap.model;
                if (singleModel && model.modelId !== singleModelId)
                    continue;
                foundModel = true;
                if (query.description.modelTransform) {
                    var transformed = query.description.modelTransform(queryParams, model);
                    var compiled = query.description.query(queryParams, model, transformed).compile();
                    fragments = compiled(transformed.queryContext);
                    model = transformed;
                }
                else {
                    var compiled = query.description.query(queryParams, model, model).compile();
                    fragments = compiled(model.queryContext);
                }
                if (fragments.length > 0) {
                    models.push({ model: model, fragments: fragments });
                    found += fragments.length;
                }
            }
            perf.end('query');
            if (singleModelId && !foundModel) {
                var err = "Model with id '" + singleModelId + "' was not found.";
                next({
                    error: err,
                    errorCif: config.writer.writeError(molecule.molecule.id, err, writerConfig)
                });
                return;
            }
            Logger_1.default.log(reqId + ": Found " + found + " fragment(s).");
            perf.start('serialize');
            var data = config.writer.writeFragment(molecule.cif, models, writerConfig);
            perf.end('serialize');
            next({
                data: data,
                timeQuery: perf.time('query'),
                timeSerialize: perf.time('serialize')
            });
        }
        catch (e) {
            next({
                error: '' + e,
                errorCif: config.writer.writeError(molecule.molecule.id, '' + e, writerConfig)
            });
        }
    };
    return CoordinateServer;
}());
exports.CoordinateServer = CoordinateServer;
