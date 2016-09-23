import * as Molecule from './Molecule'
import * as Provider from './Provider'
import Logger from '../Utils/Logger'

class CacheEntry implements LinkedElement<CacheEntry> {

    previous: CacheEntry | null = null;
    next: CacheEntry | null = null;
    inList = false;

    timeoutId: NodeJS.Timer | undefined = undefined;
    
    constructor(public molecule: Molecule.Molecule) {
    }
}

export interface CacheParams {
    useCache: boolean;
    maxApproximateSizeInBytes: number; // = 2 * 1014 * 1024 * 1024; // 2 GB    
    entryTimeoutInMs: number; // = 10 * 60 * 1000; // 10 minutes
}

export class Cache {

    entries = LinkedList.create<CacheEntry>();
    entryMap = new Map<string, CacheEntry>();
    approximateSize = 0;

    private dispose(e: CacheEntry) {
        if (e.timeoutId !== undefined) clearTimeout(e.timeoutId);
        if (e.inList) {
            LinkedList.remove(this.entries, e);
            this.approximateSize -= e.molecule.approximateSize;
        }
        this.entryMap.delete(e.molecule.key);
    }

    private refresh(e: CacheEntry) {
        if (e.timeoutId !== undefined) clearTimeout(e.timeoutId);
        e.timeoutId = setTimeout(() => this.expire(e), this.params.entryTimeoutInMs);
        LinkedList.remove(this.entries, e);
        LinkedList.addFirst(this.entries, e);
    }

    private expire(e: CacheEntry, notify = true) {
        if (notify) Logger.log(`[Cache] ${e.molecule.molecule.id} expired.`);
        this.dispose(e);
    }

    expireAll() {
        for (let e = this.entries.first; e; e = e.next) this.expire(e, false);
    }

    add(m: Molecule.Molecule) {
        if (this.entryMap.has(m.key)) this.dispose(this.entryMap.get(m.key)!);

        if (this.params.maxApproximateSizeInBytes < this.approximateSize + m.approximateSize) {
            if (this.entries.last) this.dispose(this.entries.last);
        }

        this.approximateSize += m.approximateSize;
        let e = new CacheEntry(m);
        LinkedList.addFirst(this.entries, e);
        this.entryMap.set(m.key, e);
        this.refresh(e);
        Logger.log(`[Cache] ${e.molecule.molecule.id} added.`);
    }


    get(key: string) {
        if (!this.entryMap.has(key)) return undefined;

        let e = this.entryMap.get(key)!;
        this.refresh(e);

        Logger.log(`[Cache] ${e.molecule.molecule.id} accessed.`);

        return new Provider.MoleculeWrapper(e.molecule, Provider.MoleculeSource.Cache, 0, 0);
    }    

    constructor(public params: CacheParams) {
    }
}

interface LinkedElement<T> { previous: T | null, next: T | null, inList: boolean }

interface LinkedList<T extends LinkedElement<T>> { first: T | null, last: T | null }

namespace LinkedList {

    export function create<T extends LinkedElement<T>>(): LinkedList<T> {
        return {
            first: null,
            last: null
        }
    }

    export function addFirst<T extends LinkedElement<T>>(list: LinkedList<T>, item: T) {
        item.inList = true;
        if (list.first) list.first.previous = item;
        item.next = list.first;
        list.first = item;
    }

    export function addLast<T extends LinkedElement<T>>(list: LinkedList<T>, item: T) {
        if (list.last != null) {
            list.last.next = item;
        }
        item.previous = list.last;
        list.last = item;
        if (list.first == null) {
            list.first = item;
        }
        item.inList = true;
    }

    export function remove<T extends LinkedElement<T>>(list: LinkedList<T>, item: T) {
        if (!item.inList) return;

        item.inList = false;

        if (item.previous !== null) {
            item.previous.next = item.next;
        }
        else if (/*first == item*/ item.previous === null) {
            list.first = item.next;
        }

        if (item.next !== null) {
            item.next.previous = item.previous;
        }
        else if (/*last == item*/ item.next === null) {
            list.last = item.previous;
        }

        item.next = null;
        item.previous = null;
    }
}