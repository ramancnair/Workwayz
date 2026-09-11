import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export const db = supabase;

// ============================================================================
// Timestamp polyfill (mirrors Firestore Timestamp)
// ============================================================================
export class Timestamp {
    seconds: number;
    nanoseconds: number;

    constructor(seconds: number, nanoseconds: number) {
        this.seconds = seconds;
        this.nanoseconds = nanoseconds;
    }

    static now() {
        return Timestamp.fromDate(new Date());
    }

    static fromDate(date: Date) {
        return new Timestamp(Math.floor(date.getTime() / 1000), 0);
    }

    toDate() {
        return new Date(this.seconds * 1000);
    }
}

// ============================================================================
// LOCAL PUB-SUB — the core mechanism for real-time UI updates.
//
// Supabase Realtime (postgres_changes) relies on a WebSocket connection to
// the Supabase server. On local emulators and in certain Next.js HMR
// scenarios, this connection is unreliable. Instead of depending on it, we
// maintain a simple in-memory pub-sub: every write function (setDoc,
// updateDoc, deleteDoc, addDoc, writeBatch.commit) notifies all active
// onSnapshot listeners whose collection path matches the written path.
//
// This guarantees instant, same-tab reactivity regardless of WebSocket
// health — exactly what Firebase Firestore's onSnapshot provides natively.
// ============================================================================

interface Listener {
    /** The collection path this listener cares about, e.g. "employees" or "projects/abc/stories" */
    collectionPath: string;
    /** The full ref (may include constraints) — used to re-fetch the correct data */
    ref: any;
    onNext: (snapshot: any) => void;
    onError?: (err: any) => void;
}

const listeners: Listener[] = [];

/**
 * Extract the collection path from a document path.
 * "employees/E003" → "employees"
 * "projects/abc/stories/s1" → "projects/abc/stories"
 */
function getCollectionPath(docPath: string): string {
    const parts = docPath.split('/');
    // A document path has an even number of parts (collection/doc/collection/doc/...)
    // Drop the last segment (the doc id) to get the collection path
    if (parts.length >= 2) {
        return parts.slice(0, -1).join('/');
    }
    return docPath;
}

/**
 * Notify all listeners whose collection path matches the changed path.
 * We debounce slightly (microtask) so that batch operations don't cause
 * N re-fetches — they'll coalesce into one per listener.
 */
const pendingNotifications = new Set<string>();
let notificationScheduled = false;
let channelCounter = 0;

export function scheduleListenerNotification(changedDocPath: string) {
    const collPath = getCollectionPath(changedDocPath);
    pendingNotifications.add(collPath);
    // Also add the exact doc path for doc-level listeners
    pendingNotifications.add(changedDocPath);
    // Also add the collection name for collectionGroup listeners
    const collName = collPath.split('/').pop();
    if (collName) {
        pendingNotifications.add(collName);
    }

    if (!notificationScheduled) {
        notificationScheduled = true;
        queueMicrotask(() => {
            const paths = new Set(pendingNotifications);
            pendingNotifications.clear();
            notificationScheduled = false;

            for (const listener of listeners) {
                let shouldFire = false;
                for (const p of paths) {
                    if (p === listener.collectionPath || p === listener.ref.path) {
                        shouldFire = true;
                        break;
                    }
                }
                if (shouldFire) {
                    if (listener.ref.type === 'doc') {
                        getDoc(listener.ref)
                            .then(listener.onNext)
                            .catch(err => { if (listener.onError) listener.onError(err); });
                    } else {
                        getDocs(listener.ref)
                            .then(listener.onNext)
                            .catch(err => { if (listener.onError) listener.onError(err); });
                    }
                }
            }
        });
    }
}

// ============================================================================
// Data hydration — converts stored JSON timestamps back into Timestamp objects
// ============================================================================
function hydrateData(data: any): any {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) {
        return data.map(hydrateData);
    }
    if (typeof data === 'object') {
        if ('seconds' in data && 'nanoseconds' in data && Object.keys(data).length === 2) {
            return new Timestamp(data.seconds, data.nanoseconds);
        }
        const hydrated: any = {};
        for (const key in data) {
            hydrated[key] = hydrateData(data[key]);
        }
        return hydrated;
    }
    return data;
}

