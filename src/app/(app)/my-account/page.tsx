'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, User, Upload, Trash2, Save, Shield } from 'lucide-react';
import { db, doc, updateDoc, collection, getDocs, query, where } from '@/lib/db-provider';
import { useToast } from '@/hooks/use-toast';
import { getUserInitials } from '@/lib/utils';

export default function MyAccountPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<{
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    id: string;
    role?: string;
    accessLevel?: string;
    empId: string;
    avatar: string;
    authProvider: string;
    needsPasswordReset?: boolean;
  }>({ name: '', email: '', id: '', role: '', accessLevel: '', empId: '', avatar: '', authProvider: '' });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);

  useEffect(() => {
    if (user.authProvider === 'firebase') {
      const { auth } = require('@/lib/firebase');
      const { onAuthStateChanged } = require('firebase/auth');
      if (auth) {
        const unsubscribe = onAuthStateChanged(auth, (fbUser: any) => {
          if (fbUser) {
            setIsFirebaseLoaded(true);
          }
        });
        return () => unsubscribe();
      }
    } else {
      setIsFirebaseLoaded(true);
    }
  }, [user.authProvider]);

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword === 'P@ssw0rd' || newPassword.toLowerCase() === 'p@ssw0rd') {
      setPasswordError('New password cannot be the same as the default password (P@ssw0rd). Please choose a different password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsPasswordUpdating(true);
    try {
      const { changeUserPassword } = await import('@/lib/auth-utils');
      const res = await changeUserPassword(newPassword, user.authProvider || 'firebase');

      if (res.success) {
        setPasswordSuccess('Your password has been changed successfully.');
        setNewPassword('');
        setConfirmPassword('');
        toast({
          title: "Password Changed",
          description: "Your password has been updated successfully.",
        });

        // Also update local storage needsPasswordReset flag if it was true
        const storedUser = localStorage.getItem('projectflow_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.needsPasswordReset) {
            parsed.needsPasswordReset = false;
            localStorage.setItem('projectflow_user', JSON.stringify(parsed));
          }
        }
      } else {
        setPasswordError(res.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('projectflow_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);

        // Split name into first and last name if not explicitly set
        const parts = (parsed.name || '').trim().split(' ');
        const initialFirst = parsed.firstName || parts[0] || '';
        const initialLast = parsed.lastName || parts.slice(1).join(' ') || '';
        setFirstName(initialFirst);
        setLastName(initialLast);

        // Fetch fresh details and avatar directly from database by email or empId
        if (db && (parsed.email || parsed.empId)) {
          const q = parsed.email
            ? query(collection(db, 'employees'), where('email', '==', parsed.email))
            : query(collection(db, 'employees'), where('empId', '==', parsed.empId));

          getDocs(q).then((snapshot: any) => {
            if (!snapshot.empty) {
              const docSnap = snapshot.docs[0];
              const data = docSnap.data();
              const fName = data.firstName || initialFirst;
              const lName = data.lastName || initialLast;
              const fullName = `${fName} ${lName}`.trim() || parsed.name;

              setFirstName(fName);
              setLastName(lName);

              const updated = {
                ...parsed,
                empId: data.empId || docSnap.id || parsed.empId,
                firstName: fName,
                lastName: lName,
                name: fullName,
                email: data.email || parsed.email,
                accessLevel: data.accessLevel || parsed.accessLevel,
                role: data.role || parsed.role,
                avatar: data.avatar || '',
              };
              localStorage.setItem('projectflow_user', JSON.stringify(updated));
              setUser(updated);
              // Dispatch event to keep sidebars synchronized
              window.dispatchEvent(new Event('user-profile-updated'));
            }
          }).catch(err => {
            console.error("Failed fetching employee profile:", err);
          });
        }
      } catch (e) {
        console.error("Failed to parse user from local storage", e);
      }
    }
  }, []);

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "First name is required.",
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const fullName = `${trimmedFirst} ${trimmedLast}`.trim();

      // 1. Locate employee document by email or empId
      let targetDocId = user.empId;
      if (db) {
        if (user.email) {
          const q = query(collection(db, 'employees'), where('email', '==', user.email));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            targetDocId = snapshot.docs[0].id;
          }
        }

        if (targetDocId) {
          const globalEmpRef = doc(db, 'employees', targetDocId);
          await updateDoc(globalEmpRef, {
            firstName: trimmedFirst,
            lastName: trimmedLast,
          });

          // Also update all allocated projects copies
          try {
            const projectsSnapshot = await getDocs(collection(db, 'projects'));
            for (const proj of projectsSnapshot.docs) {
              const projEmpRef = doc(db, 'projects', proj.id, 'employees', targetDocId);
              try {
                await updateDoc(projEmpRef, {
                  firstName: trimmedFirst,
                  lastName: trimmedLast,
                });
              } catch (err) {
                // Ignore if employee is not part of this project
              }
            }
          } catch (err) {
            console.error("Failed to update project-level employee names:", err);
          }
        }
      }

      // 2. Update local state and localStorage
      const updatedUser = {
        ...user,
        empId: targetDocId || user.empId,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        name: fullName,
      };

      localStorage.setItem('projectflow_user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // 3. Dispatch synchronization event to trigger sidebar reload
      window.dispatchEvent(new Event('user-profile-updated'));

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not save your profile changes. Please try again.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarChange = async (base64String: string) => {
    if (!user.empId && !user.email) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User details are not loaded properly.",
      });
      return;
    }

    setIsUpdating(true);
    try {
      let targetDocId = user.empId;
      if (db) {
        if (user.email) {
          const q = query(collection(db, 'employees'), where('email', '==', user.email));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            targetDocId = snapshot.docs[0].id;
          }
        }

        if (targetDocId) {
          // 1. Update global employee doc
          const globalEmpRef = doc(db, 'employees', targetDocId);
          await updateDoc(globalEmpRef, { avatar: base64String });

          // 2. Update all allocated projects copies
          try {
            const projectsSnapshot = await getDocs(collection(db, 'projects'));
            for (const proj of projectsSnapshot.docs) {
              const projEmpRef = doc(db, 'projects', proj.id, 'employees', targetDocId);
              try {
                await updateDoc(projEmpRef, { avatar: base64String });
              } catch (err) {
                // Ignore if employee is not part of this project
              }
            }
          } catch (err) {
            console.error("Failed to update project-level employee avatars:", err);
          }
        }
      }

      // 3. Update localStorage and local state
      const updatedUser = { ...user, avatar: base64String };
      localStorage.setItem('projectflow_user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // 4. Dispatch synchronization event to trigger sidebar reload
      window.dispatchEvent(new Event('user-profile-updated'));

      toast({
        title: "Profile Updated",
        description: base64String ? "Your avatar has been updated successfully." : "Your avatar has been removed.",
      });
    } catch (error: any) {
      console.error("Error updating avatar:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not save your new profile image. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 800KB to fit comfortably inside DB string limits
    if (file.size > 800 * 1024) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "Please select an image smaller than 800KB.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        handleAvatarChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = () => {
    handleAvatarChange('');
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <PageHeader title="My Account" description="Manage your personal profile." />

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>
            Manage your personal profile information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-6 flex-wrap gap-y-4">
            <Avatar className="h-24 w-24 border shadow-sm shrink-0">
              <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
              <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
                {getUserInitials(user.firstName, user.lastName, user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div>
                <h3 className="text-xl font-semibold leading-tight">{user.name || 'User'}</h3>
                <p className="text-sm font-medium text-primary mt-0.5">{user.accessLevel || user.role || 'Team Member'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleTriggerUpload}
                  disabled={isUpdating}
                  className="h-8"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Upload Photo
                </Button>
                {user.avatar && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRemoveAvatar}
                    disabled={isUpdating}
                    className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Remove
                  </Button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First Name"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="email" value={user.email} disabled className="pl-9 bg-muted/40 cursor-not-allowed text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Unique identifier used for account login.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessLevel">Access Level</Label>
              <div className="relative">
                <Shield className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="accessLevel" value={user.accessLevel || user.role || 'Team Member'} disabled className="pl-9 bg-muted/40 cursor-not-allowed text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Assigned role controlling page and project access.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 flex justify-end">
          <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="gap-1.5">
            <Save className="h-4 w-4 mr-1" />
            {isSavingProfile ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardFooter>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to secure your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-md font-medium">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-900 rounded-md font-medium">
              {passwordSuccess}
            </div>
          )}
          {user.authProvider === 'keycloak' ? (
            <p className="text-sm text-muted-foreground">
              Your account is managed via Keycloak. Password changes must be performed through your organization's portal.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
        {user.authProvider !== 'keycloak' && (
          <CardFooter className="border-t px-6 py-4 flex justify-end">
            <Button
              onClick={handleChangePassword}
              disabled={isPasswordUpdating || (user.authProvider === 'firebase' && !isFirebaseLoaded)}
            >
              {isPasswordUpdating ? 'Updating...' : (user.authProvider === 'firebase' && !isFirebaseLoaded) ? 'Connecting session...' : 'Change Password'}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
