import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

export const db = supabase;

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

export const collection = (dbInstance: any, ...paths: string[]) => {
    return { type: 'collection', path: paths.join('/') };
};


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

export const doc = (dbInstanceOrCol: any, ...paths: string[]) => {
    if (typeof dbInstanceOrCol === 'object' && dbInstanceOrCol.type === 'collection') {
        return { type: 'doc', path: `${dbInstanceOrCol.path}/${paths.join('/')}` };
    }
    return { type: 'doc', path: paths.join('/') };
};

export const addDoc = async (colRef: any, data: any) => {
    const docId = uuidv4();
    const fullPath = `${colRef.path}/${docId}`;
    const parts = fullPath.split('/');
    
    // projects/project_id/collection_name/...
    let projectId = null;
    let collectionName = parts[parts.length - 2];
    
    if (parts[0] === 'projects' && parts.length > 2) {
        projectId = parts[1];
    } else if (parts[0] !== 'projects') {
        collectionName = parts[0];
    }

    const { error } = await supabase!.from('firebase_compat').insert({
        path: fullPath,
        collection_name: collectionName,
        project_id: projectId,
        data: data
    });

    if (error) throw error;
    return { id: docId, path: fullPath };
};

export const setDoc = async (docRef: any, data: any, options?: { merge?: boolean }) => {
    const fullPath = docRef.path;
    const parts = fullPath.split('/');
    let projectId = null;
    let collectionName = parts[parts.length - 2] || 'unknown';

    if (parts[0] === 'projects') {
        projectId = parts[1];
        if (parts.length === 2) {
            collectionName = 'projects'; // root project doc
        }
    } else if (parts[0] !== 'projects') {
        collectionName = parts[0];
    }

    if (options?.merge) {
        // Fetch existing data to merge
        const { data: existing } = await supabase!.from('firebase_compat').select('data').eq('path', fullPath).single();
        let mergedData = existing ? { ...existing.data } : {};
        
        // Handle arrayUnion / arrayRemove and merge normal fields
        for (const key in data) {
            if (data[key] && data[key].type === 'arrayUnion') {
                const currentArr = Array.isArray(mergedData[key]) ? mergedData[key] : [];
                mergedData[key] = [...currentArr, ...data[key].elements];
            } else if (data[key] && data[key].type === 'arrayRemove') {
                const currentArr = Array.isArray(mergedData[key]) ? mergedData[key] : [];
                // naive removal, doesn't handle deep equality perfectly
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
};

export const updateDoc = async (docRef: any, data: any) => {
    return setDoc(docRef, data, { merge: true });
};

export const deleteDoc = async (docRef: any) => {
    const { error } = await supabase!.from('firebase_compat').delete().eq('path', docRef.path);
    if (error) throw error;
};

export const getDoc = async (docRef: any) => {
    const { data, error } = await supabase!.from('firebase_compat').select('*').eq('path', docRef.path).single();
    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    const docId = docRef.path.split('/').pop();
    
    // Parse timestamps back from ISO strings if needed, though they are stored as JSON strings
    // We will just let the app handle it as strings or convert if needed
    
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
    
    if (queryRef.path) {
        // It's a collection, so filter by path prefix
        request = request.like('path', `${queryRef.path}/%`);
    }

    if (queryRef.constraints) {
        for (const c of queryRef.constraints) {
            if (c.type === 'where') {
                if (c.opStr === '==') {
                    // Supabase JSONB containment or equality
                    // Using ->> for top level text keys, but for robust types we might need specific casting
                    // For now, we assume simple string/number equality
                    if (typeof c.value === 'string') {
                        request = request.eq(`data->>${c.fieldPath}`, c.value);
                    } else if (typeof c.value === 'boolean') {
                        request = request.eq(`data->${c.fieldPath}`, c.value);
                    } else {
                        // For numbers etc
                        request = request.eq(`data->${c.fieldPath}`, c.value);
                    }
                } else if (c.opStr === '!=') {
                     if (typeof c.value === 'string') {
                        request = request.neq(`data->>${c.fieldPath}`, c.value);
                    } else {
                        request = request.neq(`data->${c.fieldPath}`, c.value);
                    }
                }
            }
        }
    }

    const { data, error } = await request;
    if (error) console.error('getDocs error:', error);
    if (error) throw error;

    const docs = data.map((row: any) => {
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
            // Sequential await to mimic batch since Supabase js doesn't have a bulk mixed ops easily yet
            for (const op of operations) {
                if (op.type === 'set') {
                    await setDoc(op.docRef, op.data, op.options);
                } else if (op.type === 'update') {
                    await updateDoc(op.docRef, op.data);
                } else if (op.type === 'delete') {
                    await deleteDoc(op.docRef);
                }
            }
        }
    };
};

// Simplified array operations. These would typically require RPC or reading then writing
// For arrayUnion/arrayRemove, we return a special object and handle it in updateDoc if we want strict compatibility,
// but for now, we can just return the raw values and hope the app logic doesn't strictly rely on atomic array operations.
// Wait, the context appends to arrays!
export const arrayUnion = (...elements: any[]) => {
    return { type: 'arrayUnion', elements };
};

export const arrayRemove = (...elements: any[]) => {
    return { type: 'arrayRemove', elements };
};

export const onSnapshot = (ref: any, onNext: (snapshot: any) => void, onError?: (error: any) => void) => {
    let initialFetchComplete = false;
    
    // Initial fetch
    if (ref.type === 'doc') {
        getDoc(ref).then(docSnap => {
            onNext(docSnap);
            initialFetchComplete = true;
        }).catch(err => { console.error('onSnapshot fetch error:', err); if (onError) onError(err); });
    } else {
        getDocs(ref).then(querySnap => {
            onNext(querySnap);
            initialFetchComplete = true;
        }).catch(err => { console.error('onSnapshot fetch error:', err); if (onError) onError(err); });
    }

    // Subscribe to changes
    // In a real app we'd filter the channel down, but for simplicity we subscribe to all and filter client side
    const channelName = `compat_${ref.path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    const channel = supabase!.channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'firebase_compat' }, (payload: any) => {
            // Re-fetch everything for simplicity when a change happens that matches our path
            if (payload.new && payload.new.path && payload.new.path.startsWith(ref.path) || 
                payload.old && payload.old.path && payload.old.path.startsWith(ref.path)) {
                
                if (ref.type === 'doc') {
                    getDoc(ref).then(onNext).catch(onError);
                } else {
                    getDocs(ref).then(onNext).catch(onError);
                }
            }
        })
        .subscribe();

    return () => {
        supabase!.removeChannel(channel);
    };
};

export const orderBy = (fieldPath: string, directionStr: string = 'asc') => {
    return { type: 'orderBy', fieldPath, directionStr };
};

export const collectionGroup = (dbInstance: any, collectionId: string) => {
    return { type: 'collectionGroup', collectionId };
};
