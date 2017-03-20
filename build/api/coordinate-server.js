/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Core = require("../lib/LiteMol-core");
var logger_1 = require("../utils/logger");
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
        logger_1.default.log(reqId + ": Found " + found + " fragment(s).");
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
