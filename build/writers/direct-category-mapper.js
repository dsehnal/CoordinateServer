"use strict";
/*
 * Copyright (c) 2017 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var Core = require("../lib/LiteMol-core");
var E = Core.Formats.CIF.Binary.Encoder;
var ARRAY_TYPES = {
    'Int': Int32Array,
    'Float32': Float32Array,
    'Float64': Float64Array
};
function stringColumn(name, column) {
    return { name: name, string: function (_, i) { return column.getString(i); }, presence: function (_, i) { return column.getValuePresence(i); } };
}
function typedColumn(name, column, typedArray, encoder) {
    return { name: name, string: function (_, i) { return column.getString(i); }, number: function (_, i) { return column.getFloat(i); }, presence: function (_, i) { return column.getValuePresence(i); }, typedArray: typedArray, encoder: encoder };
}
function categoryMapper(category, columns) {
    var fields = columns.map(function (c) { return c.type === 'String'
        ? stringColumn(c.name, category.getColumn(c.name))
        : typedColumn(c.name, category.getColumn(c.name), ARRAY_TYPES[c.type], c.encoder || E.by(E.byteArray)); });
    return {
        data: {},
        count: category.rowCount,
        desc: {
            name: category.name,
            fields: fields
        }
    };
}
exports.categoryMapper = categoryMapper;
