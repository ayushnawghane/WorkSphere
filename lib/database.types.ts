// Hand-written to match db/002_tables.sql. If the schema changes, update
// this alongside the migration (or swap in `supabase gen types typescript`).
//
// Shape (Row/Insert/Update/Relationships, Views, Functions) must match
// @supabase/postgrest-js's GenericTable/GenericSchema exactly, or the
// client's query builder silently degrades to `never` result types.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      branches: {
        Row: {
          id: string;
          name: string;
          latitude: number;
          longitude: number;
          radius_meters: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["branches"]["Row"]> & {
          name: string;
          latitude: number;
          longitude: number;
        };
        Update: Partial<Database["public"]["Tables"]["branches"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          employee_code: string;
          full_name: string;
          phone: string | null;
          branch_id: string | null;
          location_required: boolean;
          is_active: boolean;
          role: "employee" | "admin";
          punch_type: "app" | "selfie";
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          employee_code: string;
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance: {
        Row: {
          id: string;
          user_id: string;
          branch_id: string | null;
          attendance_date: string;
          punch_in: string | null;
          punch_in_lat: number | null;
          punch_in_lng: number | null;
          punch_in_photo_url: string | null;
          punch_out: string | null;
          punch_out_lat: number | null;
          punch_out_lng: number | null;
          punch_out_photo_url: string | null;
          log_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attendance"]["Row"]> & {
          user_id: string;
          attendance_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["attendance"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export type Branch = Database["public"]["Tables"]["branches"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
