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

import * as Core from 'LiteMol-core';

import Cif = Core.Formats.Cif;

class PdbStringWriter {

    private data: string[] = [];
    private count = 0;

    write(val: string) {
        this.data[this.count++] = val;
    }

    asString() {
        return this.data.join('');
    }

    writeInteger(val: number) {
        this.write('' + val + ' ');
    }

    /*
     * eg writeFloat(123.2123, 100) -- 2 decim
     */
    writeFloat(val: number, precisionMultiplier: number) {
        this.write('' + Math.round(precisionMultiplier * val) / precisionMultiplier + ' ')
    }

    writeChecked(val: string) {

        var escape = false, escapeCharStart = '\'', escapeCharEnd = '\' ';
        for (let i = 0, _l = val.length - 1; i < _l; i++) {
            let c = val.charCodeAt(i);

            switch (c) {
                case 10: // \n
                    this.write('\n;' + val);
                    this.write('\n; ')
                    return;
                case 34: // "
                    escape = true;
                    escapeCharStart = '\'';
                    escapeCharEnd = '\' ';
                    break;
                case 39: // '
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
        } else {
            this.write(val + ' ');
        }
    }

    writeToken(data: string, start: number, end: number) {

        var escape = false, escapeCharStart = '\'', escapeCharEnd = '\' ';
        for (let i = start; i < end - 1; i++) {
            let c = data.charCodeAt(i);

            switch (c) {
                case 10: // \n
                    this.write('\n;' + data.substring(start, end));
                    this.write('\n; ')
                    return;
                case 34: // "
                    escape = true;
                    escapeCharStart = '\'';
                    escapeCharEnd = '\' ';
                    break;
                case 39: // '
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
        } else {
            this.write(data.substring(start, end) + ' ');
        }
    }
}

const enum PadDirection {
    Left,
    Right,
    Both
}

function padString(str: string, len: number, pad: string, dir: PadDirection) {

    var padlen = 0;
    if (len + 1 >= str.length) {

        switch (dir) {

            case PadDirection.Left:
                str = Array(len + 1 - str.length).join(pad) + str;
                break;

            case PadDirection.Both:
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

class AtomSiteWriterColumn {

    getValue(i: number) {
        var v = this.formatter(i, this.column);
        return padString(v !== undefined ? v : '', this.padding, ' ', this.paddingDir);
    }

    constructor(
        private column: Cif.Column,
        private padding: number,
        private paddingDir: PadDirection,
        private formatter: (i: number, c: Cif.Column) => string) {
    }

}

export class PdbWriter {

    private writeFake350(data: Cif.Block, writer: PdbStringWriter) {

        var mol = Cif.mmCif.ofDataBlock(data),
            sym = mol.models[0].symmetryInfo;

        for (let i = 0; i < 4; i++) {
            writer.write("REMARK 350    ");
            for (let j = 0; j < 4; j++) {
                writer.write(sym.toFracTransform[4 * i + j].toFixed(6) + " ");
            }
            writer.write("\n");
        }

    }

    write(data: Cif.Block): string {

        var sites = data.getCategory("_atom_site");

        var columns = [
            ['group_PDB', 6, PadDirection.Right, (i: any, c: any) => c.getString(i)],
            ['id', 8, PadDirection.Left, (i: any, c: any) => c.getInteger(i).toString()],
            ['label_atom_id', 6, PadDirection.Both, (i: any, c: any) => c.getString(i)],
            ['label_comp_id', 4, PadDirection.Left, (i: any, c: any) => c.getString(i)],
            ['label_seq_id', 8, PadDirection.Left, (i: any, c: any) => c.getInteger(i).toString()],
            ['label_asym_id', 4, PadDirection.Left, (i: any, c: any) => c.getString(i)],
            ['Cartn_x', 10, PadDirection.Left, (i: any, c: any) => c.getFloat(i).toFixed(4)],
            ['Cartn_y', 10, PadDirection.Left, (i: any, c: any) => c.getFloat(i).toFixed(4)],
            ['Cartn_z', 10, PadDirection.Left, (i: any, c: any) => c.getFloat(i).toFixed(4)],
            ['occupancy_esd', 8, PadDirection.Left, (i: any, c: any) => c.getFloat(i).toFixed(2)],
            ['pdbx_formal_charge', 8, PadDirection.Left, (i: any, c: any) => c.getFloat(i).toFixed(2)],
            ['type_symbol', 2, PadDirection.Left, (i: any, c: any) => c.getString(i)]
        ].map(c => new AtomSiteWriterColumn(sites.columns[<any>c[0]], <any>c[1], <any>c[2], <any>c[3]));

        var writer = new PdbStringWriter();

        this.writeFake350(data, writer);

        for (let i = 0, _l = sites.rowCount; i < _l; i++) {

            let line = "";
            for (let c of columns) {
                line += c.getValue(i);
            }
            line += '\n';
            writer.write(line);
        }


        return writer.asString();
    }
}