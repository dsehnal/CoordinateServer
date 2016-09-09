"use strict";
var Core = require('LiteMol-core');
var Molecule = require('./Molecule');
var fs = require('fs');
var zlib = require('zlib');
var CIF = Core.Formats.CIF;
var mmCIF = Core.Formats.Molecule.mmCIF;
(function (MoleculeSource) {
    MoleculeSource[MoleculeSource["File"] = 0] = "File";
    MoleculeSource[MoleculeSource["Cache"] = 1] = "Cache";
})(exports.MoleculeSource || (exports.MoleculeSource = {}));
var MoleculeSource = exports.MoleculeSource;
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
function readMolecule(filename, onParsed, onIOError, onUnexpectedError, onIOfinished) {
    var perf = new Core.Utils.PerformanceMonitor();
    perf.start('io');
    readString(filename, function (err, data) {
        perf.end('io');
        try {
            if (onIOfinished)
                onIOfinished();
            if (err) {
                onIOError('' + err);
                return;
            }
            perf.start('parse');
            var dict = CIF.parse(data);
            if (dict.error) {
                var error = dict.error.toString();
                onParsed(error, undefined);
                return;
            }
            if (!dict.result.dataBlocks.length) {
                var error = 'The input contains no data blocks.';
                onParsed(error, undefined);
                return;
            }
            var block = dict.result.dataBlocks[0];
            var rawMol = mmCIF.ofDataBlock(block);
            perf.end('parse');
            var mol = new Molecule.Molecule(Molecule.Molecule.createKey(filename), block, rawMol);
            onParsed(undefined, new MoleculeWrapper(mol, MoleculeSource.File, perf.time('io'), perf.time('parse')));
        }
        catch (e) {
            onUnexpectedError('' + e);
        }
    });
}
exports.readMolecule = readMolecule;
