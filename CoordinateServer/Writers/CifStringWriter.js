"use strict";
var StringWriter_1 = require('./StringWriter');
var CifStringWriter = (function () {
    function CifStringWriter() {
        this.writer = new StringWriter_1.default();
    }
    CifStringWriter.prototype.newline = function () {
        this.writer.newline();
    };
    CifStringWriter.prototype.write = function (val) {
        this.writer.write(val);
    };
    CifStringWriter.prototype.writeLine = function (val) {
        this.writer.write(val);
        this.writer.newline();
    };
    CifStringWriter.prototype.writeInteger = function (val) {
        this.writer.writeSafe('' + val + ' ');
    };
    /*
     * eg writeFloat(123.2123, 100) -- 2 decim
     */
    CifStringWriter.prototype.writeFloat = function (val, precisionMultiplier) {
        this.writer.writeSafe('' + Math.round(precisionMultiplier * val) / precisionMultiplier + ' ');
    };
    CifStringWriter.prototype.writeChecked = function (val) {
        if (!val) {
            this.writer.writeSafe('. ');
            return;
        }
        var escape = false, escapeCharStart = '\'', escapeCharEnd = '\' ';
        var writer = this.writer;
        var whitespace = false;
        var hasSingle = false;
        var hasDouble = false;
        for (var i = 0, _l = val.length - 1; i < _l; i++) {
            var c = val.charCodeAt(i);
            switch (c) {
                case 9:
                    whitespace = true;
                    break; // \t
                case 10:
                    writer.writeSafe('\n;' + val);
                    writer.writeSafe('\n; ');
                    return;
                case 32:
                    whitespace = true;
                    break; // ' '
                case 34:
                    if (hasSingle) {
                        writer.writeSafe('\n;' + val);
                        writer.writeSafe('\n; ');
                        return;
                    }
                    hasDouble = true;
                    escape = true;
                    escapeCharStart = '\'';
                    escapeCharEnd = '\' ';
                    break;
                case 39:
                    if (hasDouble) {
                        writer.writeSafe('\n;' + val);
                        writer.writeSafe('\n; ');
                        return;
                    }
                    escape = true;
                    hasSingle = true;
                    escapeCharStart = '"';
                    escapeCharEnd = '" ';
                    break;
            }
        }
        if (!escape && (val.charCodeAt(0) === 59 /* ; */ || whitespace)) {
            escapeCharStart = '\'';
            escapeCharEnd = '\' ';
            escape = true;
        }
        if (escape) {
            writer.writeSafe(escapeCharStart + val + escapeCharEnd);
        }
        else {
            writer.write(val);
            writer.writeSafe(' ');
        }
    };
    CifStringWriter.prototype.writeMultiline = function (val) {
        this.writer.writeSafe('\n;' + val);
        this.writer.writeSafe('\n; ');
    };
    CifStringWriter.prototype.writeToken = function (data, start, end) {
        var escape = false, escapeCharStart = '\'', escapeCharEnd = '\' ';
        var writer = this.writer;
        for (var i = start; i < end - 1; i++) {
            var c = data.charCodeAt(i);
            switch (c) {
                case 10:
                    writer.writeSafe('\n;' + data.substring(start, end));
                    writer.writeSafe('\n; ');
                    return;
                case 34:
                    escape = true;
                    escapeCharStart = '\'';
                    escapeCharEnd = '\' ';
                    break;
                case 39:
                    escape = true;
                    escapeCharStart = '"';
                    escapeCharEnd = '" ';
                    break;
            }
        }
        if (!escape && data.charCodeAt(start) === 59 /* ; */) {
            escapeCharStart = '\'';
            escapeCharEnd = '\' ';
            escape = true;
        }
        if (escape) {
            writer.writeSafe(escapeCharStart + data.substring(start, end));
            writer.writeSafe(escapeCharStart);
        }
        else {
            writer.write(data.substring(start, end));
            writer.writeSafe(' ');
        }
    };
    return CifStringWriter;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CifStringWriter;
