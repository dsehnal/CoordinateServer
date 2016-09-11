"use strict";
var Core = require('LiteMol-core');
var Context_1 = require('./Context');
var BCifWriter = (function () {
    function BCifWriter(header) {
        this.data = {};
        this.totalLength = 0;
        this.data.data_ = (header || '').replace(/[ \n\t]/g, '').toUpperCase();
    }
    BCifWriter.prototype.encodeField = function (field, data, totalCount) {
        var array;
        if (field.typedArray) {
            array = new field.typedArray(totalCount);
        }
        else {
            array = [];
        }
        var getter = field.number ? field.number : field.string;
        var offset = 0;
        for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
            var _d = data_1[_i];
            var d = _d.data;
            for (var i = 0, _b = _d.count; i < _b; i++) {
                array[offset++] = getter(d, i);
            }
        }
        var encoder = field.encoder ? field.encoder : Context_1.Encoders.strings;
        var encoded = encoder.encode(array);
        //console.log(field.name, encoded.data.length, encoded.data instanceof Uint8Array);
        this.totalLength += encoded.data.length;
        return encoded;
    };
    BCifWriter.prototype.writeCategory = function (category, contexts) {
        var categories = !contexts || !contexts.length ? [category(void 0)] : contexts.map(function (c) { return category(c); });
        categories = categories.filter(function (c) { return !!c || !!(c && (c.count === void 0 ? 1 : c.count)); });
        if (!categories.length)
            return;
        var count = categories.reduce(function (a, c) { return a + (c.count === void 0 ? 1 : c.count); }, 0);
        if (!count)
            return;
        var first = categories[0];
        var cat = {};
        var data = categories.map(function (c) { return ({ data: c.data, count: c.count === void 0 ? 1 : c.count }); });
        for (var _i = 0, _a = first.desc.fields; _i < _a.length; _i++) {
            var f = _a[_i];
            cat[f.name] = this.encodeField(f, data, count);
        }
        this.data[first.desc.name] = cat;
    };
    BCifWriter.prototype.serialize = function (stream) {
        //console.log(this.data);
        var packed = Core.Formats.MessagePack.encode(this.data);
        //console.log('packed', packed.length, packed.byteLength, this.totalLength, (Uint8Array as any).BYTES_PER_ELEMENT);
        var buffer = new Buffer(packed);
        //console.log(this.data);
        stream.write(buffer);
    };
    return BCifWriter;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BCifWriter;
