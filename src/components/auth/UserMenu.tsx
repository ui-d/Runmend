"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserMenuProps {
  email: string;
  fullName: string | null;
}

export function UserMenu({ email, fullName }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email[0].toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-card shadow-lg z-50">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-medium truncate">
              {fullName || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
          <div className="p-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm h-9"
              onClick={() => {
                setOpen(false);
                router.push("/app");
              }}
            >
              <User className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm h-9 text-destructive hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