// ============================================================================
// Ref constructors
// ============================================================================
export const collection = (dbInstanceOrDocRef: any, ...paths: string[]) => {
    let path = '';
    if (dbInstanceOrDocRef && typeof dbInstanceOrDocRef === 'object' && dbInstanceOrDocRef.path) {
        path = `${dbInstanceOrDocRef.path}/${paths.join('/')}`;
    } else {
        path = paths.join('/');
    }
    const id = path.split('/').pop() || '';
    return { type: 'collection', path, id };
};

export const doc = (dbInstanceOrColOrDocRef: any, ...paths: string[]) => {
    let path = '';
    if (dbInstanceOrColOrDocRef && typeof dbInstanceOrColOrDocRef === 'object' && dbInstanceOrColOrDocRef.path) {
        const subPath = (paths.length > 0 && paths[0]) ? paths.join('/') : uuidv4();
        path = `${dbInstanceOrColOrDocRef.path}/${subPath}`;
    } else {
        const pathStr = paths.join('/');
        path = pathStr || uuidv4();
    }
    const id = path.split('/').pop() || '';
    return { type: 'doc', path, id };
};

// ============================================================================
// Path helpers
// ============================================================================
export function parsePathDetails(fullPath: string) {
    const parts = fullPath.split('/');
    let projectId: string | null = null;
    let collectionName = parts[parts.length - 2] || 'unknown';

    if (parts[0] === 'projects') {
        projectId = parts[1];
        if (parts.length === 2) {
            collectionName = 'projects';
        }
    } else if (parts[0] !== 'projects') {
        collectionName = parts[0];
    }

    return { projectId, collectionName };
}

// ============================================================================
// Write operations — ALL call scheduleListenerNotification
// ============================================================================
export const addDoc = async (colRef: any, data: any) => {
    const docId = uuidv4();
    const fullPath = `${colRef.path}/${docId}`;
    const { projectId, collectionName } = parsePathDetails(fullPath);

    const result = await supabase!.from('firebase_compat').upsert({
        collection_name: collectionName,
        path: fullPath,
        project_id: projectId,
        data: data,
        updated_at: new Date().toISOString()
    }, { onConflict: 'path' });
    if (result.error) throw result.error;

    scheduleListenerNotification(fullPath);
    return { id: docId, path: fullPath };
};

export const setDoc = async (docRef: any, data: any, options?: { merge?: boolean }) => {
    const fullPath = docRef.path;
    const { projectId, collectionName } = parsePathDetails(fullPath);

    if (options?.merge) {
        const { data: existing } = await supabase!.from('firebase_compat').select('data').eq('path', fullPath).single();
        let mergedData = existing ? { ...existing.data } : {};
        
        for (const key in data) {
            if (data[key] && data[key].type === 'arrayUnion') {
                const currentArr = Array.isArray(mergedData[key]) ? mergedData[key] : [];
                mergedData[key] = [...currentArr, ...data[key].elements];
            } else if (data[key] && data[key].type === 'arrayRemove') {
                const currentArr = Array.isArray(mergedData[key]) ? mergedData[key] : [];
                const toRemove = JSON.stringify(data[key].elements);
                mergedData[key] = currentArr.filter((el: any) => !toRemove.includes(JSON.stringify(el)));
            } else {
                mergedData[key] = data[key];
            }
        }

        const { error } = await supabase!.from('firebase_compat').upsert({
            path: fullPath,
            collection_name: collectionName,
            project_id: projectId,
            data: mergedData,
            updated_at: new Date().toISOString()
        }, { onConflict: 'path' });
        if (error) throw error;
    } else {
        const { error } = await supabase!.from('firebase_compat').upsert({
            path: fullPath,
            collection_name: collectionName,
            project_id: projectId,
            data: data,
            updated_at: new Date().toISOString()
        }, { onConflict: 'path' });
        if (error) throw error;
    }

    scheduleListenerNotification(fullPath);
};

export const updateDoc = async (docRef: any, data: any) => {
    return setDoc(docRef, data, { merge: true });
};

export const deleteDoc = async (docRef: any) => {
    const pathStr = docRef.path;
    const { error } = await supabase!.from('firebase_compat').delete().eq('path', pathStr);
    if (error) throw error;
    scheduleListenerNotification(pathStr);
};

// ============================================================================
// Read operations
// ============================================================================
export const getDoc = async (docRef: any) => {
    const { data, error } = await supabase!.from('firebase_compat').select('*').eq('path', docRef.path).single();
    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    const docId = docRef.path.split('/').pop();
    
    return {
        id: docId,
        exists: () => !!data,
        data: () => data ? hydrateData(data.data) : undefined
    };
};

