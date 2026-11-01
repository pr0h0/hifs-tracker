"use client";

import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { updateProfile, exportData, importData } from "@/app/actions/settings";
import { seedJuz } from "@/app/actions/seed";
import { toast } from "sonner";
import { Download, Upload, User, Lock, FileJson, BookOpen } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SettingsClientProps {
  user: {
    id: number;
    name: string;
    email: string;
    created_at: string;
  };
}

export function SettingsClient({ user }: SettingsClientProps) {
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [selectedJuz, setSelectedJuz] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("planned");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleProfileUpdate(formData: FormData) {
    setProfileLoading(true);
    const result = await updateProfile(formData);
    setProfileLoading(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile updated");
    }
  }

  async function handlePasswordUpdate(formData: FormData) {
    setPasswordLoading(true);
    const result = await updateProfile(formData);
    setPasswordLoading(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Password updated");
    }
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hifz-tracker-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch {
      toast.error("Failed to export data");
    }
    setExportLoading(false);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.items || !Array.isArray(data.items)) {
        toast.error("Invalid backup file format");
        setImportLoading(false);
        return;
      }
      const result = await importData(data);
      if (result.error) toast.error(result.error);
      else toast.success(`Imported ${result.count} items`);
    } catch {
      toast.error("Failed to import data");
    }
    setImportLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSeed() {
    if (!selectedJuz) return;

    setSeedLoading(true);
    const juz = parseInt(selectedJuz);

    try {
      const result = await seedJuz(
        juz,
        selectedStatus as "planned" | "learning" | "learned",
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `Added ${result.added} items from Juz ${juz}. ${result.skipped} items skipped.`,
        );
        setSelectedJuz("");
      }
    } catch {
      toast.error("Failed to add Juz items");
    }
    setSeedLoading(false);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-balance">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and data
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Profile</CardTitle>
            </div>
            <CardDescription>Update your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleProfileUpdate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-name">Name</Label>
                <Input
                  id="profile-name"
                  name="name"
                  defaultValue={user.name}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Email</Label>
                <Input value={user.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Member since</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString("en", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <Button type="submit" disabled={profileLoading} className="w-fit">
                {profileLoading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Change Password</CardTitle>
            </div>
            <CardDescription>Update your password</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handlePasswordUpdate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="current_password">Current Password</Label>
                <Input
                  id="current_password"
                  name="current_password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  name="new_password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <Button
                type="submit"
                disabled={passwordLoading}
                className="w-fit"
              >
                {passwordLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Add Juz */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Quick Add</CardTitle>
            </div>
            <CardDescription>
              Add all ayahs from a specific Juz to your memorization list
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="juz-select">Select Juz</Label>
                <Select value={selectedJuz} onValueChange={setSelectedJuz}>
                  <SelectTrigger id="juz-select">
                    <SelectValue placeholder="Select a Juz..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
                      <SelectItem key={juz} value={juz.toString()}>
                        Juz {juz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[140px] space-y-2">
                <Label htmlFor="status-select">Status</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger id="status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="learning">Learning</SelectItem>
                    <SelectItem value="learned">Learned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSeed}
                disabled={!selectedJuz || seedLoading}
              >
                {seedLoading ? "Adding..." : "Add to List"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileJson className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Data Management</CardTitle>
            </div>
            <CardDescription>
              Export or import your memorization data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Export</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Download all your data as a JSON file
                </p>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={exportLoading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {exportLoading ? "Exporting..." : "Export Data"}
                </Button>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-1">Import</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Import data from a previously exported JSON file. This will
                  add items to your existing data (not replace).
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  id="import-file"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importLoading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {importLoading ? "Importing..." : "Import Data"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
