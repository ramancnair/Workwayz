'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, query, onSnapshot, orderBy } from '@/lib/db-provider';
import { InternalMessage, MessageFolder } from '@/types/messaging';
import { ComposeMessageDialog } from '@/components/messaging/ComposeMessageDialog';
import { MessageList } from '@/components/messaging/MessageList';
import { MessageDetail } from '@/components/messaging/MessageDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Inbox,
  Send,
  Star,
  Trash2,
  PenSquare,
  Search,
  RotateCcw,
  Mail,
  Filter,
} from 'lucide-react';
import {
  markMessageRead,
  toggleStarMessage,
  deleteMessageForUser,
  restoreMessageForUser,
} from '@/lib/messaging-service';
import { useToast } from '@/hooks/use-toast';

export default function MessagesPage() {
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    empId: string;
    name: string;
    email: string;
    avatar?: string;
  }>({ id: '', empId: '', name: '', email: '', avatar: '' });

  const [currentFolder, setCurrentFolder] = useState<MessageFolder>('inbox');
  const [allRawMessages, setAllRawMessages] = useState<InternalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMessage, setSelectedMessage] = useState<InternalMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<InternalMessage | null>(null);
  const [replyAll, setReplyAll] = useState(false);

  // Load current user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('projectflow_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser({
          id: parsed.id || parsed.empId || '',
          empId: parsed.empId || parsed.id || '',
          name: parsed.name || 'User',
          email: parsed.email || '',
          avatar: parsed.avatar || '',
        });
      } catch (e) {
        console.error('Failed to parse user from local storage:', e);
      }
    }
  }, []);

  const userIdentifiers = useMemo(() => {
    return [
      currentUser.empId,
      currentUser.id,
      (currentUser.email || '').toLowerCase(),
    ].filter(Boolean);
  }, [currentUser]);

  // Real-time Firestore message subscription
  useEffect(() => {
    if (!db || userIdentifiers.length === 0) return;

    setIsLoading(true);
    try {
      const q = query(collection(db, 'messages'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot: any) => {
          const fetched: InternalMessage[] = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Sort by createdAt descending
          fetched.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          setAllRawMessages(fetched);
          setIsLoading(false);
        },
        (err: any) => {
          if (
            err?.code === 'permission-denied' ||
            String(err?.message || '').toLowerCase().includes('permission') ||
            (typeof window !== 'undefined' && (window as any).__isLoggingOut)
          ) {
            return;
          }
          console.warn('Failed to subscribe to messages:', err);
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Error attaching message snapshot listener:', err);
      setIsLoading(false);
    }
  }, [userIdentifiers]);

  // Filter messages by active folder
  const folderMessages = useMemo(() => {
    if (userIdentifiers.length === 0) return [];

    return allRawMessages.filter((msg) => {
      const isDeleted = userIdentifiers.some((id) => msg.deletedBy?.includes(id));
      const isSender = userIdentifiers.some(
        (id) =>
          msg.senderId?.toLowerCase() === id.toLowerCase() ||
          msg.senderEmail?.toLowerCase() === id.toLowerCase()
      );
      const isRecipient = userIdentifiers.some((id) =>
        msg.recipientUserIds?.map((r) => r.toLowerCase()).includes(id.toLowerCase())
      );
      const isStarred = userIdentifiers.some((id) => msg.starredBy?.includes(id));

      if (currentFolder === 'trash') {
        return isDeleted && (isRecipient || isSender);
      }

      if (isDeleted) return false;

      switch (currentFolder) {
        case 'inbox':
          return isRecipient;
        case 'sent':
          return isSender;
        case 'starred':
          return isStarred && (isRecipient || isSender);
        default:
          return false;
      }
    });
  }, [allRawMessages, userIdentifiers, currentFolder]);

  // Apply search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return folderMessages;
    const q = searchQuery.toLowerCase();
    return folderMessages.filter(
      (m) =>
        m.subject?.toLowerCase().includes(q) ||
        m.body?.toLowerCase().includes(q) ||
        m.senderName?.toLowerCase().includes(q) ||
        m.senderEmail?.toLowerCase().includes(q) ||
        m.distroIds?.some((d) => d.toLowerCase().includes(q)) ||
        m.recipients?.some((r) => r.name.toLowerCase().includes(q))
    );
  }, [folderMessages, searchQuery]);

  // Keep selected message synchronized with fresh data
  useEffect(() => {
    if (selectedMessage) {
      const fresh = allRawMessages.find((m) => m.id === selectedMessage.id);
      if (fresh) {
        setSelectedMessage(fresh);
      }
    }
  }, [allRawMessages]);

  // Folder Unread / Item Counters
  const unreadCounts = useMemo(() => {
    let inbox = 0;
    let starred = 0;

    allRawMessages.forEach((msg) => {
      const isDeleted = userIdentifiers.some((id) => msg.deletedBy?.includes(id));
      if (isDeleted) return;

      const isRecipient = userIdentifiers.some((id) =>
        msg.recipientUserIds?.map((r) => r.toLowerCase()).includes(id.toLowerCase())
      );
      const isRead = userIdentifiers.some((id) => msg.readBy?.includes(id));
      const isStarred = userIdentifiers.some((id) => msg.starredBy?.includes(id));

      if (isRecipient && !isRead) inbox++;
      if (isStarred) starred++;
    });

    return { inbox, starred };
  }, [allRawMessages, userIdentifiers]);

  // Handler: Select message and automatically mark as read if in inbox
  const handleSelectMessage = (msg: InternalMessage) => {
    setSelectedMessage(msg);
    const isRead = userIdentifiers.some((id) => msg.readBy?.includes(id));
    if (!isRead && currentFolder === 'inbox') {
      markMessageRead(db, msg.id, userIdentifiers, true);
    }
  };

  // Handler: Toggle Star
  const handleToggleStar = (messageId: string, isStarred: boolean) => {
    toggleStarMessage(db, messageId, userIdentifiers, isStarred);
  };

  // Handler: Toggle Read
  const handleToggleRead = (messageId: string, isRead: boolean) => {
    markMessageRead(db, messageId, userIdentifiers, isRead);
  };

  // Handler: Delete message (soft delete)
  const handleDeleteMessage = (messageId: string) => {
    deleteMessageForUser(db, messageId, userIdentifiers);
    toast({
      title: 'Message Deleted',
      description: 'Moved to Trash folder.',
    });
    if (selectedMessage?.id === messageId) {
      setSelectedMessage(null);
    }
  };

  // Handler: Reply
  const handleReply = (msg: InternalMessage) => {
    setReplyToMessage(msg);
    setReplyAll(false);
    setIsComposeOpen(true);
  };

  // Handler: Reply All
  const handleReplyAll = (msg: InternalMessage) => {
    setReplyToMessage(msg);
    setReplyAll(true);
    setIsComposeOpen(true);
  };

  // Handler: Compose New
  const handleNewMessage = () => {
    setReplyToMessage(null);
    setReplyAll(false);
    setIsComposeOpen(true);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* 1. Folders Navigation Column */}
      <div className="w-56 md:w-64 border-r border-border bg-muted/20 flex flex-col shrink-0">
        {/* Compose Button */}
        <div className="p-4 border-b border-border">
          <Button
            onClick={handleNewMessage}
            className="w-full gap-2 shadow-sm font-semibold justify-start"
          >
            <PenSquare className="h-4 w-4" />
            <span>New Message</span>
          </Button>
        </div>

        {/* Folder List */}
        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          <Button
            variant={currentFolder === 'inbox' ? 'secondary' : 'ghost'}
            className="w-full justify-between font-medium text-sm h-10 px-3"
            onClick={() => {
              setCurrentFolder('inbox');
              setSelectedMessage(null);
            }}
          >
            <div className="flex items-center gap-2.5">
              <Inbox className="h-4 w-4 text-primary" />
              <span>Inbox</span>
            </div>
            {unreadCounts.inbox > 0 && (
              <Badge className="h-5 px-1.5 text-[11px] font-bold bg-primary text-primary-foreground">
                {unreadCounts.inbox > 99 ? '99+' : unreadCounts.inbox}
              </Badge>
            )}
          </Button>

          <Button
            variant={currentFolder === 'sent' ? 'secondary' : 'ghost'}
            className="w-full justify-between font-medium text-sm h-10 px-3"
            onClick={() => {
              setCurrentFolder('sent');
              setSelectedMessage(null);
            }}
          >
            <div className="flex items-center gap-2.5">
              <Send className="h-4 w-4 text-muted-foreground" />
              <span>Sent</span>
            </div>
          </Button>

          <Button
            variant={currentFolder === 'starred' ? 'secondary' : 'ghost'}
            className="w-full justify-between font-medium text-sm h-10 px-3"
            onClick={() => {
              setCurrentFolder('starred');
              setSelectedMessage(null);
            }}
          >
            <div className="flex items-center gap-2.5">
              <Star className="h-4 w-4 text-amber-500" />
              <span>Starred</span>
            </div>
            {unreadCounts.starred > 0 && (
              <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-medium">
                {unreadCounts.starred}
              </Badge>
            )}
          </Button>

          <Button
            variant={currentFolder === 'trash' ? 'secondary' : 'ghost'}
            className="w-full justify-between font-medium text-sm h-10 px-3"
            onClick={() => {
              setCurrentFolder('trash');
              setSelectedMessage(null);
            }}
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="h-4 w-4 text-muted-foreground" />
              <span>Trash</span>
            </div>
          </Button>
        </div>

        {/* User Status Footer */}
        <div className="p-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
          <span className="truncate">{currentUser.email || 'Logged in'}</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
        </div>
      </div>

      {/* 2. Message List Panel */}
      <div
        className={`w-80 md:w-96 border-r border-border flex flex-col shrink-0 ${
          selectedMessage ? 'hidden md:flex' : 'flex flex-1 md:flex-initial'
        }`}
      >
        {/* Search & Filter Header */}
        <div className="p-3 border-b border-border bg-background/50 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="pl-8 h-9 text-xs"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="capitalize font-semibold text-foreground">
              {currentFolder}
            </span>
            <span>{filteredMessages.length} message{filteredMessages.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        {/* Message Items List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
              Loading messages...
            </div>
          ) : (
            <MessageList
              messages={filteredMessages}
              selectedMessageId={selectedMessage?.id || null}
              onSelectMessage={handleSelectMessage}
              userIdentifiers={userIdentifiers}
              folder={currentFolder}
              onToggleStar={handleToggleStar}
              onDeleteMessage={handleDeleteMessage}
            />
          )}
        </div>
      </div>

      {/* 3. Message Detail Panel */}
      <div
        className={`flex-1 flex flex-col overflow-hidden ${
          !selectedMessage ? 'hidden md:flex' : 'flex'
        }`}
      >
        <MessageDetail
          message={selectedMessage}
          userIdentifiers={userIdentifiers}
          onReply={handleReply}
          onReplyAll={handleReplyAll}
          onToggleStar={handleToggleStar}
          onToggleRead={handleToggleRead}
          onDeleteMessage={handleDeleteMessage}
          onBackToList={() => setSelectedMessage(null)}
        />
      </div>

      {/* Compose Message Dialog */}
      <ComposeMessageDialog
        open={isComposeOpen}
        onOpenChange={setIsComposeOpen}
        currentUser={currentUser}
        replyToMessage={replyToMessage}
        replyAll={replyAll}
        onMessageSent={() => {
          // Switch to Sent folder after composing a new message
          if (!replyToMessage) {
            setCurrentFolder('sent');
          }
        }}
      />
    </div>
  );
}
