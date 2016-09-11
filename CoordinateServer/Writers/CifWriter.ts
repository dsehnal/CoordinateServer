import StringWriter from './StringWriter'
import { Context, Writer, CategoryInstance, CategoryProvider, OutputStream } from './Context'

function isMultiline(value: string) {
    return !!value && value.indexOf('\n') >= 0;
}

function writeCifSingleRecord(category: CategoryInstance<any>, writer: CifStringWriter) {
    let fields = category.desc.fields;
    let data = category.data;
    let width = fields.reduce((w, s) => Math.max(w, s.name.length), 0) + category.desc.name.length + 5;

    for (let f of fields) {
        writer.writer.writePadRight(`${category.desc.name}.${f.name}`, width);
        let val = f.string(data, 0);
        if (isMultiline(val)) {
            writer.writeMultiline(val);
            writer.writer.newline();
        } else {
            writer.writeChecked(val);
        }
        writer.writer.newline();
    }
    writer.write('#\n');
}

function writeCifLoop(categories: CategoryInstance<any>[], writer: CifStringWriter) {
    writer.writeLine('loop_');

    let first = categories[0];
    let fields = first.desc.fields;
    for (let f of fields) {
        writer.writeLine(`${first.desc.name}.${f.name}`);
    }

    for (let category of categories) {
        let data = category.data;
        let count = category.count;
        for (let i = 0; i < count; i++) {
            for (let f of fields) {
                let val = f.string(data, i);
                if (isMultiline(val)) {
                    writer.writeMultiline(val);
                    writer.writer.newline();
                } else {
                    writer.writeChecked(val);
                }
            }
            writer.newline();
        }
    }
    writer.write('#\n');
}

export default class CifWriter implements Writer {
    private writer = new CifStringWriter();

    writeCategory(category: CategoryProvider, contexts?: Context[]) {
        let data = !contexts || !contexts.length ? [category(void 0)] : contexts.map(c => category(c));
        data = data.filter(c => !!c || !!(c && (c.count === void 0 ? 1 : c.count)));
        if (!data.length) return;
        let count = data.reduce((a, c) => a + (c.count === void 0 ? 1 : c.count), 0);        
        if (!count) return;

        else if (count === 1) {
            writeCifSingleRecord(data[0], this.writer);
        } else {
            writeCifLoop(data, this.writer);
        }
    }

    serialize(stream: OutputStream) {
        this.writer.writer.writeTo(stream);
    }

    constructor(header: string) {
        this.writer.write(`data_${(header || '').replace(/[ \n\t]/g, '').toUpperCase()}\n#\n`);
    }
}

class CifStringWriter {

    writer = new StringWriter();

    newline() {
        this.writer.newline();
    }

    write(val: string) {
        this.writer.write(val);
    }

    writeLine(val: string) {
        this.writer.write(val);
        this.writer.newline();
    }

    writeInteger(val: number) {
        this.writer.writeSafe('' + val + ' ');
    }

    /*
     * eg writeFloat(123.2123, 100) -- 2 decim
     */
    writeFloat(val: number, precisionMultiplier: number) {
        this.writer.writeSafe('' + Math.round(precisionMultiplier * val) / precisionMultiplier + ' ')
    }

    writeChecked(val: string) {

        if (!val) {
            this.writer.writeSafe('. ');
            return;
        }

        let escape = false, escapeCharStart = '\'', escapeCharEnd = '\' ';
        let writer = this.writer;
        let whitespace = false;
        let hasSingle = false;
        let hasDouble = false;
        for (let i = 0, _l = val.length - 1; i < _l; i++) {
            let c = val.charCodeAt(i);

            switch (c) {
                case 9: whitespace = true; break; // \t
                case 10: // \n
                    writer.writeSafe('\n;' + val);
                    writer.writeSafe('\n; ')
                    return;
                case 32: whitespace = true; break; // ' '
                case 34: // "
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
                case 39: // '
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
        } else {
            writer.write(val);
            writer.writeSafe(' ');
        }
    }

    writeMultiline(val: string) {

        this.writer.writeSafe('\n;' + val);
        this.writer.writeSafe('\n; ');
    }

    writeToken(data: string, start: number, end: number) {

        let escape = false, escapeCharStart = '\'', escapeCharEnd = '\' ';
        let writer = this.writer;
        for (let i = start; i < end - 1; i++) {
            let c = data.charCodeAt(i);

            switch (c) {
                case 10: // \n
                    writer.writeSafe('\n;' + data.substring(start, end));
                    writer.writeSafe('\n; ')
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
            writer.writeSafe(escapeCharStart + data.substring(start, end));
            writer.writeSafe(escapeCharStart);
        } else {
            writer.write(data.substring(start, end));
            writer.writeSafe(' ');
        }
    }
}