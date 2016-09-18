
import * as Core from 'LiteMol-core'
import BCIF = Core.Formats.CIF.Binary
import { Context, Writer, CategoryInstance, CategoryProvider, OutputStream, FieldDesc, Encoders } from './Context'
import ApiVersion from '../Api/Version'


export default class BCifWriter implements Writer {
    private data: BCIF.EncodedFile;
    private dataBlock: BCIF.EncodedDataBlock;
    private encodedData: Buffer;
    
    encodeField(field: FieldDesc<any>, data: { data: any, count: number }[], totalCount: number): BCIF.EncodedColumn {
        let array: any[], isNative = false;
        if (field.typedArray) {
            array = new field.typedArray(totalCount);
        } else {
            isNative = true;
            array = new Array(totalCount);
        }
        let mask = new Uint8Array(totalCount);
        let presence = field.presence;
        let getter = field.number ? field.number : field.string;
        let allPresent = true;

        let offset = 0;
        for (let _d of data) {
            let d = _d.data;
            for (let i = 0, _b = _d.count; i < _b; i++) {
                let p: Core.Formats.CIF.ValuePresence;
                if (presence && (p = presence(d, i)) !== Core.Formats.CIF.ValuePresence.Present) {
                    mask[offset] = p;
                    if (isNative) array[offset] = null;
                    allPresent = false;
                } else {
                    mask[offset] = Core.Formats.CIF.ValuePresence.Present;
                    array[offset] = getter(d, i);
                }
                offset++;
            }
        }
        let encoder = field.encoder ? field.encoder : Encoders.strings;
        let encoded = encoder.encode(array);
        
        let maskData: BCIF.EncodedData;// = null;

        if (!allPresent) {
            let maskRLE = BCIF.Encoder.by(BCIF.Encoder.runLength).and(BCIF.Encoder.int32).encode(mask);
            if (maskRLE.data.length < mask.length) {
                maskData = maskRLE;
            } else {
                maskData = BCIF.Encoder.by(BCIF.Encoder.uint8).encode(mask);
            }
        }

        //console.log(field.name, encoded.data.length, encoded.data instanceof Uint8Array);
        return {
            name: field.name,
            data: encoded,
            mask: maskData
        };
    }

    writeCategory(category: CategoryProvider, contexts?: Context[]) {
        //let perf = new Core.Utils.PerformanceMonitor();
        //perf.start('cat');
        if (!this.data) {
            throw new Error('The writer contents have already been encoded, no more writing.');
        }

        let categories = !contexts || !contexts.length ? [category(void 0)] : contexts.map(c => category(c));
        categories = categories.filter(c => !!c || !!(c && (c.count === void 0 ? 1 : c.count)));
        if (!categories.length) return;
        let count = categories.reduce((a, c) => a + (c.count === void 0 ? 1 : c.count), 0);
        if (!count) return;

        let first = categories[0];
        let cat: BCIF.EncodedCategory = { name: first.desc.name, columns: [], rowCount: count };
        let data = categories.map(c => ({ data: c.data, count: c.count === void 0 ? 1 : c.count }));
        for (let f of first.desc.fields) {
            cat.columns.push(this.encodeField(f, data, count));
        }
        this.dataBlock.categories.push(cat);
        //perf.end('cat');
        //console.log(first.desc.name, perf.formatTime('cat'));
    }

    encode() {
        let packed = Core.Formats.MessagePack.encode(this.data);
        this.encodedData = new Buffer(packed);
        this.data = null;
        this.dataBlock = null;
    }

    flush(stream: OutputStream) {
        stream.write(this.encodedData);
    }

    constructor(header: string) {
        this.dataBlock = {
            header: (header || '').replace(/[ \n\t]/g, '').toUpperCase(),
            categories: []
        };
        this.data = {
            encoder: `CoordinateServer ${ApiVersion}`,
            version: BCIF.VERSION,
            dataBlocks: [this.dataBlock]
        };
    }
}