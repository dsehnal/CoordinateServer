"use strict";
var __paddingSpaces = [];
(function () {
    var s = '';
    for (var i = 0; i < 512; i++) {
        __paddingSpaces[i] = s;
        s = s + ' ';
    }
})();
var StringWriter = (function () {
    function StringWriter(chunkCapacity) {
        if (chunkCapacity === void 0) { chunkCapacity = 512; }
        this.chunkCapacity = chunkCapacity;
        this.chunkData = [];
        this.chunkOffset = 0;
        this.data = [];
    }
    //get byteLength() {
    //    let len = 0;
    //    for (let s of this.data) len += Buffer.byteLength(s);
    //    for (let i = this.chunkOffset - 1; i >= 0; i--) len += Buffer.byteLength(this.chunkData[i]);
    //    return len;
    //}
    //toBuffer() {
    //    let byteLen = this.byteLength;
    //    let buffer = new Buffer(byteLen);
    //    let o = 0;
    //    for (let s of this.data) { o += buffer.write(s, o); }
    //    for (let i = 0, _b = this.chunkOffset; i < _b; i++) { o += buffer.write(this.chunkData[i], o); }
    //    return buffer;
    //}
    StringWriter.prototype.asString = function () {
        if (!this.data.length) {
            if (this.chunkData.length === this.chunkOffset)
                return this.chunkData.join('');
            return this.chunkData.splice(0, this.chunkOffset).join('');
        }
        if (this.chunkOffset > 0) {
            this.data[this.data.length] = this.chunkData.splice(0, this.chunkOffset).join('');
        }
        return this.data.join('');
    };
    StringWriter.prototype.writeTo = function (stream) {
        this.finalize();
        for (var _i = 0, _a = this.data; _i < _a.length; _i++) {
            var s = _a[_i];
            stream.write(s);
        }
    };
    StringWriter.prototype.finalize = function () {
        if (this.chunkOffset > 0) {
            if (this.chunkData.length === this.chunkOffset)
                this.data[this.data.length] = this.chunkData.join('');
            else
                this.data[this.data.length] = this.chunkData.splice(0, this.chunkOffset).join('');
            this.chunkOffset = 0;
        }
    };
    StringWriter.prototype.newline = function () {
        this.write('\n');
    };
    StringWriter.prototype.whitespace = function (len) {
        this.write(__paddingSpaces[len]);
    };
    StringWriter.prototype.appendWriter = function (w) {
        if (this.chunkOffset > 0) {
            this.data[this.data.length] = this.chunkData.splice(0, this.chunkOffset).join('');
            this.chunkOffset = 0;
        }
        for (var _i = 0, _a = w.data; _i < _a.length; _i++) {
            var ch = _a[_i];
            this.data[this.data.length] = ch;
        }
        if (w.chunkOffset > 0) {
            this.data[this.data.length] = w.chunkData.splice(0, w.chunkOffset).join('');
        }
    };
    StringWriter.prototype.write = function (val) {
        if (val === undefined || val === null) {
            return;
        }
        if (this.chunkOffset === this.chunkCapacity) {
            this.data[this.data.length] = this.chunkData.join('');
            this.chunkOffset = 0;
        }
        this.chunkData[this.chunkOffset++] = val;
    };
    StringWriter.prototype.writeSafe = function (val) {
        if (this.chunkOffset === this.chunkCapacity) {
            this.data[this.data.length] = this.chunkData.join('');
            this.chunkOffset = 0;
        }
        this.chunkData[this.chunkOffset++] = val;
    };
    StringWriter.prototype.writePadLeft = function (val, totalWidth) {
        if (val === undefined || val === null) {
            this.write(__paddingSpaces[totalWidth]);
        }
        var padding = totalWidth - val.length;
        if (padding > 0)
            this.write(__paddingSpaces[padding]);
        this.write(val);
    };
    StringWriter.prototype.writePadRight = function (val, totalWidth) {
        if (val === undefined || val === null) {
            this.write(__paddingSpaces[totalWidth]);
        }
        var padding = totalWidth - val.length;
        this.write(val);
        if (padding > 0)
            this.write(__paddingSpaces[padding]);
    };
    StringWriter.prototype.writeInteger = function (val) {
        this.write('' + val);
    };
    StringWriter.prototype.writeIntegerPadLeft = function (val, totalWidth) {
        var s = '' + val;
        var padding = totalWidth - s.length;
        if (padding > 0)
            this.write(__paddingSpaces[padding]);
        this.write(s);
    };
    StringWriter.prototype.writeIntegerPadRight = function (val, totalWidth) {
        var s = '' + val;
        var padding = totalWidth - s.length;
        this.write(s);
        if (padding > 0)
            this.write(__paddingSpaces[padding]);
    };
    /**
     * @example writeFloat(123.2123, 100) -- 2 decim
     */
    StringWriter.prototype.writeFloat = function (val, precisionMultiplier) {
        this.write('' + Math.round(precisionMultiplier * val) / precisionMultiplier);
    };
    StringWriter.prototype.writeFloatPadLeft = function (val, precisionMultiplier, totalWidth) {
        var s = '' + Math.round(precisionMultiplier * val) / precisionMultiplier;
        var padding = totalWidth - s.length;
        if (padding > 0)
            this.write(__paddingSpaces[padding]);
        this.write(s);
    };
    StringWriter.prototype.writeFloatPadRight = function (val, precisionMultiplier, totalWidth) {
        var s = '' + Math.round(precisionMultiplier * val) / precisionMultiplier;
        var padding = totalWidth - s.length;
        this.write(s);
        if (padding > 0)
            this.write(__paddingSpaces[padding]);
    };
    return StringWriter;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StringWriter;
