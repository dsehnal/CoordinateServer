import * as Queries from './Queries'
import * as Api from './Api'

import * as CifWriters from '../Writers/CifWriter'
import * as Molecule from '../Data/Molecule'
import * as Provider from '../Data/Provider'
import * as Cache from '../Data/Cache'
import * as Experimental from './ExperimentalWebApi'
import ServerConfig from '../ServerConfig'
import * as WriterContext from '../Writers/Context'

import * as express from 'express';

function makePath(p: string) {
    return ServerConfig.appPrefix + '/' + p;
}

const WebApiCache = new Cache.Cache(ServerConfig.cacheParams);

function writeHeader(response: express.Response, id: string, queryType: string, encoding: string) {
    if (response.headersSent) return;

    let isBCif = (encoding || '').trim().toLowerCase() === 'bcif';
    let ct = isBCif ? 'application/octet-stream' : 'text/plain; charset=utf-8';
    
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


function execute(response: express.Response, query: Queries.ApiQuery, molecule: Provider.MoleculeWrapper, params: any) {
    Api.executeQuery(molecule, query, params, () => {
        writeHeader(response, molecule.molecule.molecule.id, query.name, params.encoding);
        return response;
    });
}

function do404(response: any) {
    response.writeHead(404);
    response.end();
}

function doCifError(response: express.Response, message: string, id: string, queryName: string, params: any) {
    writeHeader(response, id, queryName, params.encoding);
    WriterContext.writeError(response, params.encoding, id, message, { queryType: queryName });
    response.end();
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
            if (addToCache) WebApiCache.add(m!.molecule);
            execute(res, query, m!, req.query);
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