
import * as Core from 'LiteMol-core'
import { Context, Writer, CategoryInstance, CategoryProvider, OutputStream, FieldDesc, Encoders } from './Context'


export default class BCifWriter implements Writer {
    private data: any = {};
    private totalLength = 0;

    encodeField(field: FieldDesc<any>, data: { data: any, count: number }[], totalCount: number) {
        let array: any[];
        if (field.typedArray) {
            array = new field.typedArray(totalCount);
        } else {
            array = [];
        }
        let getter = field.number ? field.number : field.string;

        let offset = 0;
        for (let _d of data) {
            let d = _d.data;
            for (let i = 0, _b = _d.count; i < _b; i++) {
                array[offset++] = getter(d, i);
            }
        }
        let encoder = field.encoder ? field.encoder : Encoders.strings;
        let encoded = encoder.encode(array);

        //console.log(field.name, encoded.data.length, encoded.data instanceof Uint8Array);
        this.totalLength += encoded.data.length;
        return encoded;
    }

    writeCategory(category: CategoryProvider, contexts?: Context[]) {
        let categories = !contexts || !contexts.length ? [category(void 0)] : contexts.map(c => category(c));
        categories = categories.filter(c => !!c || !!(c && (c.count === void 0 ? 1 : c.count)));
        if (!categories.length) return;
        let count = categories.reduce((a, c) => a + (c.count === void 0 ? 1 : c.count), 0);
        if (!count) return;

        let first = categories[0];
        let cat: any = {};
        let data = categories.map(c => ({ data: c.data, count: c.count === void 0 ? 1 : c.count }));
        for (let f of first.desc.fields) {
            cat[f.name] = this.encodeField(f, data, count);
        }
        this.data[first.desc.name] = cat;
    }

    serialize(stream: OutputStream) {
        //console.log(this.data);
        let packed = Core.Formats.MessagePack.encode(this.data);
        //console.log('packed', packed.length, packed.byteLength, this.totalLength, (Uint8Array as any).BYTES_PER_ELEMENT);
        let buffer = new Buffer(packed);

        //console.log(this.data);

        stream.write(buffer);
    }

    constructor(header: string) {
        this.data.data_ = (header || '').replace(/[ \n\t]/g, '').toUpperCase();
    }
}