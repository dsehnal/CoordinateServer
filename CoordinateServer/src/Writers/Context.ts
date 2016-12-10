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

import * as Core from 'LiteMol-core'
import { FilteredQueryParams } from '../Api/Queries'
import ApiVersion from '../Api/Version'
import * as Provider from '../Data/Provider'
import * as mmCif from './Formats/mmCif'
import CIF = Core.Formats.CIF

export function wrapStream(stream: { write: (data: any) => boolean }): CIF.OutputStream {
    return {
        writeBinary(data: Uint8Array) {
            return stream.write(new Buffer(data));
        },
        writeString(data: string) {
            return stream.write(data)
        }
    };
}

export interface Context {
    fragment: Core.Structure.Query.Fragment,
    model: Core.Structure.MoleculeModel,
    data: CIF.DataBlock
}

export type Formatter = (writer: CIF.Writer<Context>, config: FormatConfig, fs: WritableFragments[]) => void

export interface FormatConfig {
    queryType: string,
    data: CIF.DataBlock,
    params: FilteredQueryParams,
    includedCategories: string[]
}

export interface WritableFragments {
    model: Core.Structure.MoleculeModel;
    fragments: Core.Structure.Query.FragmentSeq
}

import E = Core.Formats.CIF.Binary.Encoder
export const Encoders = {
    strings: E.by(E.stringArray),
    coordinates1: E.by(E.fixedPoint(10)).and(E.delta).and(E.integerPacking),
    coordinates3: E.by(E.fixedPoint(1000)).and(E.delta).and(E.integerPacking),
    occupancy: E.by(E.fixedPoint(100)).and(E.delta).and(E.runLength).and(E.byteArray),
    ids: E.by(E.delta).and(E.runLength).and(E.integerPacking),
    int32: E.by(E.byteArray),
    float64: E.by(E.byteArray)
}

export function createParamsCategory(params: FilteredQueryParams): CIF.CategoryProvider {
    let prms: { name: string, value: any }[] = [];
    
    for (let p of Object.keys(params.query)) prms.push({ name: p, value: params.query[p] });
    prms.push({ name: 'atomSitesOnly', value: params.common.atomSitesOnly ? '1' : '0' });
    prms.push({ name: 'modelId', value: params.common.modelId });
    prms.push({ name: 'format', value: params.common.format });
    prms.push({ name: 'encoding', value: params.common.encoding });
    prms.push({ name: 'lowPrecisionCoords', value: params.common.lowPrecisionCoords });
    
    let data = prms;
    let fields: CIF.FieldDesc<typeof data>[] = [
        { name: 'name', string: (data, i) => data[i].name },
        { name: 'value', string: (data, i) => '' + data[i].value, presence: (data, i) => data[i].value !== void 0 && data[i].value !== null ? CIF.ValuePresence.Present : CIF.ValuePresence.NotSpecified },
    ];

    return () => <CIF.CategoryInstance<typeof data>>{
        data,
        count: data.length,
        desc: {
            name: '_coordinate_server_query_params',
            fields
        }
    };
}

export function createResultHeaderCategory({ isEmpty, hasError }: { isEmpty: boolean, hasError: boolean }, queryType: string = '?') {
    let data = {
        isEmpty,
        hasError,
        queryType,
        ApiVersion,
        CoreVersion: Core.VERSION.number
    };

    let fields: CIF.FieldDesc<typeof data>[] = [
        { name: 'query_type', string: d => d.queryType },
        { name: 'datetime', string: d => `${new Date().toLocaleString('en-US')}` },
        { name: 'is_empty', string: d => d.isEmpty ? 'yes' : 'no' },
        { name: 'has_error', string: d => d.hasError ? 'yes' : 'no' },
        { name: 'api_version', string: d => d.ApiVersion },
        { name: 'core_version', string: d => d.CoreVersion }
    ];

    return () => <CIF.CategoryInstance<typeof data>>{
        data,
        count: 1,
        desc: {
            name: '_coordinate_server_result',
            fields
        }
    };
}

export function createErrorCategory(message: string) {  
    let data = message;
    let fields: CIF.FieldDesc<string>[] = [
        { name: 'message', string: data => data }
    ];

    return () => <Core.Formats.CIF.CategoryInstance<typeof data>>{
        data,
        count: 1,
        desc: {
            name: '_coordinate_server_error',
            fields
        }
    };
}

export function createStatsCategory(molecule: Provider.MoleculeWrapper, queryTime: number, formatTime: number) {
    let data = { cached: molecule.source === Provider.MoleculeSource.Cache ? 'yes' : 'no', io: molecule.ioTime | 0, parse: molecule.parseTime | 0, query: queryTime | 0, format: formatTime | 0 };
    let fields: CIF.FieldDesc<typeof data>[] = [
        { name: 'molecule_cached', string: data => data.cached },
        { name: 'io_time_ms', string: data => `${data.io}`, number: data => data.io, typedArray: Int32Array, encoder: E.by(E.byteArray) },
        { name: 'parse_time_ms', string: data => `${data.parse}`, number: data => data.parse, typedArray: Int32Array, encoder: E.by(E.byteArray) },
        { name: 'query_time_ms', string: data => `${data.query}`, number: data => data.query, typedArray: Int32Array, encoder: E.by(E.byteArray) },
        { name: 'format_time_ms', string: data => `${data.format}`, number: data => data.format, typedArray: Int32Array, encoder: E.by(E.byteArray) }
    ];

    return () => <CIF.CategoryInstance<typeof data>>{
        data,
        count: 1,
        desc: {
            name: '_coordinate_server_stats',
            fields
        }
    };
}

export function createWriter(encoding: string, header: string): CIF.Writer<Context> {
    let isBCif = (encoding || '').trim().toLowerCase() === 'bcif';
    let w = isBCif
        ? new CIF.Binary.Writer<Context>(`CoordinateServer ${ApiVersion}`)
        : new CIF.Text.Writer<Context>();
    w.startDataBlock(header);
    return w;
}

export function writeError(stream: CIF.OutputStream, encoding: string, header: string, message: string, optional?: { params?: FilteredQueryParams, queryType?: string }) {
    let w = createWriter(encoding, header);
    optional = optional || {};
    let headerCat = createResultHeaderCategory({ isEmpty: true, hasError: true }, optional.queryType);
    w.writeCategory(headerCat);

    if (optional.params) {
        let pCat = createParamsCategory(optional.params);
        w.writeCategory(pCat);
    }

    let errorCat = createErrorCategory(message);
    w.writeCategory(errorCat);
    w.flush(stream);
}

export function getFormatter(format: string) {
    return mmCif.format //(format || '').toLowerCase().trim() === 'o-mmcif' ? OptimizedMmCif.format : mmCif.format;
}