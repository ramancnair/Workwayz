'use client';

import React from 'react';
import { InternalMessage, MessageFolder } from '@/types/messaging';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getUserInitials } from '@/lib/utils';
import { Star, FolderKanban, Trash2, Mail, MailOpen } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface MessageListProps {
  messages: InternalMessage[];
  selectedMessageId: string | null;
  onSelectMessage: (message: InternalMessage) => void;
  userIdentifiers: string[];
  folder: MessageFolder;
  onToggleStar: (messageId: string, isStarred: boolean) => void;
  onDeleteMessage: (messageId: string) => void;
}

function formatMessageDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    if (isToday(d)) {
      return format(d, 'h:mm a');
    }
    if (isYesterday(d)) {
      return 'Yesterday';
    }
    return format(d, 'MMM d');
  } catch {
    return '';
  }
}

export function MessageList({
  messages,
  selectedMessageId,
  onSelectMessage,
  userIdentifiers,
  folder,
  onToggleStar,
  onDeleteMessage,
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full text-muted-foreground">
        <Mail className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium">No messages in {folder}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {folder === 'inbox'
            ? 'Incoming messages and project distro broadcasts will appear here.'
            : folder === 'sent'
            ? 'Messages you send to team members or project distros will appear here.'
            : folder === 'starred'
            ? 'Star important messages to easily find them here.'
            : 'Deleted messages will appear here.'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border overflow-y-auto h-full">
      {messages.map((msg) => {
        const isRead = userIdentifiers.some((id) => msg.readBy?.includes(id));
        const isStarred = userIdentifiers.some((id) => msg.starredBy?.includes(id));
        const isSelected = selectedMessageId === msg.id;

        // In Sent folder, show recipient summary instead of sender
        const displayName =
          folder === 'sent'
            ? `To: ${msg.recipients.map((r) => r.name).join(', ')}`
            : msg.senderName;

        return (
          <div
            key={msg.id}
            onClick={() => onSelectMessage(msg)}
            className={`group relative flex items-start gap-3 p-3.5 cursor-pointer transition-colors ${
              isSelected
                ? 'bg-primary/10 dark:bg-primary/15'
                : isRead
                ? 'hover:bg-muted/50 bg-background'
                : 'hover:bg-muted/60 bg-muted/20 font-medium'
            }`}
          >
            {/* Unread indicator dot */}
            {!isRead && folder === 'inbox' && (
              <span className="absolute left-1.5 top-5 h-2 w-2 rounded-full bg-primary" />
            )}

            {/* Avatar */}
            <Avatar className="h-9 w-9 shrink-0 mt-0.5 border">
              <AvatarImage src={msg.senderAvatar} alt={msg.senderName} />
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                {getUserInitials(null, null, msg.senderName)}
              </AvatarFallback>
            </Avatar>

            {/* Content preview */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span
                  className={`text-sm truncate ${
                    !isRead && folder === 'inbox'
                      ? 'font-bold text-foreground'
                      : 'font-medium text-foreground/90'
                  }`}
                >
                  {displayName}
                </span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 font-normal">
                  {formatMessageDate(msg.createdAt)}
                </span>
              </div>

              {/* Subject & Distro Badges */}
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                {msg.distroIds && msg.distroIds.length > 0 && (
                  msg.distroIds.map((distroId) => (
                    <Badge
                      key={distroId}
                      variant="outline"
                      className="text-[10px] py-0 px-1.5 h-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 font-mono font-semibold"
                    >
                      <FolderKanban className="h-2.5 w-2.5" />
                      {distroId}
                    </Badge>
                  ))
                )}
                <span
                  className={`text-xs truncate ${
                    !isRead && folder === 'inbox'
                      ? 'font-semibold text-foreground'
                      : 'text-foreground/80'
                  }`}
                >
                  {msg.subject || '(No Subject)'}
                </span>
              </div>

              {/* Body snippet */}
              <p className="text-xs text-muted-foreground line-clamp-1 break-words font-normal">
                {msg.body}
              </p>
            </div>

            {/* Actions: Star & Delete */}
            <div className="flex items-center gap-1 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-amber-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(msg.id, !isStarred);
                }}
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    isStarred
                      ? 'fill-amber-400 text-amber-500 opacity-100'
                      : 'text-muted-foreground'
                  }`}
                />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMessage(msg.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
