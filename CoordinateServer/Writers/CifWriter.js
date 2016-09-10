"use strict";
var StringWriter_1 = require('./StringWriter');
function isMultiline(value) {
    return !!value && value.indexOf('\n') >= 0;
}
function writeCifSingleRecord(category, writer) {
    var fields = category.desc.fields;
    var data = category.data;
    var width = fields.reduce(function (w, s) { return Math.max(w, s.name.length); }, 0) + category.desc.name.length + 5;
    for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
        var f = fields_1[_i];
        writer.writer.writePadRight(category.desc.name + "." + f.name, width);
        var val = f.string(data, 0);
        if (isMultiline(val)) {
            writer.writeMultiline(val);
            writer.writer.newline();
        }
        else {
            writer.writeChecked(val);
        }
        writer.writer.newline();
    }
    writer.write('#\n');
}
function writeCifLoop(category, writer) {
    writer.writeLine('loop_');
    var fields = category.desc.fields;
    var data = category.data;
    for (var _i = 0, fields_2 = fields; _i < fields_2.length; _i++) {
        var f = fields_2[_i];
        writer.writeLine(category.desc.name + "." + f.name);
    }
    var count = category.count;
    for (var i = 0; i < count; i++) {
        for (var _a = 0, fields_3 = fields; _a < fields_3.length; _a++) {
            var f = fields_3[_a];
            var val = f.string(data, i);
            if (isMultiline(val)) {
                writer.writeMultiline(val);
                writer.writer.newline();
            }
            else {
                writer.writeChecked(val);
            }
        }
        writer.newline();
    }
    writer.write('#\n');
}
var CifWriter = (function () {
    function CifWriter(header) {
        this.writer = new CifStringWriter();
        this.writer.write("data_" + (header || '').replace(/[ \n\t]/g, '').toUpperCase() + "\n#\n");
    }
    CifWriter.prototype.writeCategory = function (category, context) {
        var data = category(context);
        if (!data)
            return;
        var count = data.count === void 0 ? 1 : data.count;
        if (count === 0)
            return;
        else if (count === 1) {
            writeCifSingleRecord(data, this.writer);
        }
        else {
            writeCifLoop(data, this.writer);
        }
    };
    CifWriter.prototype.serialize = function (stream) {
        this.writer.writer.writeTo(stream);
    };
    return CifWriter;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CifWriter;
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
