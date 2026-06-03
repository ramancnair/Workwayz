import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { collection, query, where, getDocs } from '@/lib/db-provider';
import { db } from '@/lib/db-provider';

export async function GET() {
    try {
        const q = query(collection(db, 'employees'), where('isDeleted', '!=', true));
        const snapshot = await getDocs(q);
        
        const q2 = query(collection(db, 'employees'), where('isDeleted', '==', false));
        const snapshot2 = await getDocs(q2);

        const { data, error } = await supabase!.from('firebase_compat').select('*').like('path', 'employees/%');
        
        return NextResponse.json({
            snapshot1: snapshot.size,
            snapshot2: snapshot2.size,
            all_size: data?.length,
            all_data: data
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
