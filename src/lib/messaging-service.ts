import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
} from '@/lib/db-provider';
import { InternalMessage, MessageRecipient, ProjectDistro, MessagingUser } from '@/types/messaging';

export interface SendMessagePayload {
  sender: {
    id: string;
    empId: string;
    name: string;
    email: string;
    avatar?: string;
  };
  recipients: MessageRecipient[];
  subject: string;
  body: string;
  replyToId?: string;
}

/**
 * Fetches all registered employees and available project distros.
 * Every active project automatically serves as a distribution list named by its projectId.
 */
export async function fetchUsersAndDistros(db: any): Promise<{
  users: MessagingUser[];
  distros: ProjectDistro[];
}> {
  if (!db) return { users: [], distros: [] };

  try {
    const [employeesSnap, projectsSnap] = await Promise.all([
      getDocs(collection(db, 'employees')),
      getDocs(collection(db, 'projects')),
    ]);

    const users: MessagingUser[] = employeesSnap.docs
      .map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          empId: data.empId || d.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || 'Unknown',
          email: data.email || '',
          phone: data.phone || '',
          avatar: data.avatar || '',
          role: data.role,
          accessLevel: data.accessLevel,
          isDeleted: data.isDeleted,
        };
      })
      .filter((u: MessagingUser) => !u.isDeleted && u.email);

    const distros: ProjectDistro[] = projectsSnap.docs
      .map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          name: d.id, // Distro name is project id
          projectId: d.id,
          projectName: data.name || d.id,
        };
      })
      .filter((p: any) => !p.isDeleted);

    return { users, distros };
  } catch (error) {
    console.error('Error fetching users and distros:', error);
    return { users: [], distros: [] };
  }
}

/**
 * Resolves all member user IDs (empId and emails) belonging to a project distribution list.
 */
export async function resolveDistroMemberUserIds(db: any, projectId: string): Promise<string[]> {
  if (!db || !projectId) return [];

  const recipientIds = new Set<string>();

  try {
    // 1. Fetch allocated employees in the project subcollection
    const membersSnap = await getDocs(collection(db, 'projects', projectId, 'employees'));
    membersSnap.docs.forEach((d: any) => {
      const data = d.data();
      if (d.id) recipientIds.add(d.id);
      if (data.empId) recipientIds.add(data.empId);
      if (data.email) recipientIds.add(data.email.toLowerCase());
    });

    // 2. Also check if project has a projectManagerId or pmEmail
    const projectSnap = await getDoc(doc(db, 'projects', projectId));
    if (projectSnap.exists()) {
      const projData = projectSnap.data();
      if (projData.projectManagerId) {
        recipientIds.add(projData.projectManagerId);
      }
    }
  } catch (err) {
    console.error(`Error resolving distro members for project ${projectId}:`, err);
  }

  return Array.from(recipientIds);
}

/**
 * Sends an internal message to individual users and/or project distribution lists.
 */
export async function sendInternalMessage(
  db: any,
  payload: SendMessagePayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!db) return { success: false, error: 'Database connection unavailable.' };

  try {
    const senderEmpId = payload.sender.empId || payload.sender.id;
    const senderEmail = (payload.sender.email || '').toLowerCase();

    const allRecipientUserIds = new Set<string>();
    const distroIds = new Set<string>();

    for (const recipient of payload.recipients) {
      if (recipient.type === 'user') {
        if (recipient.id) allRecipientUserIds.add(recipient.id);
        if (recipient.email) allRecipientUserIds.add(recipient.email.toLowerCase());
      } else if (recipient.type === 'distro') {
        distroIds.add(recipient.id);
        const members = await resolveDistroMemberUserIds(db, recipient.id);
        members.forEach((m) => allRecipientUserIds.add(m));
      }
    }

    if (allRecipientUserIds.size === 0) {
      return { success: false, error: 'No valid recipients selected.' };
    }

    const messageData = JSON.parse(
      JSON.stringify({
        senderId: senderEmpId,
        senderName: payload.sender.name || 'User',
        senderEmail: payload.sender.email,
        senderAvatar: payload.sender.avatar || '',
        recipients: (payload.recipients || []).map((r) => {
          const item: Record<string, any> = { id: r.id, type: r.type, name: r.name };
          if (r.email) item.email = r.email;
          if (r.avatar) item.avatar = r.avatar;
          if (r.projectName) item.projectName = r.projectName;
          return item;
        }),
        recipientUserIds: Array.from(allRecipientUserIds),
        distroIds: Array.from(distroIds),
        subject: payload.subject.trim() || '(No Subject)',
        body: payload.body.trim(),
        createdAt: new Date().toISOString(),
        readBy: [],
        starredBy: [],
        deletedBy: [],
        replyToId: payload.replyToId || null,
      })
    );

    const docRef = await addDoc(collection(db, 'messages'), messageData);
    return { success: true, messageId: docRef.id };
  } catch (err: any) {
    console.error('Failed to send internal message:', err);
    return { success: false, error: err.message || 'Failed to send message.' };
  }
}

