/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

import * as Queries from './queries'
import * as Api from './api'
import * as Molecule from '../data/molecule'
import * as Provider from '../data/provider'
import * as Cache from '../data/cache'
import ServerConfig from '../server-config'
import * as WriterContext from '../writers/context'
import Logger from '../utils/logger'
import * as express from 'express'

function makePath(p: string) {
    return ServerConfig.appPrefix + '/' + p;
}

const WebApiCache = new Cache.Cache(ServerConfig.cacheParams);

export const ApiState = {
    pendingQueries: 0,
    shutdownOnZeroPending: false
};

function writeHeader(response: express.Response, id: string, queryType: string, encoding: string) {
    if (response.headersSent) return;

    let isBCif = (encoding || '').trim().toLowerCase() === 'bcif';
    
    if (isBCif) {
        response.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'X-Requested-With',
            'Content-Disposition': `inline; filename="${(id || '').replace(/[ \n\t]/g, '').toLowerCase()}_${queryType}.bcif"`
        });
    } else {
        response.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'X-Requested-With'
        });
    }
}


function handleQueryEnd() {
    ApiState.pendingQueries = Math.max(ApiState.pendingQueries - 1, 0);
    if (ApiState.pendingQueries === 0 && ApiState.shutdownOnZeroPending) {
        Logger.log(`Shut down due to timeout.`);
        process.exit(0);
    }

}

function execute(response: express.Response, query: Queries.ApiQuery, molecule: Provider.MoleculeWrapper, params: any) {
    Api.executeQuery(molecule, query, params, () => {
        writeHeader(response, molecule.molecule.molecule.id, query.name, params.encoding);
        return response;
    }, () => handleQueryEnd());
}

function do404(response: any) {
    response.writeHead(404);
    response.end();
}

function doCifError(response: express.Response, message: string, id: string, queryName: string, params: any) {
    writeHeader(response, id, queryName, params.encoding);
    WriterContext.writeError(WriterContext.wrapStream(response), params.encoding, id, message, { queryType: queryName });
    response.end();
}

function mapQuery(app: express.Express, query: Queries.ApiQuery) {
    app.get(makePath(':id/' + query.name), (req, res) => {
        Logger.log(`[server] Query '${req.params.id}/${query.name}'...`);

        ApiState.pendingQueries++;
        
        let id = req.params.id;
        let filename = ServerConfig.mapPdbIdToFilename(id);
        let addToCache = ServerConfig.cacheParams.useCache;
        if (ServerConfig.cacheParams.useCache) {
            let molecule = WebApiCache.get(Molecule.Molecule.createKey(filename));
            if (molecule) {
                execute(res, query, molecule, req.query);
                return;
            }
        }
        
        Provider.readMolecule(filename, (parserErr, m) => {
            if (parserErr) {
                doCifError(res, parserErr, id, query.name, req.query);
                handleQueryEnd();
                return;
            }
            if (addToCache && m!.source !== Provider.MoleculeSource.Cache) WebApiCache.add(m!.molecule);
            execute(res, query, m!, req.query);
        }, ioErr => {
            do404(res);
            handleQueryEnd();
        }, unExpectedErr => {
            doCifError(res, '' + unExpectedErr, id, query.name, req.query);
            handleQueryEnd();
        });
    });
}

export function init(app: express.Express) {
    for (let q of Queries.QueryList) {
        mapQuery(app, q);
    }
}