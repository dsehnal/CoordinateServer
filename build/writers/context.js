"use strict";
/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var Core = require("../lib/LiteMol-core");
var version_1 = require("../api/version");
var Provider = require("../data/provider");
var mmCif = require("./formats/mmcif");
var CIF = Core.Formats.CIF;
function wrapStream(stream) {
    return {
        writeBinary: function (data) {
            return stream.write(new Buffer(data.buffer));
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
    occupancy: E.by(E.fixedPoint(100)).and(E.delta).and(E.runLength).and(E.byteArray),
    ids: E.by(E.delta).and(E.runLength).and(E.integerPacking),
    int32: E.by(E.byteArray),
    float64: E.by(E.byteArray)
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
        ApiVersion: version_1.default,
        CoreVersion: Core.VERSION.number
    };
    var fields = [
        { name: 'query_type', string: function (d) { return d.queryType; } },
        { name: 'datetime_utc', string: function (d) { return "" + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''); } },
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
        { name: 'io_time_ms', string: function (data) { return "" + data.io; }, number: function (data) { return data.io; }, typedArray: Int32Array, encoder: E.by(E.byteArray) },
        { name: 'parse_time_ms', string: function (data) { return "" + data.parse; }, number: function (data) { return data.parse; }, typedArray: Int32Array, encoder: E.by(E.byteArray) },
        { name: 'query_time_ms', string: function (data) { return "" + data.query; }, number: function (data) { return data.query; }, typedArray: Int32Array, encoder: E.by(E.byteArray) },
        { name: 'format_time_ms', string: function (data) { return "" + data.format; }, number: function (data) { return data.format; }, typedArray: Int32Array, encoder: E.by(E.byteArray) }
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
        ? new CIF.Binary.Writer("CoordinateServer " + version_1.default)
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