/**
 * Updates message read status for the current user.
 */
export async function markMessageRead(
  db: any,
  messageId: string,
  userIdentifiers: string[],
  isRead: boolean
): Promise<void> {
  if (!db || !messageId) return;
  const msgRef = doc(db, 'messages', messageId);
  const primaryId = userIdentifiers[0];
  if (!primaryId) return;

  try {
    if (isRead) {
      await updateDoc(msgRef, {
        readBy: arrayUnion(...userIdentifiers),
      });
    } else {
      await updateDoc(msgRef, {
        readBy: arrayRemove(...userIdentifiers),
      });
    }
  } catch (error) {
    console.error('Error updating message read status:', error);
  }
}

/**
 * Toggles message star status for the current user.
 */
export async function toggleStarMessage(
  db: any,
  messageId: string,
  userIdentifiers: string[],
  isStarred: boolean
): Promise<void> {
  if (!db || !messageId) return;
  const msgRef = doc(db, 'messages', messageId);
  try {
    if (isStarred) {
      await updateDoc(msgRef, {
        starredBy: arrayUnion(...userIdentifiers),
      });
    } else {
      await updateDoc(msgRef, {
        starredBy: arrayRemove(...userIdentifiers),
      });
    }
  } catch (error) {
    console.error('Error toggling star status:', error);
  }
}

/**
 * Soft deletes a message for the current user.
 */
export async function deleteMessageForUser(
  db: any,
  messageId: string,
  userIdentifiers: string[]
): Promise<void> {
  if (!db || !messageId) return;
  const msgRef = doc(db, 'messages', messageId);
  try {
    await updateDoc(msgRef, {
      deletedBy: arrayUnion(...userIdentifiers),
    });
  } catch (error) {
    console.error('Error deleting message for user:', error);
  }
}

/**
 * Restores a message from Trash for the current user.
 */
export async function restoreMessageForUser(
  db: any,
  messageId: string,
  userIdentifiers: string[]
): Promise<void> {
  if (!db || !messageId) return;
  const msgRef = doc(db, 'messages', messageId);
  try {
    await updateDoc(msgRef, {
      deletedBy: arrayRemove(...userIdentifiers),
    });
  } catch (error) {
    console.error('Error restoring message for user:', error);
  }
}

/**
 * Permanently deletes / clears a message from Trash for the current user.
 * If all participants have permanently deleted the message, the Firestore doc is deleted entirely.
 */
export async function permanentlyDeleteMessageForUser(
  db: any,
  messageId: string,
  userIdentifiers: string[]
): Promise<void> {
  if (!db || !messageId) return;
  const msgRef = doc(db, 'messages', messageId);
  try {
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const data = snap.data() as InternalMessage;

    const existingPurged = data.purgedBy || [];
    const updatedPurged = Array.from(new Set([...existingPurged, ...userIdentifiers]));

    const allStakeholders = new Set<string>([
      data.senderId,
      (data.senderEmail || '').toLowerCase(),
      ...(data.recipientUserIds || []).map((r) => r.toLowerCase()),
    ].filter(Boolean));

    const allStakeholdersPurged = Array.from(allStakeholders).every((stakeholder) =>
      updatedPurged.some((p) => p.toLowerCase() === stakeholder.toLowerCase())
    );

    if (allStakeholdersPurged) {
      await deleteDoc(msgRef);
    } else {
      await updateDoc(msgRef, {
        purgedBy: arrayUnion(...userIdentifiers),
      });
    }
  } catch (error) {
    console.error('Error permanently deleting message for user:', error);
    try {
      await updateDoc(msgRef, {
        purgedBy: arrayUnion(...userIdentifiers),
      });
    } catch (e) {
      console.error('Fallback permanent delete failed:', e);
    }
  }
}

/**
 * Empties all messages currently in Trash for the user.
 */
export async function emptyTrashForUser(
  db: any,
  messageIds: string[],
  userIdentifiers: string[]
): Promise<void> {
  if (!db || messageIds.length === 0) return;
  await Promise.all(
    messageIds.map((id) => permanentlyDeleteMessageForUser(db, id, userIdentifiers))
  );
}

