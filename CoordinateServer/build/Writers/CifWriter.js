"use strict";
var Core = require('LiteMol-core');
var StringWriter_1 = require('./StringWriter');
var CifWriter = (function () {
    function CifWriter(header) {
        this.writer = new StringWriter_1.default();
        this.encoded = false;
        this.writer.write("data_" + (header || '').replace(/[ \n\t]/g, '').toUpperCase() + "\n#\n");
    }
    CifWriter.prototype.writeCategory = function (category, contexts) {
        if (this.encoded) {
            throw new Error('The writer contents have already been encoded, no more writing.');
        }
        var data = !contexts || !contexts.length ? [category(void 0)] : contexts.map(function (c) { return category(c); });
        data = data.filter(function (c) { return !!c || !!(c && (c.count === void 0 ? 1 : c.count)); });
        if (!data.length)
            return;
        var count = data.reduce(function (a, c) { return a + (c.count === void 0 ? 1 : c.count); }, 0);
        if (!count)
            return;
        else if (count === 1) {
            writeCifSingleRecord(data[0], this.writer);
        }
        else {
            writeCifLoop(data, this.writer);
        }
    };
    CifWriter.prototype.encode = function () {
        this.encoded = true;
    };
    CifWriter.prototype.flush = function (stream) {
        this.writer.writeTo(stream);
    };
    return CifWriter;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CifWriter;
function isMultiline(value) {
    return !!value && value.indexOf('\n') >= 0;
}
function writeCifSingleRecord(category, writer) {
    var fields = category.desc.fields;
    var data = category.data;
    var width = fields.reduce(function (w, s) { return Math.max(w, s.name.length); }, 0) + category.desc.name.length + 5;
    for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
        var f = fields_1[_i];
        writer.writePadRight(category.desc.name + "." + f.name, width);
        var presence = f.presence;
        var p = void 0;
        if (presence && (p = presence(data, 0)) !== 0 /* Present */) {
            if (p === 1 /* NotSpecified */)
                writeNotSpecified(writer);
            else
                writeUnknown(writer);
        }
        else {
            var val = f.string(data, 0);
            if (isMultiline(val)) {
                writeMultiline(writer, val);
                writer.newline();
            }
            else {
                writeChecked(writer, val);
            }
        }
        writer.newline();
    }
    writer.write('#\n');
}
function writeCifLoop(categories, writer) {
    writeLine(writer, 'loop_');
    var first = categories[0];
    var fields = first.desc.fields;
    for (var _i = 0, fields_2 = fields; _i < fields_2.length; _i++) {
        var f = fields_2[_i];
        writeLine(writer, first.desc.name + "." + f.name);
    }
    for (var _a = 0, categories_1 = categories; _a < categories_1.length; _a++) {
        var category = categories_1[_a];
        var data = category.data;
        var count = category.count;
        for (var i = 0; i < count; i++) {
            for (var _b = 0, fields_3 = fields; _b < fields_3.length; _b++) {
                var f = fields_3[_b];
                var presence = f.presence;
                var p = void 0;
                if (presence && (p = presence(data, i)) !== 0 /* Present */) {
                    if (p === 1 /* NotSpecified */)
                        writeNotSpecified(writer);
                    else
                        writeUnknown(writer);
                }
                else {
                    var val = f.string(data, i);
                    if (isMultiline(val)) {
                        writeMultiline(writer, val);
                        writer.newline();
                    }
                    else {
                        writeChecked(writer, val);
                    }
                }
            }
            writer.newline();
        }
    }
    writer.write('#\n');
}
function writeLine(writer, val) {
    writer.write(val);
    writer.newline();
}
function writeInteger(writer, val) {
    writer.writeSafe('' + val + ' ');
}
/**
    * eg writeFloat(123.2123, 100) -- 2 decim
    */
function writeFloat(writer, val, precisionMultiplier) {
    writer.writeSafe('' + Math.round(precisionMultiplier * val) / precisionMultiplier + ' ');
}
/**
    * Writes '. '
    */
function writeNotSpecified(writer) {
    writer.writeSafe('. ');
}
/**
    * Writes '? '
    */
function writeUnknown(writer) {
    writer.writeSafe('? ');
}
function writeChecked(writer, val) {
    if (!val) {
        writer.writeSafe('. ');
        return;
    }
    var escape = false, escapeCharStart = '\'', escapeCharEnd = '\' ';
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
}
function writeMultiline(writer, val) {
    writer.writeSafe('\n;' + val);
    writer.writeSafe('\n; ');
}
function writeToken(writer, data, start, end) {
    var escape = false, escapeCharStart = '\'', escapeCharEnd = '\' ';
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
}
