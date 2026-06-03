import * as FB from 'firebase/firestore';
import * as SB from './supabase-firestore-adapter';
import { db as fbDb } from './firebase';

const isSupa = true;
export const collection = isSupa ? SB.collection : FB.collection;
export const doc = isSupa ? SB.doc : FB.doc;
export const addDoc = isSupa ? SB.addDoc : FB.addDoc;
export const setDoc = isSupa ? SB.setDoc : FB.setDoc;
export const updateDoc = isSupa ? SB.updateDoc : FB.updateDoc;
export const deleteDoc = isSupa ? SB.deleteDoc : FB.deleteDoc;
export const getDoc = isSupa ? SB.getDoc : FB.getDoc;
export const query = isSupa ? SB.query : FB.query;
export const where = isSupa ? SB.where : FB.where;
export const getDocs = isSupa ? SB.getDocs : FB.getDocs;
export const writeBatch = isSupa ? SB.writeBatch : FB.writeBatch;
export const arrayUnion = isSupa ? SB.arrayUnion : FB.arrayUnion;
export const arrayRemove = isSupa ? SB.arrayRemove : FB.arrayRemove;
export const onSnapshot = isSupa ? SB.onSnapshot : FB.onSnapshot;
export const Timestamp = isSupa ? SB.Timestamp : FB.Timestamp;
export const orderBy = isSupa ? SB.orderBy : FB.orderBy;
export const collectionGroup = isSupa ? SB.collectionGroup : FB.collectionGroup;

import { supabase } from './supabase';
export const db = isSupa ? supabase : fbDb;
console.log('DB PROVIDER INITIALIZING', { isSupa, provider: process.env.NEXT_PUBLIC_DATABASE_PROVIDER, supaDb: SB.db, fbDb, db });
