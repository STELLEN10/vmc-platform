export type AppRole = "admin" | "staff" | "driver";
export type DriverStatus = "active" | "inactive" | "suspended";
export type BikeStatus = "available" | "assigned" | "maintenance" | "inactive";
export type DriverOnboardingStatus =
  | "pending"
  | "incomplete"
  | "submitted"
  | "under_review"
  | "approved"
  | "active"
  | "changes_requested"
  | "rejected"
  | "suspended";
export type ReleaseChannel = "stable" | "beta";
export type ReleaseStatus = "draft" | "testing" | "active" | "paused" | "rolled_back" | "retired";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          role: AppRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          role?: AppRole;
          updated_at?: string;
        };
        Relationships: [];
      };
      drivers: {
        Row: {
          id: string;
          profile_id: string;
          bike_id: string | null;
          status: DriverStatus;
          start_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          bike_id?: string | null;
          status?: DriverStatus;
          start_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          bike_id?: string | null;
          status?: DriverStatus;
          start_date?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      bikes: {
        Row: {
          id: string;
          model: string;
          brand: string;
          colour: string | null;
          registration_number: string | null;
          vin: string | null;
          engine_number: string | null;
          licence_disc_information: string | null;
          status: BikeStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          model: string;
          brand?: string;
          colour?: string | null;
          registration_number?: string | null;
          vin?: string | null;
          engine_number?: string | null;
          licence_disc_information?: string | null;
          status?: BikeStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          model?: string;
          brand?: string;
          colour?: string | null;
          registration_number?: string | null;
          vin?: string | null;
          engine_number?: string | null;
          licence_disc_information?: string | null;
          status?: BikeStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_profiles: {
        Row: {
          id: string;
          profile_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      driver_onboardings: {
        Row: {
          profile_id: string;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          residential_address: string | null;
          delivery_platforms: string[];
          onboarding_status: DriverOnboardingStatus;
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          review_note: string | null;
          contract_start_date: string | null;
          usual_payment_day: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          residential_address?: string | null;
          delivery_platforms?: string[];
          onboarding_status?: DriverOnboardingStatus;
        };
        Update: {
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          residential_address?: string | null;
          delivery_platforms?: string[];
          onboarding_status?: DriverOnboardingStatus;
          review_note?: string | null;
          contract_start_date?: string | null;
          usual_payment_day?: number | null;
        };
        Relationships: [];
      };
      management_notifications: {
        Row: {
          id: string;
          type: "driver_onboarding_submitted";
          driver_profile_id: string;
          title: string;
          body: string;
          created_at: string;
          read_at: string | null;
          read_by: string | null;
        };
        Insert: never;
        Update: { read_at?: string | null; read_by?: string | null };
        Relationships: [];
      };
      releases: {
        Row: {
          id: string;
          version: string;
          channel: ReleaseChannel;
          status: ReleaseStatus;
          release_notes: string | null;
          created_by: string | null;
          activated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          version: string;
          channel?: ReleaseChannel;
          status?: ReleaseStatus;
          release_notes?: string | null;
        };
        Update: { status?: ReleaseStatus; release_notes?: string | null };
        Relationships: [];
      };
      feature_flags: {
        Row: {
          id: string;
          key: string;
          description: string | null;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { id?: string; key: string; description?: string | null; enabled?: boolean };
        Update: { description?: string | null; enabled?: boolean };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_values: Record<string, unknown> | null;
          new_values: Record<string, unknown> | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_values?: Record<string, unknown> | null;
          new_values?: Record<string, unknown> | null;
          metadata?: Record<string, unknown>;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_app_role: { Args: Record<string, never>; Returns: AppRole | null };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_management: { Args: Record<string, never>; Returns: boolean };
      review_driver_onboarding: {
        Args: { p_profile_id: string; p_status: DriverOnboardingStatus; p_review_note?: string | null };
        Returns: undefined;
      };
      create_release: {
        Args: { p_version: string; p_channel: ReleaseChannel; p_release_notes?: string | null };
        Returns: string;
      };
      transition_release: {
        Args: { p_release_id: string; p_status: ReleaseStatus; p_note?: string | null };
        Returns: undefined;
      };
      set_feature_flag: {
        Args: { p_key: string; p_enabled: boolean; p_description?: string | null };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: AppRole;
      bike_status: BikeStatus;
      driver_status: DriverStatus;
      driver_onboarding_status: DriverOnboardingStatus;
      release_channel: ReleaseChannel;
      release_status: ReleaseStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
