export type RecipientType = 'user' | 'distro';

export interface MessageRecipient {
  id: string;              // empId or projectId
  type: RecipientType;     // 'user' for individual employee, 'distro' for project distribution list
  name: string;            // User's name or Project Distro name (e.g., "P2600001")
  email?: string;          // User's email or distro ID
  avatar?: string;
  projectName?: string;    // If distro, original project name
}

export interface InternalMessage {
  id: string;
  senderId: string;        // empId / id of sender
  senderName: string;
  senderEmail: string;
  senderAvatar?: string;
  recipients: MessageRecipient[];
  recipientUserIds: string[]; // Flat list of all resolved user IDs (empId / email) who receive this in their Inbox
  distroIds?: string[];       // Project IDs if sent via distro
  subject: string;
  body: string;
  createdAt: string;          // ISO timestamp string
  readBy: string[];           // User IDs who marked this as read
  starredBy?: string[];       // User IDs who starred this message
  deletedBy?: string[];       // User IDs who deleted this message
  purgedBy?: string[];        // User IDs who permanently cleared this message from Trash
  replyToId?: string;         // Parent message ID if this is a reply
}

export interface ProjectDistro {
  id: string;                 // Project ID (e.g., "P2600001")
  name: string;               // Distro name is project ID
  projectId: string;
  projectName: string;
  memberCount?: number;
}

export type MessageFolder = 'inbox' | 'sent' | 'starred' | 'trash';

export interface MessagingUser {
  id: string;
  empId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  avatar?: string;
  role?: string;
  accessLevel?: string;
  isDeleted?: boolean;
}
