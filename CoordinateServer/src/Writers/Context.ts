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
import CifWriter from './CifWriter'
import BCifWriter from './BCifWriter'
import * as Provider from '../Data/Provider'
import * as mmCif from './Formats/mmCif'
//import * as OptimizedMmCif from './Formats/OptimizedMmCif'
import CIF = Core.Formats.CIF

export interface FieldDesc<Data> {
    name: string,
    string?: (data: Data, i: number) => string,
    number?: (data: Data, i: number) => number,
    typedArray?: any,
    encoder?: Core.Formats.CIF.Binary.Encoder,
    presence?: (data: Data, i: number) => CIF.ValuePresence
}

export interface CategoryDesc<Data> {
    name: string, 
    fields: FieldDesc<Data>[]
}

export type CategoryInstance<Data> = { data?: any, count?: number, desc: CategoryDesc<Data> }
export type CategoryProvider = (ctx: Context) => CategoryInstance<any>

export interface Context {
    fragment: Core.Structure.Query.Fragment,
    model: Core.Structure.MoleculeModel,
    data: CIF.DataBlock
}

export type OutputStream = { write: (data: any) => boolean }

export interface Writer {
    writeCategory(category: CategoryProvider, contexts?: Context[]): void,
    encode(): void;
    flush(stream: OutputStream): void
}

export type Formatter = (writer: Writer, config: FormatConfig, fs: WritableFragments[]) => void

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
    coordinates1: E.by(E.fixedPoint(10)).and(E.delta).and(E.integerPacking(1)).and(E.int8),
    coordinates3: E.by(E.fixedPoint(1000)).and(E.delta).and(E.integerPacking(2)).and(E.int16),
    occupancy: E.by(E.fixedPoint(100)).and(E.delta).and(E.runLength).and(E.int32),
    ids: E.by(E.delta).and(E.runLength).and(E.integerPacking(1)).and(E.int8),
    int32: E.by(E.int32),
    float64: E.by(E.float64)
}

export function createParamsCategory(params: FilteredQueryParams): CategoryProvider {
    let prms: { name: string, value: any }[] = [];

    for (let p of Object.keys(params.query)) prms.push({ name: p, value: params.query[p] });
    prms.push({ name: 'atomSitesOnly', value: params.common.atomSitesOnly ? '1' : '0' });
    prms.push({ name: 'modelId', value: params.common.modelId });
    prms.push({ name: 'format', value: params.common.format });
    prms.push({ name: 'encoding', value: params.common.encoding });
    prms.push({ name: 'lowPrecisionCoords', value: params.common.lowPrecisionCoords });
    
    let data = prms;
    let fields: FieldDesc<typeof data>[] = [
        { name: 'name', string: (data, i) => data[i].name },
        { name: 'value', string: (data, i) => data[i].value, presence: (data, i) => !data[i].value ? CIF.ValuePresence.Present : CIF.ValuePresence.NotSpecified },
    ];

    return () => <CategoryInstance<typeof data>>{
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

    let fields: FieldDesc<typeof data>[] = [
        { name: 'query_type', string: d => d.queryType },
        { name: 'datetime', string: d => `${new Date().toLocaleString('en-US')}` },
        { name: 'is_empty', string: d => d.isEmpty ? 'yes' : 'no' },
        { name: 'has_error', string: d => d.hasError ? 'yes' : 'no' },
        { name: 'api_version', string: d => d.ApiVersion },
        { name: 'core_version', string: d => d.CoreVersion }
    ];

    return () => <CategoryInstance<typeof data>>{
        data,
        desc: {
            name: '_coordinate_server_result',
            fields
        }
    };
}

export function createErrorCategory(message: string) {  
    let data = message;
    let fields: FieldDesc<string>[] = [
        { name: 'message', string: data => data }
    ];

    return () => <CategoryInstance<typeof data>>{
        data,
        desc: {
            name: '_coordinate_server_error',
            fields
        }
    };
}

export function createStatsCategory(molecule: Provider.MoleculeWrapper, queryTime: number, formatTime: number) {
    let data = { cached: molecule.source === Provider.MoleculeSource.Cache ? 'yes' : 'no', io: molecule.ioTime | 0, parse: molecule.parseTime | 0, query: queryTime | 0, format: formatTime | 0 };
    let fields: FieldDesc<typeof data>[] = [
        { name: 'molecule_cached', string: data => data.cached },
        { name: 'io_time_ms', string: data => `${data.io}`, number: data => data.io, typedArray: Int32Array, encoder: E.by(E.int32) },
        { name: 'parse_time_ms', string: data => `${data.parse}`, number: data => data.parse, typedArray: Int32Array, encoder: E.by(E.int32) },
        { name: 'query_time_ms', string: data => `${data.query}`, number: data => data.query, typedArray: Int32Array, encoder: E.by(E.int32) },
        { name: 'format_time_ms', string: data => `${data.format}`, number: data => data.format, typedArray: Int32Array, encoder: E.by(E.int32) }
    ];

    return () => <CategoryInstance<typeof data>>{
        data,
        desc: {
            name: '_coordinate_server_stats',
            fields
        }
    };
}

export function createWriter(encoding: string, header: string): Writer {
    let isBCif = (encoding || '').trim().toLowerCase() === 'bcif';
    return isBCif ? new BCifWriter(header) : new CifWriter(header);    
}

export function writeError(stream: OutputStream, encoding: string, header: string, message: string, optional?: { params?: FilteredQueryParams, queryType?: string }) {
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