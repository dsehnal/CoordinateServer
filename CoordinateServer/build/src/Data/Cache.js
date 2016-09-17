"use strict";
var Provider = require('./Provider');
var Logger_1 = require('../Utils/Logger');
var CacheEntry = (function () {
    function CacheEntry(molecule) {
        this.molecule = molecule;
        this.previous = null;
        this.next = null;
        this.inList = false;
        this.timeoutId = undefined;
    }
    return CacheEntry;
}());
var Cache = (function () {
    function Cache(params) {
        this.params = params;
        this.entries = new LinkedList();
        this.entryMap = new Map();
        this.approximateSize = 0;
    }
    Cache.prototype.dispose = function (e) {
        if (e.timeoutId !== undefined)
            clearTimeout(e.timeoutId);
        if (e.inList) {
            this.entries.remove(e);
            this.approximateSize -= e.molecule.approximateSize;
        }
        this.entryMap.delete(e.molecule.key);
    };
    Cache.prototype.refresh = function (e) {
        var _this = this;
        if (e.timeoutId !== undefined)
            clearTimeout(e.timeoutId);
        e.timeoutId = setTimeout(function () { return _this.expire(e); }, this.params.entryTimeoutInMs);
        this.entries.remove(e);
        this.entries.addFirst(e);
    };
    Cache.prototype.expire = function (e, notify) {
        if (notify === void 0) { notify = true; }
        if (notify)
            Logger_1.default.log("[Cache] " + e.molecule.molecule.id + " expired.");
        this.dispose(e);
    };
    Cache.prototype.expireAll = function () {
        for (var e = this.entries.first; e; e = e.next)
            this.expire(e, false);
    };
    Cache.prototype.add = function (m) {
        if (this.entryMap.has(m.key))
            this.dispose(this.entryMap.get(m.key));
        if (this.params.maxApproximateSizeInBytes < this.approximateSize + m.approximateSize) {
            if (this.entries.last)
                this.dispose(this.entries.last);
        }
        this.approximateSize += m.approximateSize;
        var e = new CacheEntry(m);
        this.entries.addFirst(e);
        this.entryMap.set(m.key, e);
        this.refresh(e);
        Logger_1.default.log("[Cache] " + e.molecule.molecule.id + " added.");
    };
    Cache.prototype.get = function (key) {
        if (!this.entryMap.has(key))
            return undefined;
        var e = this.entryMap.get(key);
        this.refresh(e);
        Logger_1.default.log("[Cache] " + e.molecule.molecule.id + " accessed.");
        return new Provider.MoleculeWrapper(e.molecule, Provider.MoleculeSource.Cache, 0, 0);
    };
    return Cache;
}());
exports.Cache = Cache;
var LinkedList = (function () {
    function LinkedList() {
        this.first = null;
        this.last = null;
    }
    LinkedList.prototype.addFirst = function (item) {
        item.inList = true;
        if (this.first)
            this.first.previous = item;
        item.next = this.first;
        this.first = item;
    };
    LinkedList.prototype.addLast = function (item) {
        if (this.last != null) {
            this.last.next = item;
        }
        item.previous = this.last;
        this.last = item;
        if (this.first == null) {
            this.first = item;
        }
        item.inList = true;
    };
    LinkedList.prototype.remove = function (item) {
        if (!item.inList)
            return;
        item.inList = false;
        if (item.previous !== null) {
            item.previous.next = item.next;
        }
        else if (item.previous === null) {
            this.first = item.next;
        }
        if (item.next !== null) {
            item.next.previous = item.previous;
        }
        else if (item.next === null) {
            this.last = item.previous;
        }
        item.next = null;
        item.previous = null;
    };
    return LinkedList;
}());
