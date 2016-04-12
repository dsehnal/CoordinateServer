//import * as Core from 'LiteMol-core';
//import StringWriter from './StringWriter'
//import Cif = Core.Formats.Cif;
//const enum ColumnType {
//    String,
//    Number
//}
//const __numberRegEx = /^[-]?[1-9][0-9]*\.?[0-9]*?$/;
//export default class PDBcifWriter {
//    private maxInlineStringLength = 80;
//    private stringTableMaxLineLength = 80;
//    private writer = new StringWriter();
//    private stringTable = new Map<string, number>();
//    private stringTableEntryWidth = 0;
//    private stringTableMaxLineWidth = 0;
//    private categoryMaxLineWidth = 0;
//    private getColumnType(category: Cif.Category, col: number) {
//        return __numberRegEx.test(category.getRawValueFromIndex(col, 0)) ? ColumnType.Number : ColumnType.String;
//    }
//    private addStringTableEntry(val: string) {
//        this.stringTable.set(val, 0);
//    }
//    private makeStringTable() {
//        for (let cat of this.data.categoryList) {
//            for (let col of cat.columnArray) {
//                let colIndex = col.index;
//                if (this.getColumnType(cat, colIndex) !== ColumnType.String) continue;
//                for (let i = 0, _b = cat.rowCount; i < _b; i++) {
//                    if (cat.getTokenLengthFromIndex(colIndex, i) > this.maxInlineStringLength) {
//                        this.addStringTableEntry(cat.getRawValueFromIndex(colIndex, i));
//                    }
//                }
//            }
//        }
//        this.stringTableEntryWidth = this.stringTable.size.toString().length + 1;
//    }
//    private writeStringTableEntry(data: string, writer: StringWriter) {
//        writer.reset();
//        let width = 0;
//        let lineCount = 0;
//        let charCount = 0;
//        let lines = data.split('\n');
//        for (let l of lines) {
//            if (l.length <= this.stringTableMaxLineLength) {
//                writer.write('$ ');
//                writer.write(l);
//                writer.newline();
//                lineCount++;
//                charCount += l.length;
//                if (l.length > width) width = l.length;
//            } else {
//                while (l.length > this.stringTableMaxLineLength) {
//                    writer.write('$ ');
//                    writer.write(l.substr(0, this.stringTableMaxLineLength));
//                    charCount += this.stringTableMaxLineLength;
//                    writer.write('~');
//                    writer.newline();
//                    lineCount++;
//                    l = l.substr(this.stringTableMaxLineLength);
//                    if (this.stringTableMaxLineLength + 1 > width) width = this.stringTableMaxLineLength + 1;
//                }
//                if (l.length) {
//                    writer.write('$ ');
//                    writer.write(l);
//                    writer.newline();
//                    lineCount++;
//                    charCount += l.length;
//                }
//            }
//        }
//        width += 2;
//        return { width, lineCount, charCount }
//    }
//    private writeStringTable() {
//        this.writer.write('STRTBL ');
//        this.writer.writeIntegerPadLeft(this.stringTable.size, 10);
//        this.writer.newline();
//        let offset = 0;
//        let width = 0;
//        let entryWriter = new StringWriter();
//        this.stringTable.forEach((i: number, s: string) => {
//            this.stringTable.set(s, offset++);
//            let e = this.writeStringTableEntry(s, entryWriter);
//            this.writer.write('STRE  ');
//            this.writer.writeIntegerPadLeft(offset, 10);
//            this.writer.write(' ');
//            this.writer.writeIntegerPadLeft(e.charCount, 6);
//            this.writer.write(' ');
//            this.writer.writeIntegerPadLeft(e.lineCount, 6);
//            this.writer.newline();
//            this.writer.write(entryWriter.asString());
//            width = Math.max(width, e.width);            
//        });
//        this.stringTableMaxLineWidth = Math.max(width, 17);
//    }
//    private getColumnInfo(cat: Cif.Category, col: Cif.Column) {
//        let colIndex = col.index;
//        let type = this.getColumnType(cat, colIndex);
//        let maxLen = 0;
//        if (type === ColumnType.String) {
//            for (let i = 0, _b = cat.rowCount; i < _b; i++) {
//                let len = cat.getTokenLengthFromIndex(colIndex, i);
//                if (len > this.maxInlineStringLength) {
//                    if (len < this.stringTableEntryWidth) {
//                        maxLen = this.stringTableEntryWidth;
//                    }
//                } else if (len > maxLen) {
//                    maxLen = len;
//                }
//            }
//        } else {
//            for (let i = 0, _b = cat.rowCount; i < _b; i++) {
//                let len = cat.getTokenLengthFromIndex(colIndex, i);
//                if (len > maxLen) {
//                    maxLen = len;
//                }
//            }
//        }
//        return { col, type, width: maxLen, index: col.index };
//    }
//    private writeCategory(cat: Cif.Category) {
//        this.writer.newline();
//        let spec = cat.columnArray.map(c => this.getColumnInfo(cat, c));
//        let width = spec.reduce((w: number, c: any) => w + c.width, 0) + spec.length;
//        this.writer.write('CAT   ');
//        this.writer.writeIntegerPadLeft(cat.columnCount, 3); 
//        this.writer.write(' ');
//        this.writer.writeIntegerPadLeft(cat.rowCount, 10);
//        this.writer.write(' ');
//        this.writer.writeIntegerPadLeft(cat.name.length, 2);
//        this.writer.write(' ');
//        this.writer.write(cat.name);
//        this.writer.newline();
//        let offset = 0;
//        for (let c of spec) {
//            this.writer.write('COL   ');
//            this.writer.writeIntegerPadLeft(offset, 3);
//            this.writer.write(' ');
//            this.writer.writeIntegerPadLeft(c.width, 3);
//            this.writer.write(' ');
//            this.writer.writeIntegerPadLeft(c.col.name.length, 2);
//            this.writer.write(' ');
//            this.writer.write(c.col.name);
//            this.writer.newline();
//            offset += c.width + 1;
//        }
//        for (let i = 0, _b = cat.rowCount; i < _b; i++) {
//            for (let c of spec) {
//                if (c.type === ColumnType.Number) {
//                    this.writer.writePadLeft(c.col.getRaw(i), c.width);
//                } else {
//                    let len = cat.getTokenLengthFromIndex(c.index, i);
//                    if (len <= this.maxInlineStringLength) {
//                        this.writer.writePadRight(c.col.getRaw(i), c.width);
//                    } else {
//                        this.writer.writePadRight('$' + this.stringTable.get(c.col.getRaw(i)), c.width);
//                    }
//                }
//                this.writer.write(' ');
//            }
//            this.writer.newline();
//        }
//        this.categoryMaxLineWidth = Math.max(this.categoryMaxLineWidth, width);
//    }
//    write() {
//        this.makeStringTable();
//        this.writeStringTable();
//        let table = this.writer.asString();
//        this.writer.reset();
//        let includedCats = [
//            '_entry',
//            '_entity',
//            '_struct_conf',
//            '_struct_sheet_range',
//            '_pdbx_struct_assembly',
//            '_pdbx_struct_assembly_gen',
//            '_pdbx_struct_oper_list',
//            '_cell',
//            '_symmetry',
//            '_atom_sites',
//            '_atom_site'
//        ];
//        for (let c of this.data.categoryList) {
//            if (includedCats.indexOf(c.name) < 0) continue;
//            this.writeCategory(c);
//        }
//        let cats = this.writer.asString();
//        this.writer = new 
//        this.writer.write('DATA  ');
//        this.writer.writeIntegerPadLeft(Math.max(this.stringTableMaxLineWidth, this.categoryMaxLineWidth), 3);
//        this.writer.write(' ');
//        this.writer.writeIntegerPadLeft(this.data.header.length, 2);
//        this.writer.write(' ');
//        this.writer.write(this.data.header);
//        this.writer.newline();
//        this.writer.write(table);
//        this.writer.write(cats);
//        return this.writer.asString();
//    }
//    constructor(private data: Cif.Block) {
//    }
//} 
