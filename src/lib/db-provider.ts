import * as FB from 'firebase/firestore';
import * as SB from './supabase-firestore-adapter';
import { db as fbDb } from './firebase';

const isSupa = true;
export const collection = (isSupa ? SB.collection : FB.collection) as any;
export const doc = (isSupa ? SB.doc : FB.doc) as any;
export const addDoc = (isSupa ? SB.addDoc : FB.addDoc) as any;
export const setDoc = (isSupa ? SB.setDoc : FB.setDoc) as any;
export const updateDoc = (isSupa ? SB.updateDoc : FB.updateDoc) as any;
export const deleteDoc = (isSupa ? SB.deleteDoc : FB.deleteDoc) as any;
export const getDoc = (isSupa ? SB.getDoc : FB.getDoc) as any;
export const query = (isSupa ? SB.query : FB.query) as any;
export const where = (isSupa ? SB.where : FB.where) as any;
export const getDocs = (isSupa ? SB.getDocs : FB.getDocs) as any;
export const writeBatch = (isSupa ? SB.writeBatch : FB.writeBatch) as any;
export const arrayUnion = (isSupa ? SB.arrayUnion : FB.arrayUnion) as any;
export const arrayRemove = (isSupa ? SB.arrayRemove : FB.arrayRemove) as any;
export const onSnapshot = (isSupa ? SB.onSnapshot : FB.onSnapshot) as any;
export const Timestamp = (isSupa ? SB.Timestamp : FB.Timestamp) as any;
export const orderBy = (isSupa ? SB.orderBy : FB.orderBy) as any;
export const collectionGroup = (isSupa ? SB.collectionGroup : FB.collectionGroup) as any;

import { supabase } from './supabase';
export const db = (isSupa ? supabase : fbDb) as any;
export type Firestore = any;
