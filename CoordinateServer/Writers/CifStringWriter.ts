
import StringWriter from './StringWriter'

export default class CifStringWriter {

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