"use strict";
var Core = require('LiteMol-core');
var BCIF = Core.Formats.BinaryCIF;
var Context_1 = require('./Context');
var Version_1 = require('../Api/Version');
var BCifWriter = (function () {
    function BCifWriter(header) {
        this.dataBlock = {
            header: (header || '').replace(/[ \n\t]/g, '').toUpperCase(),
            categories: []
        };
        this.data = {
            encoder: "CoordinateServer " + Version_1.default,
            version: BCIF.VERSION,
            dataBlocks: [this.dataBlock]
        };
    }
    BCifWriter.prototype.encodeField = function (field, data, totalCount) {
        var array, isNative = false;
        if (field.typedArray) {
            array = new field.typedArray(totalCount);
        }
        else {
            isNative = true;
            array = [];
        }
        var mask = new Uint8Array(totalCount);
        var presence = field.presence;
        var getter = field.number ? field.number : field.string;
        var allPresent = true;
        var offset = 0;
        for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
            var _d = data_1[_i];
            var d = _d.data;
            for (var i = 0, _b = _d.count; i < _b; i++) {
                var p = void 0;
                if (presence && (p = presence(d, i)) !== 0 /* Present */) {
                    mask[offset] = p;
                    if (isNative)
                        array[offset] = null;
                    allPresent = false;
                }
                else {
                    mask[offset] = 0 /* Present */;
                    array[offset] = getter(d, i);
                }
                offset++;
            }
        }
        var encoder = field.encoder ? field.encoder : Context_1.Encoders.strings;
        var encoded = encoder.encode(array);
        var maskData; // = null;
        if (!allPresent) {
            var maskRLE = BCIF.Encoder.by(BCIF.Encoder.runLength).and(BCIF.Encoder.int32).encode(mask);
            if (maskRLE.data.length < mask.length) {
                maskData = maskRLE;
            }
            else {
                maskData = BCIF.Encoder.by(BCIF.Encoder.uint8).encode(mask);
            }
        }
        //console.log(field.name, encoded.data.length, encoded.data instanceof Uint8Array);
        return {
            name: field.name,
            data: encoded,
            mask: maskData
        };
    };
    BCifWriter.prototype.writeCategory = function (category, contexts) {
        if (!this.data) {
            throw new Error('The writer contents have already been encoded, no more writing.');
        }
        var categories = !contexts || !contexts.length ? [category(void 0)] : contexts.map(function (c) { return category(c); });
        categories = categories.filter(function (c) { return !!c || !!(c && (c.count === void 0 ? 1 : c.count)); });
        if (!categories.length)
            return;
        var count = categories.reduce(function (a, c) { return a + (c.count === void 0 ? 1 : c.count); }, 0);
        if (!count)
            return;
        var first = categories[0];
        var cat = { name: first.desc.name, columns: [] };
        var data = categories.map(function (c) { return ({ data: c.data, count: c.count === void 0 ? 1 : c.count }); });
        for (var _i = 0, _a = first.desc.fields; _i < _a.length; _i++) {
            var f = _a[_i];
            cat.columns.push(this.encodeField(f, data, count));
        }
        this.dataBlock.categories.push(cat);
    };
    BCifWriter.prototype.encode = function () {
        var packed = Core.Formats.MessagePack.encode(this.data);
        this.encodedData = new Buffer(packed);
        this.data = null;
        this.dataBlock = null;
    };
    BCifWriter.prototype.flush = function (stream) {
        stream.write(this.encodedData);
    };
    return BCifWriter;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BCifWriter;
