/////*
//// * Copyright (c) 2016 David Sehnal
//// *
//// * Licensed under the Apache License, Version 2.0 (the "License");
//// * you may not use this file except in compliance with the License.
//// * You may obtain a copy of the License at
//// *
//// *   http://www.apache.org/licenses/LICENSE-2.0

//// * Unless required by applicable law or agreed to in writing, software
//// * distributed under the License is distributed on an "AS IS" BASIS,
//// * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//// * See the License for the specific language governing permissions and
//// * limitations under the License.
//// */

////import ServerConfig from './ServerConfig';

////import * as fs from 'fs';

////import * as Core from 'LiteMol-core';
////import * as CifWriters from './Writers/CifWriter';
////import * as PdbWriters from './Writers/PdbWriter';

////import Logger from './Utils/Logger';

////import Cif = Core.Formats.Cif;
////import Queries = Core.Structure.Queries;

////export class CoordinateServerConfig {
////    atomSitesOnly: boolean;
////    includedCategories: string[];
////    writer: CifWriters.ICifWriter;
////}

////export class CoordinateServer {
    
////    static process(
////        queryName: string,
////        reqId: string,
////        moleculeId: string,
////        modelTransform: (params: any, m: Core.Structure.MoleculeModel) => Core.Structure.MoleculeModel,
////        queryParams: any,
////        queryProvider: (params: any, originalModel: Core.Structure.MoleculeModel, transformedModel: Core.Structure.MoleculeModel) => Queries.IQueryBuilder,
////        config: CoordinateServerConfig,
////        performance: Core.Utils.PerformanceMonitor,
////        next: (err: { is404: boolean, error: string, cif?: string }, data: { writeTo: (stream: { write: (str: string) => boolean }) => void }) => void) {


////        var filename = ServerConfig.mapPdbIdToFilename(moleculeId);

////        performance.start('io');
////        fs.readFile(filename, 'utf8', (err, data) => {

////            performance.end('io');

////            if (err) {
////                next({ is404: true, error: '' + err }, undefined);
////                return;
////            }

////            let writerConfig = new CifWriters.CifWriterConfig();
////            writerConfig.type = queryName;
////            writerConfig.params = Object.keys(queryParams).map(p => ({ name: p, value: queryParams[p] }));
////            writerConfig.atomSitesOnly = config.atomSitesOnly;
////            writerConfig.includedCategories = config.includedCategories;

////            try {

////                performance.start('parse');

////                let dict = Cif.Parser.parse(data);

////                if (dict.error) {
////                    let error = dict.error.toString();
////                    next({ is404: false, error, cif: config.writer.writeError(moleculeId, error, writerConfig) }, undefined);
////                    return;
////                }

////                if (!dict.result.dataBlocks.length) {
////                    let error = 'The input contains no data blocks.';
////                    next({ is404: false, error, cif: config.writer.writeError(moleculeId, error, writerConfig) }, undefined);
////                    return;
////                }
                

////                let block = dict.result.dataBlocks[0];
////                let mol = Cif.mmCif.ofDataBlock(block);

////                performance.end('parse');
////                performance.start('query');

////                let models: CifWriters.IWritableFragments[] = [];

////                let found = 0;
                
////                for (var model of mol.models) {
////                    let transformed = modelTransform(queryParams, model);
////                    let query = queryProvider(queryParams, model, transformed).compile();
////                    let fragments = query(transformed.queryContext);
                                        
////                    if (fragments.length > 0) {
////                        models.push({ model: transformed, fragments: fragments });
////                        found += fragments.length;
////                    }
////                }

////                Logger.log(`${reqId}: Found ${found} fragment(s).`)

////                performance.end('query');

////                performance.start('write');
////                let ret = config.writer.writeFragment(block, models, writerConfig);

////                next(undefined, ret);

////                //next({ is404: false, message: config.writer.writeError(moleculeId, 'test msg', cfg) }, undefined);
////            } catch (e) {
////                next({ is404: false, error: '' + e, cif: config.writer.writeError(moleculeId, '' + e, writerConfig) }, undefined);
////            }
////        });
////    }
////}