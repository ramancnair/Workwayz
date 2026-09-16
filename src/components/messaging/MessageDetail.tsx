'use client';

import React from 'react';
import { InternalMessage, MessageFolder } from '@/types/messaging';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getUserInitials } from '@/lib/utils';
import {
  Reply,
  ReplyAll,
  Star,
  Trash2,
  Mail,
  MailOpen,
  FolderKanban,
  User as UserIcon,
  Calendar,
  Clock,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';

interface MessageDetailProps {
  message: InternalMessage | null;
  userIdentifiers: string[];
  folder?: MessageFolder;
  onReply: (message: InternalMessage) => void;
  onReplyAll: (message: InternalMessage) => void;
  onToggleStar: (messageId: string, isStarred: boolean) => void;
  onToggleRead: (messageId: string, isRead: boolean) => void;
  onDeleteMessage: (messageId: string) => void;
  onRestoreMessage?: (messageId: string) => void;
  onBackToList?: () => void;
}

export function MessageDetail({
  message,
  userIdentifiers,
  folder,
  onReply,
  onReplyAll,
  onToggleStar,
  onToggleRead,
  onDeleteMessage,
  onRestoreMessage,
  onBackToList,
}: MessageDetailProps) {
  if (!message) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
        <Mail className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-base font-medium text-foreground/80">No message selected</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Select an internal message from the list on the left to read its full content or reply to team members.
        </p>
      </div>
    );
  }

  const isRead = userIdentifiers.some((id) => message.readBy?.includes(id));
  const isStarred = userIdentifiers.some((id) => message.starredBy?.includes(id));
  const hasMultipleRecipients =
    message.recipients.length > 1 || (message.distroIds && message.distroIds.length > 0);

  let formattedDate = '';
  try {
    formattedDate = format(new Date(message.createdAt), "EEEE, MMMM d, yyyy 'at' h:mm a");
  } catch {
    formattedDate = message.createdAt;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          {onBackToList && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onBackToList}
              className="md:hidden h-8 w-8 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          {folder === 'trash' ? (
            onRestoreMessage && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRestoreMessage(message.id)}
                className="gap-1.5 h-8 text-xs font-medium"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </Button>
            )
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReply(message)}
                className="gap-1.5 h-8 text-xs font-medium"
              >
                <Reply className="h-3.5 w-3.5" />
                Reply
              </Button>

              {hasMultipleRecipients && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReplyAll(message)}
                  className="gap-1.5 h-8 text-xs font-medium"
                >
                  <ReplyAll className="h-3.5 w-3.5" />
                  Reply All
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {folder !== 'trash' && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-amber-500"
                onClick={() => onToggleStar(message.id, !isStarred)}
                title={isStarred ? 'Unstar' : 'Star'}
              >
                <Star
                  className={`h-4 w-4 ${
                    isStarred
                      ? 'fill-amber-400 text-amber-500'
                      : 'text-muted-foreground'
                  }`}
                />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onToggleRead(message.id, !isRead)}
                title={isRead ? 'Mark as unread' : 'Mark as read'}
              >
                {isRead ? (
                  <Mail className="h-4 w-4" />
                ) : (
                  <MailOpen className="h-4 w-4" />
                )}
              </Button>
            </>
          )}

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDeleteMessage(message.id)}
            title={folder === 'trash' ? 'Delete permanently' : 'Delete message'}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Message Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Trash Alert Banner */}
        {folder === 'trash' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-destructive/10 border border-destructive/25 rounded-lg text-xs text-destructive">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 shrink-0" />
              <span>This message is in your Trash folder.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onRestoreMessage && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRestoreMessage(message.id)}
                  className="h-7 text-xs gap-1.5 border-destructive/30 hover:bg-destructive/10 text-foreground"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDeleteMessage(message.id)}
                className="h-7 text-xs gap-1.5"
              >
                <Trash2 className="h-3 w-3" />
                Delete Permanently
              </Button>
            </div>
          </div>
        )}

        {/* Distro Alert Banner (if addressed to a project distro) */}
        {message.distroIds && message.distroIds.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg text-xs text-amber-700 dark:text-amber-300">
            <FolderKanban className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              This message was broadcast to Project Distribution List:{' '}
              <strong className="font-mono font-bold">
                {message.distroIds.join(', ')}
              </strong>{' '}
              and delivered to all allocated project members.
            </span>
          </div>
        )}

        {/* Subject Header */}
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            {message.subject || '(No Subject)'}
          </h2>
        </div>

        {/* Sender & Recipient Information Card */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="h-10 w-10 shrink-0 border shadow-sm mt-0.5">
              <AvatarImage src={message.senderAvatar} alt={message.senderName} />
              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                {getUserInitials(null, null, message.senderName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">
                  {message.senderName}
                </span>
                <span className="text-xs text-muted-foreground">
                  &lt;{message.senderEmail}&gt;
                </span>
              </div>

              {/* Recipients list */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">To:</span>
                {message.recipients.map((r) => (
                  <Badge
                    key={r.id}
                    variant="outline"
                    className="text-[11px] py-0 px-2 font-normal gap-1 bg-background"
                  >
                    {r.type === 'distro' ? (
                      <FolderKanban className="h-3 w-3 text-amber-500" />
                    ) : (
                      <UserIcon className="h-3 w-3 text-primary" />
                    )}
                    <span>{r.name}</span>
                    {r.type === 'distro' && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 py-0 rounded font-mono font-bold">
                        Distro
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0 text-xs text-muted-foreground hidden sm:block">
            <div className="flex items-center gap-1 justify-end font-medium">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Message Body */}
        <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap font-sans break-words selection:bg-primary/20">
          {message.body}
        </div>
      </div>
    </div>
  );
}
