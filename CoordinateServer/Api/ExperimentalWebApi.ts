
import * as Core from 'LiteMol-core'
import Logger from '../Utils/Logger'

import StringWriter from '../Writers/StringWriter'
import * as Molecule from '../Data/Molecule'
import * as Provider from '../Data/Provider'
import * as Cache from '../Data/Cache'
import ServerConfig from '../ServerConfig'

import * as express from 'express';

function makePath(p: string) {
    return ServerConfig.appPrefix + '/' + p;
}

const WebApiCache = new Cache.Cache(ServerConfig.cacheParams);

function writeJson(response: any, data: string) {
    response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'X-Requested-With'
    });
    response.end(data);
}

function writeCIF(response: any, data: StringWriter) {
    response.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'X-Requested-With'
    });
    data.writeTo(response);
    response.end();
}

function do404(response: any) {
    response.writeHead(404);
    response.end();
}

function writeCifCategories(id: string, data: string, cats: Core.Formats.CIF.Category[]) {
    let writer = new StringWriter();
    writer.write('data_' + id); writer.newline();
    writer.write('#'); writer.newline();
    for (let c of cats) {
        writer.write(data.substring(c.startIndex, c.endIndex));
    }
    return writer;
}

function makeCategoriesJson(id: string, data: string, cats: Core.Formats.CIF.Category[]) {
    return JSON.stringify({
        data: id,
        categories: cats.map(c => c.toJSON())
    }, null, 2);
}

function categories(molecule: Provider.MoleculeWrapper, req: express.Request, res: express.Response) {

    try {
        let block = molecule.molecule.cif;
        let cats = ((req.query.names || '') as string)
            .split(',')
            .map(c => block.getCategory(c.trim()))
            .filter(c => !!c);

        let isJson = !!req.query.json;

        if (isJson) {
            let json = makeCategoriesJson(block.header, block.data, cats);
            writeJson(res, json);
        } else {
            let cif = writeCifCategories(block.header, block.data, cats);
            writeCIF(res, cif);
        }
    } catch (e) {
        Logger.log('[Experimental] ' + e);
    }
}

function mapCategories(app: express.Express, cache: Cache.Cache) {

    app.get(makePath(':id/categories'), (req, res) => {


        let id = req.params.id;
        let filename = ServerConfig.mapPdbIdToFilename(id);
        let addToCache = ServerConfig.cacheParams.useCache;
        if (ServerConfig.cacheParams.useCache) {
            let molecule = WebApiCache.get(Molecule.Molecule.createKey(filename));
            if (molecule) {
                categories(molecule, req, res);
                return;
            }
        }

        Provider.readMolecule(filename, (parserErr, m) => {
            if (parserErr) {
                Logger.log('[Experimental] ' + parserErr);
                do404(res);
                return;
            }
            if (addToCache) WebApiCache.add(m.molecule);
            categories(m, req, res);
        }, ioErr => {
            Logger.log('[Experimental] ' + ioErr);
            do404(res);
        }, unExpectedErr => {
            Logger.log('[Experimental] ' + unExpectedErr);
            do404(res);
        });
    });
}

export function init(app: express.Express, cache: Cache.Cache) {
    mapCategories(app, cache);
}