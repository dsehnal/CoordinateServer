
import * as Core from 'LiteMol-core'
import { Context, Writer, CategoryInstance, CategoryProvider, OutputStream, FieldDesc, Encoders } from './Context'


export default class BCifWriter implements Writer {
    private data: any = {};
    private totalLength = 0;

    encodeField(field: FieldDesc<any>, data: any, count: number) {
        let array: any[];
        if (field.typedArray) {
            array = new field.typedArray(count);
        } else {
            array = [];
        }
        let getter = field.number ? field.number : field.string;
        for (let i = 0; i < count; i++) {
            array[i] = getter(data, i);
        }
        let encoder = field.encoder ? field.encoder : Encoders.strings;
        let encoded = encoder.encode(array);

        console.log(field.name, encoded.data.length, encoded.data instanceof Uint8Array);
        this.totalLength += encoded.data.length;
        return encoded;
    }

    writeCategory(category: CategoryProvider, context?: Context) {
        let data = category(context);
        if (!data) return;
        let count = data.count === void 0 ? 1 : data.count;
        if (count === 0) return;

        let cat: any = {};
        for (let f of data.desc.fields) {
            cat[f.name] = this.encodeField(f, data.data, count);
        }
        this.data[data.desc.name] = cat;
    }

    serialize(stream: OutputStream) {
        //console.log(this.data);
        let packed = Core.Formats.MsgPack.encode(this.data);
        //console.log('packed', packed.length, packed.byteLength, this.totalLength, (Uint8Array as any).BYTES_PER_ELEMENT);
        let buffer = new Buffer(packed);

        //console.log(this.data);

        stream.write(buffer);
    }

    constructor(header: string) {
        this.data.data_ = (header || '').replace(/[ \n\t]/g, '').toUpperCase();
    }
}