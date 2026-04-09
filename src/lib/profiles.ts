import { profiles } from "@/data/profiles";
import { AutomationProfile } from "@/lib/types";

export function getAllProfiles(): AutomationProfile[] {
  return profiles;
}

export function getProfileById(id: string): AutomationProfile | undefined {
  return profiles.find((p) => p.id === id);
}
