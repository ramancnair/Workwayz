'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, User, Upload, Trash2 } from 'lucide-react';
import { db, doc, updateDoc, collection, getDocs, query, where } from '@/lib/db-provider';
import { useToast } from '@/hooks/use-toast';

export default function MyAccountPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState({ name: '', email: '', id: '', role: '', empId: '', avatar: '', authProvider: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  
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
        
        // Fetch fresh details and avatar directly from database
        if (parsed.empId) {
          const q = query(collection(db, 'employees'), where('empId', '==', parsed.empId));
          getDocs(q).then((snapshot: any) => {
            if (!snapshot.empty) {
              const data = snapshot.docs[0].data();
              const updated = {
                ...parsed,
                avatar: data.avatar || '',
                name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || parsed.name,
              };
              localStorage.setItem('projectflow_user', JSON.stringify(updated));
              setUser(updated);
              // Dispatch event to keep sidebars synchronized
              window.dispatchEvent(new Event('user-profile-updated'));
            }
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

  const handleAvatarChange = async (base64String: string) => {
    if (!user.empId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User details are not loaded properly.",
      });
      return;
    }
    
    setIsUpdating(true);
    try {
      // 1. Update global employee doc
      const globalEmpRef = doc(db, 'employees', user.empId);
      await updateDoc(globalEmpRef, { avatar: base64String });

      // 2. Update all allocated projects copies
      try {
        const projectsSnapshot = await getDocs(collection(db, 'projects'));
        for (const proj of projectsSnapshot.docs) {
          const projEmpRef = doc(db, 'projects', proj.id, 'employees', user.empId);
          try {
            await updateDoc(projEmpRef, { avatar: base64String });
          } catch (err) {
            // Ignore if employee is not part of this project (safe behavior)
          }
        }
      } catch (err) {
        console.error("Failed to update project-level employee avatars:", err);
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
            Your personal information as recorded during account creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-6 flex-wrap gap-y-4">
            <Avatar className="h-24 w-24 border shadow-sm shrink-0">
              {user.avatar && <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />}
              <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-3">
              <div>
                <h3 className="text-xl font-semibold leading-tight">{user.name || 'User'}</h3>
                <p className="text-sm text-muted-foreground">{user.role || 'Member'}</p>
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
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="name" value={user.name} disabled className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="email" value={user.email} disabled className="pl-9" />
              </div>
            </div>
          </div>
          <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">Profile information is currently read-only. Contact an administrator to make changes.</p>
          </div>
        </CardContent>
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
