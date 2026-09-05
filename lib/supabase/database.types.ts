// Auto-generated from the live Supabase schema (project jdljxnospxujbpjetspo)
// via the Supabase MCP `generate_typescript_types` tool. Do not hand-edit —
// regenerate the same way after any schema migration.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          id: string
          is_direct: boolean
          trip_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_direct?: boolean
          trip_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_direct?: boolean
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      click_comments: {
        Row: {
          click_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          click_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          click_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "click_comments_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "click_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "click_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "click_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      click_likes: {
        Row: {
          click_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          click_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          click_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "click_likes_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "clicks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "click_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "click_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "click_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      click_photos: {
        Row: {
          click_id: string
          created_at: string
          display_order: number
          id: string
          image_url: string
          storage_path: string
        }
        Insert: {
          click_id: string
          created_at?: string
          display_order: number
          id?: string
          image_url: string
          storage_path: string
        }
        Update: {
          click_id?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "click_photos_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "clicks"
            referencedColumns: ["id"]
          },
        ]
      }
      clicks: {
        Row: {
          cover_image_url: string | null
          created_at: string
          destination: string | null
          end_date: string | null
          id: string
          latitude: number | null
          longitude: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["click_status"]
          story: string
          title: string
          trip_id: string | null
          trip_type: Database["public"]["Enums"]["click_trip_type"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          destination?: string | null
          end_date?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["click_status"]
          story: string
          title: string
          trip_id?: string | null
          trip_type?: Database["public"]["Enums"]["click_trip_type"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          destination?: string | null
          end_date?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["click_status"]
          story?: string
          title?: string
          trip_id?: string | null
          trip_type?: Database["public"]["Enums"]["click_trip_type"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clicks_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          contact_email: string | null
          counsellor_phone: string | null
          created_at: string
          gst_number: string | null
          id: string
          name: string
          registration_number: string | null
          status: Database["public"]["Enums"]["company_status"]
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          counsellor_phone?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          name: string
          registration_number?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          counsellor_phone?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          name?: string
          registration_number?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          updated_at?: string
        }
        Relationships: []
      }
      company_trip_records: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          start_date: string
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: string
          start_date: string
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_trip_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_trip_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_trip_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_trip_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          company_id: string
          user_id: string
        }
        Insert: {
          company_id: string
          user_id: string
        }
        Update: {
          company_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          category: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      join_requests: {
        Row: {
          decided_at: string | null
          id: string
          message: string | null
          requested_at: string
          status: Database["public"]["Enums"]["join_request_status"]
          trip_id: string
          user_id: string
        }
        Insert: {
          decided_at?: string | null
          id?: string
          message?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["join_request_status"]
          trip_id: string
          user_id: string
        }
        Update: {
          decided_at?: string | null
          id?: string
          message?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["join_request_status"]
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          room_id: string
          sender_id: string
          seq: number
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          room_id: string
          sender_id: string
          seq: number
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          room_id?: string
          sender_id?: string
          seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          related_trip_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          related_trip_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          related_trip_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_trip_id_fkey"
            columns: ["related_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_registrations: {
        Row: {
          activated_at: string | null
          activated_user_id: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_user_id?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_user_id?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_registrations_activated_user_id_fkey"
            columns: ["activated_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_registrations_activated_user_id_fkey"
            columns: ["activated_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_registrations_activated_user_id_fkey"
            columns: ["activated_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_registrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_registrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_registrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content_id: string
          content_type: Database["public"]["Enums"]["report_content_type"]
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          content_id: string
          content_type: Database["public"]["Enums"]["report_content_type"]
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          content_id?: string
          content_type?: Database["public"]["Enums"]["report_content_type"]
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewee_company_id: string | null
          reviewee_id: string | null
          reviewer_display_name: string | null
          reviewer_id: string
          trip_id: string | null
          trip_title_override: string | null
          visibility: Database["public"]["Enums"]["review_visibility"]
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewee_company_id?: string | null
          reviewee_id?: string | null
          reviewer_display_name?: string | null
          reviewer_id: string
          trip_id?: string | null
          trip_title_override?: string | null
          visibility?: Database["public"]["Enums"]["review_visibility"]
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewee_company_id?: string | null
          reviewee_id?: string | null
          reviewer_display_name?: string | null
          reviewer_id?: string
          trip_id?: string | null
          trip_title_override?: string | null
          visibility?: Database["public"]["Enums"]["review_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "reviews_reviewee_company_id_fkey"
            columns: ["reviewee_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_trips: {
        Row: {
          created_at: string
          id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_trips_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          attributed_location: string | null
          attributed_name: string
          consent_recorded_at: string | null
          created_at: string
          id: string
          is_published: boolean
          quote: string
          user_id: string | null
        }
        Insert: {
          attributed_location?: string | null
          attributed_name: string
          consent_recorded_at?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          quote: string
          user_id?: string | null
        }
        Update: {
          attributed_location?: string | null
          attributed_name?: string
          consent_recorded_at?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          quote?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_members: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          removed_reason: string | null
          status: Database["public"]["Enums"]["membership_status"]
          trip_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          removed_reason?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          trip_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          removed_reason?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          availability_end: string | null
          availability_start: string | null
          budget_max: number | null
          budget_min: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_role:
            | Database["public"]["Enums"]["cancelled_by_role"]
            | null
          company_id: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          destination_id: string | null
          draft_expires_at: string | null
          duration_max: number | null
          duration_min: number | null
          end_date: string | null
          exclusions: string[] | null
          fixed_end_date: string | null
          fixed_start_date: string | null
          gender_restriction: Database["public"]["Enums"]["trip_gender_restriction"]
          id: string
          inclusions: string[] | null
          itinerary_days: Json | null
          itinerary_pdf_url: string | null
          kind: Database["public"]["Enums"]["trip_kind"]
          max_age: number | null
          max_group_size: number
          min_age: number | null
          organizer_id: string
          original_price: number | null
          price: number | null
          price_breakdown: Json | null
          registrations_closed: boolean
          start_date: string | null
          status: Database["public"]["Enums"]["trip_status"]
          title: string
          updated_at: string
        }
        Insert: {
          availability_end?: string | null
          availability_start?: string | null
          budget_max?: number | null
          budget_min?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_role?:
            | Database["public"]["Enums"]["cancelled_by_role"]
            | null
          company_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          destination_id?: string | null
          draft_expires_at?: string | null
          duration_max?: number | null
          duration_min?: number | null
          end_date?: string | null
          exclusions?: string[] | null
          fixed_end_date?: string | null
          fixed_start_date?: string | null
          gender_restriction?: Database["public"]["Enums"]["trip_gender_restriction"]
          id?: string
          inclusions?: string[] | null
          itinerary_days?: Json | null
          itinerary_pdf_url?: string | null
          kind?: Database["public"]["Enums"]["trip_kind"]
          max_age?: number | null
          max_group_size: number
          min_age?: number | null
          organizer_id: string
          original_price?: number | null
          price?: number | null
          price_breakdown?: Json | null
          registrations_closed?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          title: string
          updated_at?: string
        }
        Update: {
          availability_end?: string | null
          availability_start?: string | null
          budget_max?: number | null
          budget_min?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_role?:
            | Database["public"]["Enums"]["cancelled_by_role"]
            | null
          company_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          destination_id?: string | null
          draft_expires_at?: string | null
          duration_max?: number | null
          duration_min?: number | null
          end_date?: string | null
          exclusions?: string[] | null
          fixed_end_date?: string | null
          fixed_start_date?: string | null
          gender_restriction?: Database["public"]["Enums"]["trip_gender_restriction"]
          id?: string
          inclusions?: string[] | null
          itinerary_days?: Json | null
          itinerary_pdf_url?: string | null
          kind?: Database["public"]["Enums"]["trip_kind"]
          max_age?: number | null
          max_group_size?: number
          min_age?: number | null
          organizer_id?: string
          original_price?: number | null
          price?: number | null
          price_breakdown?: Json | null
          registrations_closed?: boolean
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_scores: {
        Row: {
          is_frozen: boolean
          last_computed_at: string
          score: number
          user_id: string
        }
        Insert: {
          is_frozen?: boolean
          last_computed_at?: string
          score?: number
          user_id: string
        }
        Update: {
          is_frozen?: boolean
          last_computed_at?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_url: string | null
          bio: string | null
          cities_explored_override: number | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          drinking_preference: string | null
          email: string | null
          gender: string | null
          id: string
          initials: string | null
          name: string
          onboarding_completed: boolean
          phone: string | null
          restricted_until: string | null
          role: Database["public"]["Enums"]["user_role"]
          smoking_preference: string | null
          trips_completed_override: number | null
          trips_joined_override: number | null
          trips_organized_override: number | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          bio?: string | null
          cities_explored_override?: number | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          drinking_preference?: string | null
          email?: string | null
          gender?: string | null
          id: string
          initials?: string | null
          name: string
          onboarding_completed?: boolean
          phone?: string | null
          restricted_until?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          smoking_preference?: string | null
          trips_completed_override?: number | null
          trips_joined_override?: number | null
          trips_organized_override?: number | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          bio?: string | null
          cities_explored_override?: number | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          drinking_preference?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          initials?: string | null
          name?: string
          onboarding_completed?: boolean
          phone?: string | null
          restricted_until?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          smoking_preference?: string | null
          trips_completed_override?: number | null
          trips_joined_override?: number | null
          trips_organized_override?: number | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      verifications: {
        Row: {
          document_type: string | null
          document_url: string | null
          id: string
          rejection_reason:
            | Database["public"]["Enums"]["verification_rejection_reason"]
            | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: Database["public"]["Enums"]["verification_decision"]
          submitted_at: string
          user_id: string
        }
        Insert: {
          document_type?: string | null
          document_url?: string | null
          id?: string
          rejection_reason?:
            | Database["public"]["Enums"]["verification_rejection_reason"]
            | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["verification_decision"]
          submitted_at?: string
          user_id: string
        }
        Update: {
          document_type?: string | null
          document_url?: string | null
          id?: string
          rejection_reason?:
            | Database["public"]["Enums"]["verification_rejection_reason"]
            | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["verification_decision"]
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_users: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"] | null
          avatar_url: string | null
          bio: string | null
          cities_explored_override: number | null
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          drinking_preference: string | null
          email: string | null
          gender: string | null
          id: string | null
          initials: string | null
          name: string | null
          onboarding_completed: boolean | null
          phone: string | null
          restricted_until: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          smoking_preference: string | null
          trips_completed_override: number | null
          trips_joined_override: number | null
          trips_organized_override: number | null
          updated_at: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          avatar_url?: string | null
          bio?: string | null
          cities_explored_override?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          drinking_preference?: string | null
          email?: string | null
          gender?: string | null
          id?: string | null
          initials?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          restricted_until?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          smoking_preference?: string | null
          trips_completed_override?: number | null
          trips_joined_override?: number | null
          trips_organized_override?: number | null
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          avatar_url?: string | null
          bio?: string | null
          cities_explored_override?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          drinking_preference?: string | null
          email?: string | null
          gender?: string | null
          id?: string | null
          initials?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          restricted_until?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          smoking_preference?: string | null
          trips_completed_override?: number | null
          trips_joined_override?: number | null
          trips_organized_override?: number | null
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: []
      }
      public_user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cities_explored_override: number | null
          created_at: string | null
          id: string | null
          initials: string | null
          name: string | null
          trips_completed_override: number | null
          trips_joined_override: number | null
          trips_organized_override: number | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cities_explored_override?: number | null
          created_at?: string | null
          id?: string | null
          initials?: string | null
          name?: string | null
          trips_completed_override?: number | null
          trips_joined_override?: number | null
          trips_organized_override?: number | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cities_explored_override?: number | null
          created_at?: string | null
          id?: string | null
          initials?: string | null
          name?: string | null
          trips_completed_override?: number | null
          trips_joined_override?: number | null
          trips_organized_override?: number | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_add_company_trip_record: {
        Args: {
          p_company_id: string
          p_end_date?: string
          p_start_date: string
          p_title: string
        }
        Returns: string
      }
      admin_add_trip_member: {
        Args: { p_reason?: string; p_trip_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_approve_verification: {
        Args: { p_verification_id: string }
        Returns: undefined
      }
      admin_bulk_delete_trips: {
        Args: { p_reason: string; p_trip_ids: string[] }
        Returns: undefined
      }
      admin_bulk_hide_trips: {
        Args: { p_reason: string; p_trip_ids: string[] }
        Returns: undefined
      }
      admin_close_trip_registrations: {
        Args: { p_reason?: string; p_trip_id: string }
        Returns: undefined
      }
      admin_create_company: {
        Args: {
          p_contact_email?: string
          p_name: string
          p_owner_user_id?: string
          p_registration_number?: string
        }
        Returns: string
      }
      admin_create_destination: {
        Args: {
          p_category?: string
          p_cover_image_url?: string
          p_description?: string
          p_name: string
          p_slug: string
          p_sort_order?: number
          p_tagline?: string
        }
        Returns: string
      }
      admin_create_trip: {
        Args: {
          p_availability_end: string
          p_availability_start: string
          p_company_id?: string
          p_description?: string
          p_destination_id: string
          p_duration_max: number
          p_duration_min: number
          p_gender_restriction?: Database["public"]["Enums"]["trip_gender_restriction"]
          p_kind?: Database["public"]["Enums"]["trip_kind"]
          p_max_age?: number
          p_max_group_size: number
          p_min_age?: number
          p_organizer_id: string
          p_title: string
        }
        Returns: string
      }
      admin_deactivate_destination: {
        Args: { p_destination_id: string }
        Returns: undefined
      }
      admin_delete_click: {
        Args: { p_click_id: string; p_reason: string }
        Returns: undefined
      }
      admin_delete_trip: {
        Args: { p_reason: string; p_trip_id: string }
        Returns: undefined
      }
      admin_edit_review: {
        Args: { p_comment?: string; p_rating?: number; p_review_id: string }
        Returns: undefined
      }
      admin_force_cancel_trip: {
        Args: { p_reason: string; p_trip_id: string }
        Returns: undefined
      }
      admin_hide_click: {
        Args: { p_click_id: string; p_reason: string }
        Returns: undefined
      }
      admin_hide_review: {
        Args: { p_reason: string; p_review_id: string }
        Returns: undefined
      }
      admin_hide_trip: {
        Args: { p_reason: string; p_trip_id: string }
        Returns: undefined
      }
      admin_lift_restriction: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      admin_reactivate_destination: {
        Args: { p_destination_id: string }
        Returns: undefined
      }
      admin_reinstate_user: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      admin_reject_verification: {
        Args: {
          p_rejection_reason: Database["public"]["Enums"]["verification_rejection_reason"]
          p_verification_id: string
        }
        Returns: undefined
      }
      admin_remove_click_comment: {
        Args: { p_comment_id: string; p_reason: string }
        Returns: undefined
      }
      admin_remove_company: {
        Args: { p_company_id: string; p_reason: string }
        Returns: undefined
      }
      admin_remove_company_trip_record: {
        Args: { p_record_id: string }
        Returns: undefined
      }
      admin_remove_review: {
        Args: { p_reason: string; p_review_id: string }
        Returns: undefined
      }
      admin_remove_trip_member: {
        Args: { p_reason: string; p_trip_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_remove_user: {
        Args: { p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_reopen_trip_registrations: {
        Args: { p_reason?: string; p_trip_id: string }
        Returns: undefined
      }
      admin_resolve_report: {
        Args: {
          p_report_id: string
          p_resolution_note?: string
          p_status: Database["public"]["Enums"]["report_status"]
        }
        Returns: undefined
      }
      admin_restore_click: {
        Args: { p_click_id: string; p_reason?: string }
        Returns: undefined
      }
      admin_restore_click_comment: {
        Args: { p_comment_id: string; p_reason?: string }
        Returns: undefined
      }
      admin_restore_review: {
        Args: { p_reason?: string; p_review_id: string }
        Returns: undefined
      }
      admin_restrict_user: {
        Args: { p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_set_site_setting: {
        Args: { p_key: string; p_value: string }
        Returns: undefined
      }
      admin_set_trust_score: {
        Args: { p_reason?: string; p_score: number; p_user_id: string }
        Returns: undefined
      }
      admin_suspend_company: {
        Args: { p_company_id: string; p_reason: string }
        Returns: undefined
      }
      admin_suspend_user: {
        Args: { p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_unhide_trip: {
        Args: { p_reason?: string; p_trip_id: string }
        Returns: undefined
      }
      admin_update_company: {
        Args: {
          p_clear_counsellor_phone?: boolean
          p_company_id: string
          p_contact_email?: string
          p_counsellor_phone?: string
          p_gst_number?: string
          p_name?: string
          p_registration_number?: string
        }
        Returns: undefined
      }
      admin_update_destination: {
        Args: {
          p_category?: string
          p_cover_image_url?: string
          p_description?: string
          p_destination_id: string
          p_is_active?: boolean
          p_name?: string
          p_sort_order?: number
          p_tagline?: string
        }
        Returns: undefined
      }
      admin_update_trip: {
        Args: {
          p_availability_end?: string
          p_availability_start?: string
          p_budget_max?: number
          p_budget_min?: number
          p_clear_company?: boolean
          p_clear_cover_image?: boolean
          p_clear_exclusions?: boolean
          p_clear_inclusions?: boolean
          p_clear_itinerary_days?: boolean
          p_clear_itinerary_pdf_url?: boolean
          p_clear_price_breakdown?: boolean
          p_company_id?: string
          p_cover_image_url?: string
          p_description?: string
          p_destination_id?: string
          p_duration_max?: number
          p_duration_min?: number
          p_exclusions?: string[]
          p_gender_restriction?: Database["public"]["Enums"]["trip_gender_restriction"]
          p_inclusions?: string[]
          p_itinerary_days?: Json
          p_itinerary_pdf_url?: string
          p_kind?: Database["public"]["Enums"]["trip_kind"]
          p_max_age?: number
          p_max_group_size?: number
          p_min_age?: number
          p_organizer_id?: string
          p_price_breakdown?: Json
          p_title?: string
          p_trip_id: string
        }
        Returns: undefined
      }
      admin_update_user_profile: {
        Args: {
          p_avatar_url?: string
          p_bio?: string
          p_cities_explored_override?: number
          p_clear_cities_explored_override?: boolean
          p_clear_trips_completed_override?: boolean
          p_clear_trips_joined_override?: boolean
          p_clear_trips_organized_override?: boolean
          p_date_of_birth?: string
          p_drinking_preference?: string
          p_email?: string
          p_gender?: string
          p_name?: string
          p_phone?: string
          p_smoking_preference?: string
          p_trips_completed_override?: number
          p_trips_joined_override?: number
          p_trips_organized_override?: number
          p_user_id: string
        }
        Returns: undefined
      }
      admin_verify_company: {
        Args: { p_company_id: string; p_reason?: string }
        Returns: undefined
      }
      admin_warn_user: {
        Args: { p_reason: string; p_user_id: string }
        Returns: undefined
      }
      admin_write_review: {
        Args: {
          p_comment?: string
          p_rating?: number
          p_reviewee_company_id?: string
          p_reviewee_id?: string
          p_reviewer_display_name?: string
          p_reviewer_id?: string
          p_trip_id?: string
          p_trip_title_override?: string
        }
        Returns: string
      }
      can_act_as_member: { Args: never; Returns: boolean }
      check_comment_rate_limit: { Args: never; Returns: boolean }
      get_or_create_company_chat: {
        Args: { p_company_id: string }
        Returns: string
      }
      get_or_create_direct_chat: {
        Args: { p_other_user_id: string }
        Returns: string
      }
      is_staff: { Args: never; Returns: boolean }
      mark_trip_completed: { Args: { p_trip_id: string }; Returns: undefined }
      my_chat_room_ids: { Args: never; Returns: string[] }
      my_private_profile_fields: {
        Args: never
        Returns: {
          date_of_birth: string
          drinking_preference: string
          email: string
          gender: string
          phone: string
          smoking_preference: string
        }[]
      }
      notify_stale_live_trips: { Args: never; Returns: undefined }
      recompute_trust_score: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      register_company: {
        Args: {
          p_contact_email?: string
          p_gst_number?: string
          p_name: string
          p_registration_number?: string
        }
        Returns: string
      }
      report_content: {
        Args: {
          p_content_id: string
          p_content_type: Database["public"]["Enums"]["report_content_type"]
          p_details?: string
          p_reason: Database["public"]["Enums"]["report_reason"]
        }
        Returns: string
      }
      staff_user_private_fields: {
        Args: { p_user_ids: string[] }
        Returns: {
          date_of_birth: string
          drinking_preference: string
          email: string
          gender: string
          id: string
          phone: string
          smoking_preference: string
        }[]
      }
      submit_trip_review: {
        Args: {
          p_comment?: string
          p_rating: number
          p_reviewee_id: string
          p_trip_id: string
        }
        Returns: string
      }
      write_audit_log: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_new_value?: Json
          p_old_value?: Json
          p_reason?: string
        }
        Returns: string
      }
    }
    Enums: {
      account_status: "active" | "restricted" | "suspended"
      cancelled_by_role: "organizer" | "admin" | "system"
      click_status: "draft" | "published" | "hidden" | "deleted"
      click_trip_type:
        | "backpacking"
        | "trekking"
        | "road_trip"
        | "solo"
        | "friends"
        | "family"
        | "adventure"
        | "weekend"
        | "nature"
        | "beach"
        | "cultural"
        | "other"
      company_status: "under_review" | "verified" | "suspended"
      join_request_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "waitlisted"
        | "withdrawn"
      membership_status: "accepted" | "removed" | "left"
      notification_type:
        | "join_request_received"
        | "join_request_accepted"
        | "join_request_rejected"
        | "waitlist_promoted"
        | "trip_cancelled"
        | "new_message"
        | "review_received"
        | "verification_decided"
        | "attendance_reminder"
        | "trip_completion_reminder"
        | "new_follower"
        | "click_liked"
        | "click_commented"
      report_content_type:
        | "click"
        | "click_comment"
        | "trip"
        | "review"
        | "user"
      report_reason:
        | "spam"
        | "harassment"
        | "inappropriate_content"
        | "misinformation"
        | "safety_concern"
        | "other"
      report_status: "pending" | "reviewed" | "actioned" | "dismissed"
      review_visibility: "published" | "hidden" | "removed"
      trip_gender_restriction: "any" | "women_only" | "men_only"
      trip_kind: "community" | "verified_partner"
      trip_status:
        | "draft"
        | "live"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "hidden"
        | "deleted"
      user_role: "member" | "moderator" | "admin"
      verification_decision: "pending" | "approved" | "rejected"
      verification_rejection_reason:
        | "blurry_image"
        | "name_mismatch"
        | "expired_document"
        | "selfie_mismatch"
        | "unsupported_document_type"
      verification_status: "unverified" | "phone_verified" | "id_verified"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "restricted", "suspended"],
      cancelled_by_role: ["organizer", "admin", "system"],
      click_status: ["draft", "published", "hidden", "deleted"],
      click_trip_type: [
        "backpacking",
        "trekking",
        "road_trip",
        "solo",
        "friends",
        "family",
        "adventure",
        "weekend",
        "nature",
        "beach",
        "cultural",
        "other",
      ],
      company_status: ["under_review", "verified", "suspended"],
      join_request_status: [
        "pending",
        "accepted",
        "rejected",
        "waitlisted",
        "withdrawn",
      ],
      membership_status: ["accepted", "removed", "left"],
      notification_type: [
        "join_request_received",
        "join_request_accepted",
        "join_request_rejected",
        "waitlist_promoted",
        "trip_cancelled",
        "new_message",
        "review_received",
        "verification_decided",
        "attendance_reminder",
        "trip_completion_reminder",
        "new_follower",
        "click_liked",
        "click_commented",
      ],
      report_content_type: ["click", "click_comment", "trip", "review", "user"],
      report_reason: [
        "spam",
        "harassment",
        "inappropriate_content",
        "misinformation",
        "safety_concern",
        "other",
      ],
      report_status: ["pending", "reviewed", "actioned", "dismissed"],
      review_visibility: ["published", "hidden", "removed"],
      trip_gender_restriction: ["any", "women_only", "men_only"],
      trip_kind: ["community", "verified_partner"],
      trip_status: [
        "draft",
        "live",
        "in_progress",
        "completed",
        "cancelled",
        "hidden",
        "deleted",
      ],
      user_role: ["member", "moderator", "admin"],
      verification_decision: ["pending", "approved", "rejected"],
      verification_rejection_reason: [
        "blurry_image",
        "name_mismatch",
        "expired_document",
        "selfie_mismatch",
        "unsupported_document_type",
      ],
      verification_status: ["unverified", "phone_verified", "id_verified"],
    },
  },
} as const
