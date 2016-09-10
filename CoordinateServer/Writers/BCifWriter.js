"use strict";
var Core = require('LiteMol-core');
var Context_1 = require('./Context');
var BCifWriter = (function () {
    function BCifWriter(header) {
        this.data = {};
        this.totalLength = 0;
        this.data.data_ = (header || '').replace(/[ \n\t]/g, '').toUpperCase();
    }
    BCifWriter.prototype.encodeField = function (field, data, count) {
        var array;
        if (field.typedArray) {
            array = new field.typedArray(count);
        }
        else {
            array = [];
        }
        var getter = field.number ? field.number : field.string;
        for (var i = 0; i < count; i++) {
            array[i] = getter(data, i);
        }
        var encoder = field.encoder ? field.encoder : Context_1.Encoders.strings;
        var encoded = encoder.encode(array);
        console.log(field.name, encoded.data.length, encoded.data instanceof Uint8Array);
        this.totalLength += encoded.data.length;
        return encoded;
    };
    BCifWriter.prototype.writeCategory = function (category, context) {
        var data = category(context);
        if (!data)
            return;
        var count = data.count === void 0 ? 1 : data.count;
        if (count === 0)
            return;
        var cat = {};
        for (var _i = 0, _a = data.desc.fields; _i < _a.length; _i++) {
            var f = _a[_i];
            cat[f.name] = this.encodeField(f, data.data, count);
        }
        this.data[data.desc.name] = cat;
    };
    BCifWriter.prototype.serialize = function (stream) {
        //console.log(this.data);
        var packed = Core.Formats.MsgPack.encode(this.data);
        //console.log('packed', packed.length, packed.byteLength, this.totalLength, (Uint8Array as any).BYTES_PER_ELEMENT);
        var buffer = new Buffer(packed);
        //console.log(this.data);
        stream.write(buffer);
    };
    return BCifWriter;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BCifWriter;
