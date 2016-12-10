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
var Version_1 = require("../Api/Version");
var Provider = require("../Data/Provider");
var mmCif = require("./Formats/mmCif");
var CIF = Core.Formats.CIF;
function wrapStream(stream) {
    return {
        writeBinary: function (data) {
            return stream.write(new Buffer(data));
        },
        writeString: function (data) {
            return stream.write(data);
        }
    };
}
exports.wrapStream = wrapStream;
var E = Core.Formats.CIF.Binary.Encoder;
exports.Encoders = {
    strings: E.by(E.stringArray),
    coordinates1: E.by(E.fixedPoint(10)).and(E.delta).and(E.integerPacking),
    coordinates3: E.by(E.fixedPoint(1000)).and(E.delta).and(E.integerPacking),
    occupancy: E.by(E.fixedPoint(100)).and(E.delta).and(E.runLength).and(E.int32),
    ids: E.by(E.delta).and(E.runLength).and(E.integerPacking),
    int32: E.by(E.int32),
    float64: E.by(E.float64)
};
function createParamsCategory(params) {
    var prms = [];
    for (var _i = 0, _a = Object.keys(params.query); _i < _a.length; _i++) {
        var p = _a[_i];
        prms.push({ name: p, value: params.query[p] });
    }
    prms.push({ name: 'atomSitesOnly', value: params.common.atomSitesOnly ? '1' : '0' });
    prms.push({ name: 'modelId', value: params.common.modelId });
    prms.push({ name: 'format', value: params.common.format });
    prms.push({ name: 'encoding', value: params.common.encoding });
    prms.push({ name: 'lowPrecisionCoords', value: params.common.lowPrecisionCoords });
    var data = prms;
    var fields = [
        { name: 'name', string: function (data, i) { return data[i].name; } },
        { name: 'value', string: function (data, i) { return '' + data[i].value; }, presence: function (data, i) { return data[i].value !== void 0 && data[i].value !== null ? 0 /* Present */ : 1 /* NotSpecified */; } },
    ];
    return function () { return ({
        data: data,
        count: data.length,
        desc: {
            name: '_coordinate_server_query_params',
            fields: fields
        }
    }); };
}
exports.createParamsCategory = createParamsCategory;
function createResultHeaderCategory(_a, queryType) {
    var isEmpty = _a.isEmpty, hasError = _a.hasError;
    if (queryType === void 0) { queryType = '?'; }
    var data = {
        isEmpty: isEmpty,
        hasError: hasError,
        queryType: queryType,
        ApiVersion: Version_1.default,
        CoreVersion: Core.VERSION.number
    };
    var fields = [
        { name: 'query_type', string: function (d) { return d.queryType; } },
        { name: 'datetime', string: function (d) { return "" + new Date().toLocaleString('en-US'); } },
        { name: 'is_empty', string: function (d) { return d.isEmpty ? 'yes' : 'no'; } },
        { name: 'has_error', string: function (d) { return d.hasError ? 'yes' : 'no'; } },
        { name: 'api_version', string: function (d) { return d.ApiVersion; } },
        { name: 'core_version', string: function (d) { return d.CoreVersion; } }
    ];
    return function () { return ({
        data: data,
        count: 1,
        desc: {
            name: '_coordinate_server_result',
            fields: fields
        }
    }); };
}
exports.createResultHeaderCategory = createResultHeaderCategory;
function createErrorCategory(message) {
    var data = message;
    var fields = [
        { name: 'message', string: function (data) { return data; } }
    ];
    return function () { return ({
        data: data,
        count: 1,
        desc: {
            name: '_coordinate_server_error',
            fields: fields
        }
    }); };
}
exports.createErrorCategory = createErrorCategory;
function createStatsCategory(molecule, queryTime, formatTime) {
    var data = { cached: molecule.source === Provider.MoleculeSource.Cache ? 'yes' : 'no', io: molecule.ioTime | 0, parse: molecule.parseTime | 0, query: queryTime | 0, format: formatTime | 0 };
    var fields = [
        { name: 'molecule_cached', string: function (data) { return data.cached; } },
        { name: 'io_time_ms', string: function (data) { return "" + data.io; }, number: function (data) { return data.io; }, typedArray: Int32Array, encoder: E.by(E.int32) },
        { name: 'parse_time_ms', string: function (data) { return "" + data.parse; }, number: function (data) { return data.parse; }, typedArray: Int32Array, encoder: E.by(E.int32) },
        { name: 'query_time_ms', string: function (data) { return "" + data.query; }, number: function (data) { return data.query; }, typedArray: Int32Array, encoder: E.by(E.int32) },
        { name: 'format_time_ms', string: function (data) { return "" + data.format; }, number: function (data) { return data.format; }, typedArray: Int32Array, encoder: E.by(E.int32) }
    ];
    return function () { return ({
        data: data,
        count: 1,
        desc: {
            name: '_coordinate_server_stats',
            fields: fields
        }
    }); };
}
exports.createStatsCategory = createStatsCategory;
function createWriter(encoding, header) {
    var isBCif = (encoding || '').trim().toLowerCase() === 'bcif';
    var w = isBCif
        ? new CIF.Binary.Writer("CoordinateServer " + Version_1.default)
        : new CIF.Text.Writer();
    w.startDataBlock(header);
    return w;
}
exports.createWriter = createWriter;
function writeError(stream, encoding, header, message, optional) {
    var w = createWriter(encoding, header);
    optional = optional || {};
    var headerCat = createResultHeaderCategory({ isEmpty: true, hasError: true }, optional.queryType);
    w.writeCategory(headerCat);
    if (optional.params) {
        var pCat = createParamsCategory(optional.params);
        w.writeCategory(pCat);
    }
    var errorCat = createErrorCategory(message);
    w.writeCategory(errorCat);
    w.flush(stream);
}
exports.writeError = writeError;
function getFormatter(format) {
    return mmCif.format; //(format || '').toLowerCase().trim() === 'o-mmcif' ? OptimizedMmCif.format : mmCif.format;
}
exports.getFormatter = getFormatter;
