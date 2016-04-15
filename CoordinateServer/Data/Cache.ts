import * as Molecule from './Molecule'
import * as Provider from './Provider'
import Logger from '../Utils/Logger'

class CacheEntry implements LinkedElement<CacheEntry> {

    previous: CacheEntry = null;
    next: CacheEntry = null;
    inList = false;

    timeoutId = undefined;
    
    constructor(public molecule: Molecule.Molecule) {
    }
}

export interface CacheParams {
    useCache: boolean;
    maxApproximateSizeInBytes: number; // = 2 * 1014 * 1024 * 1024; // 2 GB    
    entryTimeoutInMs: number; // = 10 * 60 * 1000; // 10 minutes
}

export class Cache {

    entries = new LinkedList<CacheEntry>();
    entryMap = new Map<string, CacheEntry>();
    approximateSize = 0;

    private dispose(e: CacheEntry) {
        if (e.timeoutId !== undefined) clearTimeout(e.timeoutId);
        if (e.inList) {
            this.entries.remove(e);
            this.approximateSize -= e.molecule.approximateSize;
        }
        this.entryMap.delete(e.molecule.key);
    }

    private refresh(e: CacheEntry) {
        if (e.timeoutId !== undefined) clearTimeout(e.timeoutId);
        e.timeoutId = setTimeout(() => this.expire(e), this.params.entryTimeoutInMs);
        this.entries.remove(e);
        this.entries.addFirst(e);
    }

    private expire(e: CacheEntry) {
        Logger.log(`[Cache] ${e.molecule.molecule.id} expired.`);
    }

    add(m: Molecule.Molecule) {
        if (this.entryMap.has(m.key)) this.dispose(this.entryMap.get(m.key));

        if (this.params.maxApproximateSizeInBytes < this.approximateSize + m.approximateSize) {
            if (this.entries.last) this.dispose(this.entries.last);
        }

        this.approximateSize += m.approximateSize;
        let e = new CacheEntry(m);
        this.entries.addFirst(e);
        this.entryMap.set(m.key, e);
        this.refresh(e);
        Logger.log(`[Cache] ${e.molecule.molecule.id} added.`);
    }


    get(key: string) {
        if (!this.entryMap.has(key)) return undefined;

        let e = this.entryMap.get(key);
        this.refresh(e);

        Logger.log(`[Cache] ${e.molecule.molecule.id} accessed.`);

        return new Provider.MoleculeWrapper(e.molecule, Provider.MoleculeSource.Cache, 0, 0);
    }    

    constructor(public params: CacheParams) {
    }
}

interface LinkedElement<T> { previous: T; next: T; inList: boolean }

class LinkedList<T extends LinkedElement<T>> {

    first: T = null;
    last: T = null;

    addFirst(item: T) {
        item.inList = true;
        if (this.first) this.first.previous = item;
        item.next = this.first;
        this.first = item;
    }

    addLast(item: T) {
        if (this.last != null) {
            this.last.next = item;
        }
        item.previous = this.last;
        this.last = item;
        if (this.first == null) {
            this.first = item;
        }
        item.inList = true;
    }

    remove(item: T) {
        if (!item.inList) return;

        item.inList = false;

        if (item.previous !== null) {
            item.previous.next = item.next;
        }
        else if (/*first == item*/ item.previous === null) {
            this.first = item.next;
        }

        if (item.next !== null) {
            item.next.previous = item.previous;
        }
        else if (/*last == item*/ item.next === null) {
            this.last = item.previous;
        }

        item.next = null;
        item.previous = null;
    }
}