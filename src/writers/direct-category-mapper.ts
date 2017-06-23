/*
 * Copyright (c) 2017 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

import * as Core from '../lib/LiteMol-core'

import CIF = Core.Formats.CIF
import Enc = Core.Formats.CIF.Binary.Encoding
import E = Core.Formats.CIF.Binary.Encoder

type FieldDesc<T> = CIF.FieldDesc<T>
type CategoryInstance<T> = CIF.CategoryInstance<T>
//type CategoryProvider = CIF.CategoryProvider

export type ColumnType = 'String' | 'Int' | 'Float32' | 'Float64'
export interface ColumnSpec {
    name: string,
    type: ColumnType,
    encoder?: E
}

const ARRAY_TYPES = {
    'Int': Int32Array,
    'Float32': Float32Array,
    'Float64': Float64Array
}

function stringColumn(name: string, column: CIF.Column): FieldDesc<CIF.Column> {
    return { name, string: (_, i) => column.getString(i), presence: (_, i) => column.getValuePresence(i) };
}

function typedColumn<T>(name: string, column: CIF.Column, typedArray: Enc.IntArray | Enc.FloatArray, encoder: E): FieldDesc<T> {
    return { name, string: (_, i) => column.getString(i), number: (_, i) => column.getFloat(i), presence: (_, i) => column.getValuePresence(i), typedArray, encoder };
}


export function categoryMapper(category: CIF.Category, columns: ColumnSpec[]) {
    const fields = columns.map(c => c.type === 'String'
        ? stringColumn(c.name, category.getColumn(c.name))
        : typedColumn(c.name, category.getColumn(c.name), ARRAY_TYPES[c.type] as any, c.encoder || E.by(E.byteArray)));

    return <CategoryInstance<{}>>{
        data: {},
        count: category.rowCount,
        desc: {
            name: category.name,
            fields
        }
    };
}