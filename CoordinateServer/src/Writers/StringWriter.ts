
const __paddingSpaces: string[] = [];
(function () {
    let s = '';
    for (let i = 0; i < 512; i++) {
        __paddingSpaces[i] = s;
        s = s + ' ';
    }
})();

export default class StringWriter {
    private chunkData: string[] = [];
    private chunkOffset = 0;

    data: string[] = [];
    
    constructor(private chunkCapacity = 512) {
                        
    }
    
    asString() {
        if (!this.data.length) {
            if (this.chunkData.length === this.chunkOffset) return this.chunkData.join('');
            return this.chunkData.splice(0, this.chunkOffset).join('');
        }

        if (this.chunkOffset > 0) {
            this.data[this.data.length] = this.chunkData.splice(0, this.chunkOffset).join('');
        }

        return this.data.join('');
    }

    writeTo(stream: { write: (str: string) => boolean }) {

        this.finalize();

        for (let s of this.data) {
            stream.write(s);
        }
    }

    finalize() {
        if (this.chunkOffset > 0) {
            if (this.chunkData.length === this.chunkOffset) this.data[this.data.length] = this.chunkData.join('');
            else this.data[this.data.length] = this.chunkData.splice(0, this.chunkOffset).join('');
            this.chunkOffset = 0;
        }
    }

    newline() {
        this.write('\n');
    }

    whitespace(len: number) {
        this.write(__paddingSpaces[len]);
    }
    
    appendWriter(w: StringWriter) {
        if (this.chunkOffset > 0) {
            this.data[this.data.length] = this.chunkData.splice(0, this.chunkOffset).join('');
            this.chunkOffset = 0;
        }

        for (let ch of w.data) {
            this.data[this.data.length] = ch;
        }

        if (w.chunkOffset > 0) {
            this.data[this.data.length] = w.chunkData.splice(0, w.chunkOffset).join('');
        }
    }

    write(val: string) {
        if (val === undefined || val === null) {
            return;
        }

        if (this.chunkOffset === this.chunkCapacity) {
            this.data[this.data.length] = this.chunkData.join('');
            this.chunkOffset = 0;
        }

        this.chunkData[this.chunkOffset++] = val;
    }

    writeSafe(val: string) {
        if (this.chunkOffset === this.chunkCapacity) {
            this.data[this.data.length] = this.chunkData.join('');
            this.chunkOffset = 0;
        }

        this.chunkData[this.chunkOffset++] = val;
    }

    writePadLeft(val: string, totalWidth: number) {
        if (val === undefined || val === null) {
            this.write(__paddingSpaces[totalWidth]);
        }

        let padding = totalWidth - val.length;
        if (padding > 0) this.write(__paddingSpaces[padding]);
        this.write(val);
    }

    writePadRight(val: string, totalWidth: number) {
        if (val === undefined || val === null) {
            this.write(__paddingSpaces[totalWidth]);
        }

        let padding = totalWidth - val.length;
        this.write(val);
        if (padding > 0) this.write(__paddingSpaces[padding]);
    }
    

    writeInteger(val: number) {
        this.write('' + val);
    }

    writeIntegerPadLeft(val: number, totalWidth: number) {
        let s = '' + val;
        let padding = totalWidth - s.length;
        if (padding > 0) this.write(__paddingSpaces[padding]);
        this.write(s);
    }

    writeIntegerPadRight(val: number, totalWidth: number) {
        let s = '' + val;
        let padding = totalWidth - s.length;
        this.write(s);
        if (padding > 0) this.write(__paddingSpaces[padding]);
    }
    
    /**
     * @example writeFloat(123.2123, 100) -- 2 decim
     */
    writeFloat(val: number, precisionMultiplier: number) {
        this.write('' + Math.round(precisionMultiplier * val) / precisionMultiplier)
    }

    writeFloatPadLeft(val: number, precisionMultiplier: number, totalWidth: number) {
        let s = '' + Math.round(precisionMultiplier * val) / precisionMultiplier;
        let padding = totalWidth - s.length;
        if (padding > 0) this.write(__paddingSpaces[padding]);
        this.write(s);
    }

    writeFloatPadRight(val: number, precisionMultiplier: number, totalWidth: number) {
        let s = '' + Math.round(precisionMultiplier * val) / precisionMultiplier;
        let padding = totalWidth - s.length;
        this.write(s);
        if (padding > 0) this.write(__paddingSpaces[padding]);
    }  
}