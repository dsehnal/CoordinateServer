"use strict";
var Core = require("LiteMol-core");
var Molecule = require("./Molecule");
var fs = require("fs");
var zlib = require("zlib");
var Logger_1 = require("../Utils/Logger");
var CIF = Core.Formats.CIF;
var mmCIF = Core.Formats.Molecule.mmCIF;
var MoleculeSource;
(function (MoleculeSource) {
    MoleculeSource[MoleculeSource["File"] = 0] = "File";
    MoleculeSource[MoleculeSource["Cache"] = 1] = "Cache";
})(MoleculeSource = exports.MoleculeSource || (exports.MoleculeSource = {}));
var MoleculeWrapper = (function () {
    function MoleculeWrapper(molecule, source, ioTime, parseTime) {
        this.molecule = molecule;
        this.source = source;
        this.ioTime = ioTime;
        this.parseTime = parseTime;
    }
    return MoleculeWrapper;
}());
exports.MoleculeWrapper = MoleculeWrapper;
function readString(filename, onDone) {
    var isGz = /\.gz$/i.test(filename);
    if (isGz) {
        fs.readFile(filename, function (err, raw) {
            if (err) {
                onDone(err, void 0);
                return;
            }
            zlib.unzip(raw, function (e, data) {
                if (e) {
                    onDone(e, void 0);
                    return;
                }
                var s = data.toString('utf8');
                onDone(void 0, s);
            });
        });
    }
    else {
        fs.readFile(filename, 'utf8', onDone);
    }
}
var resolvers = new Map();
function resolve(filename, err, data) {
    var toResolve = resolvers.get(filename);
    if (!toResolve) {
        Logger_1.default.error("No resolvers found for '" + filename + "'.");
        return;
    }
    resolvers.delete(filename);
    try {
        var res = toResolve[0];
        if (res.onIOfinished)
            res.onIOfinished();
        if (err) {
            for (var i = 0; i < toResolve.length; i++) {
                toResolve[i].onIOError('' + err);
            }
            return;
        }
        res.perf.start('parse');
        var dict = CIF.Text.parse(data);
        if (dict.isError) {
            var error = dict.toString();
            for (var i = 0; i < toResolve.length; i++) {
                toResolve[i].onParsed(error, undefined);
            }
            return;
        }
        if (!dict.result.dataBlocks.length) {
            var error = 'The input contains no data blocks.';
            for (var i = 0; i < toResolve.length; i++) {
                toResolve[i].onParsed(error, undefined);
            }
            return;
        }
        var block = dict.result.dataBlocks[0];
        var rawMol = mmCIF.ofDataBlock(block);
        res.perf.end('parse');
        var mol = new Molecule.Molecule(Molecule.Molecule.createKey(filename), block, rawMol, data.length);
        res.onParsed(undefined, new MoleculeWrapper(mol, MoleculeSource.File, res.perf.time('io'), res.perf.time('parse')));
        var cached = new MoleculeWrapper(mol, MoleculeSource.Cache, 0, 0);
        ;
        for (var i = 1; i < toResolve.length; i++) {
            toResolve[i].onParsed(undefined, cached);
        }
    }
    catch (e) {
        var error = '' + e;
        for (var i = 0; i < toResolve.length; i++) {
            toResolve[i].onUnexpectedError(error);
        }
    }
}
function readMolecule(filename, onParsed, onIOError, onUnexpectedError, onIOfinished) {
    var res = resolvers.get(filename);
    if (!res) {
        res = [];
        resolvers.set(filename, res);
    }
    var resolver = {
        perf: new Core.Utils.PerformanceMonitor(),
        onParsed: onParsed,
        onIOError: onIOError,
        onUnexpectedError: onUnexpectedError,
        onIOfinished: onIOfinished
    };
    res.push(resolver);
    if (res.length > 1) {
        return;
    }
    resolver.perf.start('io');
    readString(filename, function (err, data) {
        resolver.perf.end('io');
        resolve(filename, err, data);
    });
}
exports.readMolecule = readMolecule;
