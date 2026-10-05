'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserInitials } from '@/lib/utils';
import {
  Send,
  X,
  User as UserIcon,
  Users,
  Search,
  Check,
  Building2,
  FolderKanban,
  Sparkles,
} from 'lucide-react';
import { db } from '@/lib/db-provider';
import { useToast } from '@/hooks/use-toast';
import {
  InternalMessage,
  MessageRecipient,
  ProjectDistro,
  MessagingUser,
} from '@/types/messaging';
import { fetchUsersAndDistros, sendInternalMessage } from '@/lib/messaging-service';

interface ComposeMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: {
    id: string;
    empId: string;
    name: string;
    email: string;
    avatar?: string;
  };
  replyToMessage?: InternalMessage | null;
  replyAll?: boolean;
  onMessageSent?: () => void;
}

export function ComposeMessageDialog({
  open,
  onOpenChange,
  currentUser,
  replyToMessage,
  replyAll = false,
  onMessageSent,
}: ComposeMessageDialogProps) {
  const { toast } = useToast();

  const [availableUsers, setAvailableUsers] = useState<MessagingUser[]>([]);
  const [availableDistros, setAvailableDistros] = useState<ProjectDistro[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);

  const [selectedRecipients, setSelectedRecipients] = useState<MessageRecipient[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Recipient search popover/dropdown state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Load available recipients (users and project distros)
  useEffect(() => {
    if (!open) return;
    setIsLoadingRecipients(true);
    fetchUsersAndDistros(db)
      .then(({ users, distros }) => {
        // Exclude current user from regular user pick list
        const otherUsers = users.filter(
          (u) =>
            u.empId !== currentUser.empId &&
            u.id !== currentUser.id &&
            u.email?.toLowerCase() !== currentUser.email?.toLowerCase()
        );
        setAvailableUsers(otherUsers);
        setAvailableDistros(distros);
      })
      .finally(() => setIsLoadingRecipients(false));
  }, [open, currentUser]);

  // Handle reply / reply-all initialization
  useEffect(() => {
    if (!open) {
      setSelectedRecipients([]);
      setSubject('');
      setBody('');
      setSearchQuery('');
      setIsSearchOpen(false);
      return;
    }

    if (replyToMessage) {
      const isRe = replyToMessage.subject.toLowerCase().startsWith('re:');
      setSubject(isRe ? replyToMessage.subject : `Re: ${replyToMessage.subject}`);

      const recipients: MessageRecipient[] = [];

      // Add original sender
      recipients.push({
        id: replyToMessage.senderId,
        type: 'user',
        name: replyToMessage.senderName,
        email: replyToMessage.senderEmail,
        avatar: replyToMessage.senderAvatar,
      });

      // If reply all, add other recipients too
      if (replyAll && replyToMessage.recipients) {
        replyToMessage.recipients.forEach((r) => {
          const isCurrentUser =
            r.id === currentUser.empId ||
            r.id === currentUser.id ||
            r.email?.toLowerCase() === currentUser.email?.toLowerCase();
          const alreadyAdded = recipients.some((existing) => existing.id === r.id);
          if (!isCurrentUser && !alreadyAdded) {
            recipients.push(r);
          }
        });
      }

      setSelectedRecipients(recipients);

      // Add a quoted signature block at bottom
      const quoteHeader = `\n\n--- Original Message from ${replyToMessage.senderName} (${new Date(
        replyToMessage.createdAt
      ).toLocaleString()}) ---\n`;
      setBody(`${quoteHeader}> ${replyToMessage.body.split('\n').join('\n> ')}\n`);
    } else {
      setSelectedRecipients([]);
      setSubject('');
      setBody('');
    }
  }, [open, replyToMessage, replyAll, currentUser]);

  // Filter users & distros based on query
  const filteredDistros = useMemo(() => {
    if (!searchQuery.trim()) return availableDistros;
    const q = searchQuery.toLowerCase();
    return availableDistros.filter(
      (d) => d.id.toLowerCase().includes(q) || d.projectName.toLowerCase().includes(q)
    );
  }, [availableDistros, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;
    const q = searchQuery.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.empId?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [availableUsers, searchQuery]);

  const handleAddRecipient = (recipient: MessageRecipient) => {
    if (selectedRecipients.some((r) => r.id === recipient.id)) {
      setSelectedRecipients(selectedRecipients.filter((r) => r.id !== recipient.id));
    } else {
      setSelectedRecipients([...selectedRecipients, recipient]);
    }
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleRemoveRecipient = (id: string) => {
    setSelectedRecipients(selectedRecipients.filter((r) => r.id !== id));
  };

  const handleSend = async () => {
    if (selectedRecipients.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Missing Recipient',
        description: 'Please specify at least one recipient or project distro.',
      });
      return;
    }

    if (!subject.trim() && !body.trim()) {
      toast({
        variant: 'destructive',
        title: 'Empty Message',
        description: 'Please provide a subject or message content.',
      });
      return;
    }

    setIsSending(true);
    try {
      const res = await sendInternalMessage(db, {
        sender: currentUser,
        recipients: selectedRecipients,
        subject: subject.trim(),
        body: body.trim(),
        replyToId: replyToMessage?.id,
      });

      if (res.success) {
        toast({
          title: 'Message Sent',
          description: `Your message has been sent to ${selectedRecipients.length} recipient${
            selectedRecipients.length > 1 ? 's' : ''
          }.`,
        });
        onOpenChange(false);
        if (onMessageSent) onMessageSent();
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to Send',
          description: res.error || 'Could not send the message.',
        });
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast({
        variant: 'destructive',
        title: 'Send Error',
        description: err.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden" bypassScrollWrapper={true}>
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-primary" />
            {replyToMessage
              ? replyAll
                ? 'Reply All'
                : 'Reply to Message'
              : 'New Message'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TO: Recipients section */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              To: Recipients / Project Distros
            </Label>
            <div className="border border-input rounded-md p-2 min-h-[46px] bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 flex flex-wrap items-center gap-1.5 relative">
              {/* Selected recipient chips */}
              {selectedRecipients.map((r) => (
                <Badge
                  key={r.id}
                  variant="secondary"
                  className="flex items-center gap-1.5 py-1 px-2.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                >
                  {r.type === 'distro' ? (
                    <FolderKanban className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  ) : (
                    <UserIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                  <span>{r.name}</span>
                  {r.type === 'distro' && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 py-0.2 rounded font-mono">
                      Distro
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(r.id)}
                    className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}

              {/* Recipient search input */}
              <div className="relative flex-1 min-w-[180px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder={
                    selectedRecipients.length === 0
                      ? 'Search user by name or select a project distro...'
                      : 'Add more...'
                  }
                  className="w-full bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground py-1"
                />
              </div>

              {/* Search dropdown suggestions */}
              {isSearchOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSearchOpen(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-popover text-popover-foreground border border-border shadow-lg rounded-md max-h-60 overflow-y-auto z-50 p-1">
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border bg-muted/30">
                    <span>Select User or Project Distro</span>
                    <button
                      type="button"
                      onClick={() => setIsSearchOpen(false)}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      Close
                    </button>
                  </div>

                  {/* Project Distros Category */}
                  {filteredDistros.length > 0 && (
                    <div className="p-1">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase px-2 py-1 tracking-wider">
                        Project Distribution Lists (All Members)
                      </div>
                      {filteredDistros.map((d) => {
                        const isSelected = selectedRecipients.some((r) => r.id === d.id);
                        return (
                          <div
                            key={d.id}
                            onClick={() =>
                              handleAddRecipient({
                                id: d.id,
                                type: 'distro',
                                name: d.name, // Project ID
                                projectName: d.projectName,
                              })
                            }
                            className={`flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-muted'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FolderKanban className="h-4 w-4 text-amber-500 shrink-0" />
                              <div className="truncate">
                                <span className="font-semibold text-foreground mr-1.5 font-mono">
                                  {d.name}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  ({d.projectName})
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400">
                                Project Distro
                              </Badge>
                              {isSelected && <Check className="h-4 w-4 text-primary" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Users Category */}
                  {filteredUsers.length > 0 && (
                    <div className="p-1 border-t border-border">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase px-2 py-1 tracking-wider">
                        Registered Users
                      </div>
                      {filteredUsers.map((u) => {
                        const userKey = u.empId || u.id;
                        const isSelected = selectedRecipients.some((r) => r.id === userKey);
                        return (
                          <div
                            key={u.id}
                            onClick={() =>
                              handleAddRecipient({
                                id: userKey,
                                type: 'user',
                                name: u.name,
                                email: u.email,
                                avatar: u.avatar,
                              })
                            }
                            className={`flex items-center justify-between px-3 py-2 text-sm rounded cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-muted'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={u.avatar} alt={u.name} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {getUserInitials(u.firstName, u.lastName, u.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="truncate">
                                <span className="font-medium text-foreground mr-1.5">
                                  {u.name}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  ({u.email})
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {u.role && (
                                <span className="text-[11px] text-muted-foreground">
                                  {u.role}
                                </span>
                              )}
                              {isSelected && <Check className="h-4 w-4 text-primary" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {filteredDistros.length === 0 && filteredUsers.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No matching users or project distros found.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

          {/* Subject Field */}
          <div className="space-y-1.5">
            <Label htmlFor="msg-subject" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Subject
            </Label>
            <Input
              id="msg-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Sprint planning update, Deployment announcement..."
              className="font-medium"
            />
          </div>

          {/* Body Field */}
          <div className="space-y-1.5">
            <Label htmlFor="msg-body" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Message Body
            </Label>
            <Textarea
              id="msg-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={8}
              className="resize-y min-h-[160px] leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-3.5 border-t border-border bg-muted/20 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Discard
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={isSending || selectedRecipients.length === 0}
            className="gap-1.5 min-w-[110px]"
          >
            <Send className="h-4 w-4" />
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
