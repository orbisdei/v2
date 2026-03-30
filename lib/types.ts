// ============================================================
// Orbis Dei — Core Data Types
// These types mirror the Supabase database schema.
// ============================================================

export interface Site {
  id: string;                   // URL-friendly slug, e.g. "ar-lujan-basilica-of-our-lady-of-lujan"
  name: string;
  native_name?: string;         // Name in the local/native language, e.g. "Basilique Sainte-Thérèse de Lisieux"
  short_description: string;
  latitude: number;
  longitude: number;
  google_maps_url: string;
  featured: boolean;
  interest?: string;            // 'global', 'regional', 'local', 'personal'
  country?: string;             // ISO 3166-1 alpha-2, e.g. "FR"
  region?: string | null;
  municipality?: string;        // Town or city in plain-text English
  contributor?: string;         // Legacy free-text for seeded data
  updated_at: string;           // ISO date string
  created_by?: string;          // UUID of the profile that added this site (null = seeded)
  created_at?: string;          // ISO date string
  images: SiteImage[];
  links: SiteLink[];
  tag_ids: string[];            // References to Tag.id
}

export interface SiteImage {
  url: string;
  caption?: string;
  storage_type: 'local' | 'external';  // 'local' = hosted in /public/images, 'external' = URL
  display_order: number;
}

export interface SiteLink {
  url: string;
  link_type: string;            // "Official Website", "Wikipedia", "Miracle Hunter", etc.
  comment?: string;             // Optional editorial note about the link
}

export interface Tag {
  id: string;                   // URL-friendly slug
  name: string;
  description: string;
  image_url?: string;
  featured: boolean;
  type?: 'topic' | 'country' | 'region' | 'municipality';
  parent_tag_id?: string | null;
  country_code?: string | null;
  dedication?: string | null;
  created_by?: string;          // UUID of the profile that added this tag (null = seeded)
  created_at?: string;          // ISO date string
}

export interface ContributorNote {
  id: string;
  site_id: string;
  note: string;
  created_by?: string;                    // UUID of author profile (null = seeded)
  created_at: string;
  author_name?: string;                   // Joined from profiles
  author_initials_display?: string;       // Joined from profiles
}

// Derived type for map pins (lightweight, only what the map needs)
export interface MapPin {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  short_description: string;
  thumbnail_url?: string;
}

// User profile
export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'general' | 'contributor' | 'administrator';
  created_at: string;
}

// Pending submission from a contributor
export interface PendingSubmission {
  id: string;
  type: 'site' | 'tag' | 'note';
  action: 'create' | 'edit';
  payload: Record<string, unknown>;
  site_id?: string;
  submitted_by: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  review_notes?: string;
  created_at: string;
  reviewed_at?: string;
  submitter_name?: string;      // Joined from profiles
}
