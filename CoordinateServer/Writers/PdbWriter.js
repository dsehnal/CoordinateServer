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
var Core = require('LiteMol-core');
var Cif = Core.Formats.Cif;
var PdbStringWriter = (function () {
    function PdbStringWriter() {
        this.data = [];
        this.count = 0;
    }
    PdbStringWriter.prototype.write = function (val) {
        this.data[this.count++] = val;
    };
    PdbStringWriter.prototype.asString = function () {
        return this.data.join('');
    };
    PdbStringWriter.prototype.writeInteger = function (val) {
        this.write('' + val + ' ');
    };
    /*
     * eg writeFloat(123.2123, 100) -- 2 decim
     */
    PdbStringWriter.prototype.writeFloat = function (val, precisionMultiplier) {
        this.write('' + Math.round(precisionMultiplier * val) / precisionMultiplier + ' ');
    };
    PdbStringWriter.prototype.writeChecked = function (val) {
        var escape = false, escapeCharStart = '\'', escapeCharEnd = '\' ';
        for (var i = 0, _l = val.length - 1; i < _l; i++) {
            var c = val.charCodeAt(i);
            switch (c) {
                case 10:
                    this.write('\n;' + val);
                    this.write('\n; ');
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
        if (!escape && val.charCodeAt(0) === 59 /* ; */) {
            escapeCharStart = '\'';
            escapeCharEnd = '\' ';
            escape = true;
        }
        if (escape) {
            this.write(escapeCharStart + val + escapeCharStart);
        }
        else {
            this.write(val + ' ');
        }
    };
    PdbStringWriter.prototype.writeToken = function (data, start, end) {
        var escape = false, escapeCharStart = '\'', escapeCharEnd = '\' ';
        for (var i = start; i < end - 1; i++) {
            var c = data.charCodeAt(i);
            switch (c) {
                case 10:
                    this.write('\n;' + data.substring(start, end));
                    this.write('\n; ');
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
            this.write(escapeCharStart + data.substring(start, end) + escapeCharStart);
        }
        else {
            this.write(data.substring(start, end) + ' ');
        }
    };
    return PdbStringWriter;
}());
function padString(str, len, pad, dir) {
    var padlen = 0;
    if (len + 1 >= str.length) {
        switch (dir) {
            case 0 /* Left */:
                str = Array(len + 1 - str.length).join(pad) + str;
                break;
            case 2 /* Both */:
                var right = Math.ceil((padlen = len - str.length) / 2);
                var left = padlen - right;
                str = Array(left + 1).join(pad) + str + Array(right + 1).join(pad);
                break;
            default:
                str = str + Array(len + 1 - str.length).join(pad);
                break;
        } // switch
    }
    return str;
}
var AtomSiteWriterColumn = (function () {
    function AtomSiteWriterColumn(column, padding, paddingDir, formatter) {
        this.column = column;
        this.padding = padding;
        this.paddingDir = paddingDir;
        this.formatter = formatter;
    }
    AtomSiteWriterColumn.prototype.getValue = function (i) {
        var v = this.formatter(i, this.column);
        return padString(v !== undefined ? v : '', this.padding, ' ', this.paddingDir);
    };
    return AtomSiteWriterColumn;
}());
var PdbWriter = (function () {
    function PdbWriter() {
    }
    PdbWriter.prototype.writeFake350 = function (data, writer) {
        var mol = Cif.mmCif.ofDataBlock(data), sym = mol.models[0].symmetryInfo;
        for (var i = 0; i < 4; i++) {
            writer.write("REMARK 350    ");
            for (var j = 0; j < 4; j++) {
                writer.write(sym.toFracTransform[4 * i + j].toFixed(6) + " ");
            }
            writer.write("\n");
        }
    };
    PdbWriter.prototype.write = function (data) {
        var sites = data.getCategory("_atom_site");
        var columns = [
            ['group_PDB', 6, 1 /* Right */, function (i, c) { return c.getString(i); }],
            ['id', 8, 0 /* Left */, function (i, c) { return c.getInteger(i).toString(); }],
            ['label_atom_id', 6, 2 /* Both */, function (i, c) { return c.getString(i); }],
            ['label_comp_id', 4, 0 /* Left */, function (i, c) { return c.getString(i); }],
            ['label_seq_id', 8, 0 /* Left */, function (i, c) { return c.getInteger(i).toString(); }],
            ['label_asym_id', 4, 0 /* Left */, function (i, c) { return c.getString(i); }],
            ['Cartn_x', 10, 0 /* Left */, function (i, c) { return c.getFloat(i).toFixed(4); }],
            ['Cartn_y', 10, 0 /* Left */, function (i, c) { return c.getFloat(i).toFixed(4); }],
            ['Cartn_z', 10, 0 /* Left */, function (i, c) { return c.getFloat(i).toFixed(4); }],
            ['occupancy_esd', 8, 0 /* Left */, function (i, c) { return c.getFloat(i).toFixed(2); }],
            ['pdbx_formal_charge', 8, 0 /* Left */, function (i, c) { return c.getFloat(i).toFixed(2); }],
            ['type_symbol', 2, 0 /* Left */, function (i, c) { return c.getString(i); }]
        ].map(function (c) { return new AtomSiteWriterColumn(sites.columns[c[0]], c[1], c[2], c[3]); });
        var writer = new PdbStringWriter();
        this.writeFake350(data, writer);
        for (var i = 0, _l = sites.rowCount; i < _l; i++) {
            var line = "";
            for (var _i = 0, columns_1 = columns; _i < columns_1.length; _i++) {
                var c = columns_1[_i];
                line += c.getValue(i);
            }
            line += '\n';
            writer.write(line);
        }
        return writer.asString();
    };
    return PdbWriter;
}());
exports.PdbWriter = PdbWriter;