export const query = (colRef: any, ...constraints: any[]) => {
    return { ...colRef, constraints };
};

export const where = (fieldPath: string, opStr: string, value: any) => {
    return { type: 'where', fieldPath, opStr, value };
};

export const getDocs = async (queryRef: any) => {
    let request = supabase!.from('firebase_compat').select('*');
    
    let targetDepth = 0;
    if (queryRef.type === 'collectionGroup') {
        request = request.eq('collection_name', queryRef.collectionId);
    } else if (queryRef.path) {
        const targetCollection = queryRef.path.split('/').pop();
        targetDepth = queryRef.path.split('/').length + 1;
        request = request.eq('collection_name', targetCollection).like('path', `${queryRef.path}/%`);
    }

    if (queryRef.constraints) {
        for (const c of queryRef.constraints) {
            if (c.type === 'where') {
                if (c.opStr === '==') {
                    if (typeof c.value === 'string') {
                        request = request.eq(`data->>${c.fieldPath}`, c.value);
                    } else if (typeof c.value === 'boolean') {
                        request = request.eq(`data->${c.fieldPath}`, c.value);
                    } else {
                        request = request.eq(`data->${c.fieldPath}`, c.value);
                    }
                }
                // != is evaluated in memory below to preserve documents where the field is undefined/null
            }
        }
    }

    const { data, error } = await request;
    if (error) throw error;

    let filteredData = data || [];
    // Strictly filter to direct children of the collection (matching depth)
    if (targetDepth > 0) {
        filteredData = filteredData.filter((row: any) => row.path.split('/').length === targetDepth);
    }

    // Apply != constraints in memory to handle missing/undefined JSON properties identically to Firestore
    if (queryRef.constraints) {
        for (const c of queryRef.constraints) {
            if (c.type === 'where' && c.opStr === '!=') {
                filteredData = filteredData.filter((row: any) => {
                    const val = row.data ? row.data[c.fieldPath] : undefined;
                    return val !== c.value;
                });
            }
        }
    }

    const docs = filteredData.map((row: any) => {
        const docId = row.path.split('/').pop();
        return {
            id: docId,
            ref: { path: row.path },
            data: () => hydrateData(row.data)
        };
    });

    return {
        size: docs.length,
        empty: docs.length === 0,
        docs,
        forEach: (cb: any) => docs.forEach(cb)
    };
};

// ============================================================================
// Batch writes — optimized for bulk execution via PostgREST array upserts
// ============================================================================
export const writeBatch = (dbInstance: any) => {
    const operations: any[] = [];
    return {
        set: (docRef: any, data: any, options?: any) => {
             operations.push({ type: 'set', docRef, data, options });
        },
        update: (docRef: any, data: any) => {
             operations.push({ type: 'update', docRef, data });
        },
        delete: (docRef: any) => {
             operations.push({ type: 'delete', docRef });
        },
        commit: async () => {
            const CHUNK_SIZE = 100;
            const CONCURRENCY = 4;
            const affectedPaths: string[] = [];

            let bulkSetMap = new Map<string, any>();
            let bulkDeletePaths: string[] = [];

            const flushBulkSets = async () => {
                if (bulkSetMap.size === 0) return;
                const rows = Array.from(bulkSetMap.values());
                bulkSetMap.clear();

                const chunks: any[][] = [];
                for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
                    chunks.push(rows.slice(i, i + CHUNK_SIZE));
                }

                for (let i = 0; i < chunks.length; i += CONCURRENCY) {
                    const slice = chunks.slice(i, i + CONCURRENCY);
                    await Promise.all(slice.map(async (chunk) => {
                        const { error } = await supabase!.from('firebase_compat').upsert(chunk, { onConflict: 'path' });
                        if (error) throw error;
                    }));
                }
            };

            const flushBulkDeletes = async () => {
                if (bulkDeletePaths.length === 0) return;
                const paths = [...bulkDeletePaths];
                bulkDeletePaths = [];

                for (let i = 0; i < paths.length; i += CHUNK_SIZE) {
                    const chunk = paths.slice(i, i + CHUNK_SIZE);
                    const { error } = await supabase!.from('firebase_compat').delete().in('path', chunk);
                    if (error) throw error;
                }
            };

            for (const op of operations) {
                const fullPath = op.docRef.path;
                affectedPaths.push(fullPath);

                if (op.type === 'set' && !op.options?.merge) {
                    await flushBulkDeletes();
                    const { projectId, collectionName } = parsePathDetails(fullPath);
                    bulkSetMap.set(fullPath, {
                        path: fullPath,
                        collection_name: collectionName,
                        project_id: projectId,
                        data: op.data,
                        updated_at: new Date().toISOString()
                    });
                } else if (op.type === 'delete') {
                    await flushBulkSets();
                    bulkDeletePaths.push(fullPath);
                } else {
                    await flushBulkSets();
                    await flushBulkDeletes();

                    if (op.type === 'set') {
                        await setDoc(op.docRef, op.data, op.options);
                    } else if (op.type === 'update') {
                        await updateDoc(op.docRef, op.data);
                    }
                }
            }

            await flushBulkSets();
            await flushBulkDeletes();

            for (const p of affectedPaths) {
                scheduleListenerNotification(p);
            }
        }
    };
};

