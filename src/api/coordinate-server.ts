/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

import * as Core from '../lib/LiteMol-core'
import * as WriterContext from '../writers/context'
import * as Molecule from '../data/molecule'
import { ApiQuery, FilteredQueryParams } from './queries'
import Logger from '../utils/logger';

import Queries = Core.Structure.Query;

export interface CoordinateServerConfig {
    params: FilteredQueryParams,
    includedCategories: string[],
    writer: Core.Formats.CIF.Writer<WriterContext.Context>
}

export interface CoordinateServerResult {
    error?: string;

    timeQuery?: number;
    timeFormat?: number;
}
    
export function processQuery(
    reqId: string,
    molecule: Molecule.Molecule,

    query: ApiQuery,
    queryParams: FilteredQueryParams,

    formatter: WriterContext.Formatter,

    config: CoordinateServerConfig,
    next: (result: CoordinateServerResult) => void) {
        
    let perf = new Core.Utils.PerformanceMonitor();

    let formatConfig: WriterContext.FormatConfig = {
        queryType: query.name,
        data: molecule.cif,
        includedCategories: config.includedCategories,
        params: queryParams
    };
        
    try {

        let models: WriterContext.WritableFragments[] = [];

        perf.start('query')
        let found = 0;
        let singleModel = !!queryParams.common.modelId;
        let singleModelId = queryParams.common.modelId;
        let foundModel = false;
        for (var modelWrap of molecule.models) {

            let fragments: Queries.FragmentSeq;
            let model = modelWrap.model;

            if (singleModel && model.modelId !== singleModelId) continue;
            foundModel = true;

            if (query.description.modelTransform) {
                let transformed = query.description.modelTransform(queryParams.query, model);
                let compiled = query.description.query(queryParams.query, model, transformed).compile();
                fragments = compiled(transformed.queryContext);
                model = transformed;
            } else {
                let compiled = query.description.query(queryParams.query, model, model).compile();
                fragments = compiled(model.queryContext);
            }

    
            if (fragments.length > 0) {
                models.push({ model, fragments });
                found += fragments.length;
            }
        }
        perf.end('query');

        if (singleModelId && !foundModel) {
            let err = `Model with id '${singleModelId}' was not found.`;
            next({
                error: err,
            });
            return;
        }

        Logger.log(`${reqId}: Found ${found} fragment(s).`)

        perf.start('format');
        formatter(config.writer, formatConfig, models);
        perf.end('format');

        next({
            timeQuery: perf.time('query'),
            timeFormat: perf.time('format')
        });
    } catch (e) {
        next({
            error: '' + e,
        });
    }
}