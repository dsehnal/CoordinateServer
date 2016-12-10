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
var Core = require("LiteMol-core");
var Logger_1 = require("../Utils/Logger");
function processQuery(reqId, molecule, query, queryParams, formatter, config, next) {
    var perf = new Core.Utils.PerformanceMonitor();
    var formatConfig = {
        queryType: query.name,
        data: molecule.cif,
        includedCategories: config.includedCategories,
        params: queryParams
    };
    try {
        var models = [];
        perf.start('query');
        var found = 0;
        var singleModel = !!queryParams.common.modelId;
        var singleModelId = queryParams.common.modelId;
        var foundModel = false;
        for (var _i = 0, _a = molecule.models; _i < _a.length; _i++) {
            var modelWrap = _a[_i];
            var fragments = void 0;
            var model = modelWrap.model;
            if (singleModel && model.modelId !== singleModelId)
                continue;
            foundModel = true;
            if (query.description.modelTransform) {
                var transformed = query.description.modelTransform(queryParams.query, model);
                var compiled = query.description.query(queryParams.query, model, transformed).compile();
                fragments = compiled(transformed.queryContext);
                model = transformed;
            }
            else {
                var compiled = query.description.query(queryParams.query, model, model).compile();
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
            });
            return;
        }
        Logger_1.default.log(reqId + ": Found " + found + " fragment(s).");
        perf.start('format');
        formatter(config.writer, formatConfig, models);
        perf.end('format');
        next({
            timeQuery: perf.time('query'),
            timeFormat: perf.time('format')
        });
    }
    catch (e) {
        next({
            error: '' + e,
        });
    }
}
exports.processQuery = processQuery;