// ============================================================================
// Array field helpers
// ============================================================================
export const arrayUnion = (...elements: any[]) => {
    return { type: 'arrayUnion', elements };
};

export const arrayRemove = (...elements: any[]) => {
    return { type: 'arrayRemove', elements };
};

// ============================================================================
// onSnapshot — registers a listener and does initial fetch.
//
// Also subscribes to Supabase Realtime as a secondary mechanism for
// cross-tab / cross-user updates. But same-tab reactivity is guaranteed
// by the local pub-sub above.
// ============================================================================
export const onSnapshot = (ref: any, onNext: (snapshot: any) => void, onError?: (error: any) => void) => {
    // Determine the collection path this listener cares about
    const collectionPath = ref.type === 'collectionGroup' ? ref.collectionId : ref.path;

    const listenerObj: Listener = { collectionPath, ref, onNext, onError };
    listeners.push(listenerObj);

    // Initial fetch
    if (ref.type === 'doc') {
        getDoc(ref).then(docSnap => {
            onNext(docSnap);
        }).catch(err => {
            console.error('onSnapshot initial fetch error:', err);
            if (onError) onError(err);
        });
    } else {
        getDocs(ref).then(querySnap => {
            onNext(querySnap);
        }).catch(err => {
            console.error('onSnapshot initial fetch error:', err);
            if (onError) onError(err);
        });
    }

    // Secondary: Supabase Realtime for cross-tab/cross-user updates (best-effort)
    let channel: any = null;
    try {
        const identifier = ref.path || ref.collectionId || 'all';
        const channelName = `compat_${identifier.replace(/[^a-zA-Z0-9]/g, '_')}_${channelCounter++}`;
        channel = supabase!.channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'firebase_compat' }, (payload: any) => {
                const changedPath = payload.new?.path || payload.old?.path || '';
                const isExactDoc = ref.type === 'doc' && changedPath === ref.path;
                const isDirectChild = ref.type !== 'doc' && ref.path &&
                    changedPath.startsWith(ref.path + '/') &&
                    changedPath.split('/').length === ref.path.split('/').length + 1;
                const isMatchingGroup = ref.type === 'collectionGroup' &&
                    (payload.new?.collection_name === ref.collectionId || payload.old?.collection_name === ref.collectionId);

                if (isExactDoc || isDirectChild || isMatchingGroup) {
                    if (ref.type === 'doc') {
                        getDoc(ref).then(onNext).catch(err => { if (onError) onError(err); });
                    } else {
                        getDocs(ref).then(onNext).catch(err => { if (onError) onError(err); });
                    }
                }
            })
            .subscribe();
    } catch (e) {
        // Realtime is best-effort; local pub-sub handles same-tab reactivity
    }

    // Unsubscribe function
    return () => {
        const index = listeners.indexOf(listenerObj);
        if (index > -1) listeners.splice(index, 1);
        if (channel) {
            try { supabase!.removeChannel(channel); } catch (e) { /* ignore */ }
        }
    };
};

// ============================================================================
// Ordering & collection groups (stubs for API compat)
// ============================================================================
export const orderBy = (fieldPath: string, directionStr: string = 'asc') => {
    return { type: 'orderBy', fieldPath, directionStr };
};

export const collectionGroup = (dbInstance: any, collectionId: string) => {
    return { type: 'collectionGroup', collectionId };
};
