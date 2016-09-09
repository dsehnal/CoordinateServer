import * as Queries from './Queries'
import * as Api from './Api'

import * as CifWriters from '../Writers/CifWriter'
import * as Molecule from '../Data/Molecule'
import * as Provider from '../Data/Provider'
import * as Cache from '../Data/Cache'
import * as Experimental from './ExperimentalWebApi'
import ServerConfig from '../ServerConfig'

import * as express from 'express';

function makePath(p: string) {
    return ServerConfig.appPrefix + '/' + p;
}

const WebApiCache = new Cache.Cache(ServerConfig.cacheParams);

function execute(response: any, query: Queries.ApiQuery, molecule: Provider.MoleculeWrapper, params: any) {
    Api.executeQuery(molecule, query, params, () => {
        response.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'X-Requested-With'
        });
        return response;
    });
}

function do404(response: any) {
    response.writeHead(404);
    response.end();
}

function doCifError(response: any, message: string,
    id: string, queryName: string, params: any) {
    response.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'X-Requested-With'
    });
    
    let wcfg = new CifWriters.CifWriterConfig();
    wcfg.commonParams = {
        atomSitesOnly: !!params.atomSitesOnly,
        modelId: params.modelId,
        format: params.format
    };
    wcfg.type = queryName;
    let msg = new CifWriters.DefaultCifWriter().writeError(id, message, wcfg);
    response.end(msg);
}

function mapQuery(app: express.Express, query: Queries.ApiQuery) {

    app.get(makePath(':id/' + query.name), (req, res) => {


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
                return;
            }
            if (addToCache) WebApiCache.add(m.molecule);
            execute(res, query, m, req.query);
        }, ioErr => {
            do404(res);
        }, unExpectedErr => {
            doCifError(res, '' + unExpectedErr, id, query.name, req.query)
        });
    });
}

export function init(app: express.Express) {

    for (let q of Queries.QueryList) {
        mapQuery(app, q);
    }

    Experimental.init(app, WebApiCache);    
}