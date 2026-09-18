export type AppRole = "admin" | "staff" | "driver";
export type DriverStatus = "active" | "inactive" | "suspended";
export type BikeStatus = "available" | "assigned" | "maintenance" | "inactive" | "repair" | "retired";
export type BikeAssignmentStatus = "assigned" | "returned" | "ended";
export type ContractStatus = "draft" | "active" | "completed" | "cancelled" | "suspended";
export type PaymentStatus =
  | "upcoming"
  | "due"
  | "submitted"
  | "awaiting_verification"
  | "verified"
  | "rejected"
  | "overdue";
export type PaymentRecordSource = "scheduled" | "historical" | "adjustment";
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
        Relationships: [
          {
            foreignKeyName: "drivers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
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
      bike_assignments: {
        Row: {
          id: string;
          bike_id: string;
          driver_id: string;
          assigned_at: string;
          ended_at: string | null;
          status: BikeAssignmentStatus;
          assigned_by: string | null;
          end_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bike_id: string;
          driver_id: string;
          assigned_at?: string;
          ended_at?: string | null;
          status?: BikeAssignmentStatus;
          assigned_by?: string | null;
          end_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          bike_id?: string;
          driver_id?: string;
          assigned_at?: string;
          ended_at?: string | null;
          status?: BikeAssignmentStatus;
          assigned_by?: string | null;
          end_note?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bike_assignments_bike_id_fkey";
            columns: ["bike_id"];
            isOneToOne: false;
            referencedRelation: "bikes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bike_assignments_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          }
        ];
      };
      contracts: {
        Row: {
          id: string;
          driver_id: string;
          bike_id: string;
          start_date: string;
          weekly_amount: number;
          total_weeks: number;
          payment_weekday: number;
          status: ContractStatus;
          created_by: string | null;
          activated_at: string | null;
          completed_at: string | null;
          terms_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          bike_id: string;
          start_date: string;
          weekly_amount: number;
          total_weeks: number;
          payment_weekday?: number;
          status?: ContractStatus;
          created_by?: string | null;
          activated_at?: string | null;
          completed_at?: string | null;
          terms_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          driver_id?: string;
          bike_id?: string;
          start_date?: string;
          weekly_amount?: number;
          total_weeks?: number;
          payment_weekday?: number;
          status?: ContractStatus;
          created_by?: string | null;
          activated_at?: string | null;
          completed_at?: string | null;
          terms_notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contracts_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contracts_bike_id_fkey";
            columns: ["bike_id"];
            isOneToOne: false;
            referencedRelation: "bikes";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_periods: {
        Row: {
          id: string;
          contract_id: string;
          period_number: number;
          due_date: string;
          amount_due: number;
          status: PaymentStatus;
          source: PaymentRecordSource;
          original_payment_date: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          verified_at: string | null;
          reviewed_by: string | null;
          verified_by: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          period_number: number;
          due_date: string;
          amount_due: number;
          status?: PaymentStatus;
          source?: PaymentRecordSource;
          original_payment_date?: string | null;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          verified_at?: string | null;
          reviewed_by?: string | null;
          verified_by?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          contract_id?: string;
          period_number?: number;
          due_date?: string;
          amount_due?: number;
          status?: PaymentStatus;
          source?: PaymentRecordSource;
          original_payment_date?: string | null;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          verified_at?: string | null;
          reviewed_by?: string | null;
          verified_by?: string | null;
          rejection_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_periods_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "contracts";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_proofs: {
        Row: {
          id: string;
          payment_period_id: string;
          storage_bucket: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size_bytes: number;
          submitted_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_period_id: string;
          storage_bucket: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size_bytes: number;
          submitted_by: string;
          created_at?: string;
        };
        Update: {
          payment_period_id?: string;
          storage_bucket?: string;
          storage_path?: string;
          file_name?: string;
          mime_type?: string;
          file_size_bytes?: number;
          submitted_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_proofs_payment_period_id_fkey";
            columns: ["payment_period_id"];
            isOneToOne: false;
            referencedRelation: "payment_periods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_proofs_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_events: {
        Row: {
          id: string;
          payment_period_id: string;
          actor_id: string | null;
          previous_status: PaymentStatus | null;
          next_status: PaymentStatus;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_period_id: string;
          actor_id?: string | null;
          previous_status?: PaymentStatus | null;
          next_status: PaymentStatus;
          reason?: string | null;
          created_at?: string;
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
      generate_contract_payment_schedule: {
        Args: { p_contract_id: string };
        Returns: number;
      };
      transition_payment_period: {
        Args: {
          p_payment_period_id: string;
          p_status: PaymentStatus;
          p_reason?: string | null;
        };
        Returns: undefined;
      };
      assign_bike_to_driver: {
        Args: { p_driver_profile_id: string; p_bike_id: string };
        Returns: undefined;
      };
      unassign_bike_from_driver: {
        Args: { p_driver_profile_id: string };
        Returns: undefined;
      };
      is_driver_owner: {
        Args: { p_driver_id: string };
        Returns: boolean;
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
      feature_is_enabled: {
        Args: { p_key: string; p_environment?: "development" | "preview" | "production" };
        Returns: boolean;
      };
      assign_feature_flag_tester: {
        Args: { p_key: string; p_profile_id?: string | null; p_role?: AppRole | null };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: AppRole;
      bike_status: BikeStatus;
      bike_assignment_status: BikeAssignmentStatus;
      contract_status: ContractStatus;
      driver_status: DriverStatus;
      driver_onboarding_status: DriverOnboardingStatus;
      payment_status: PaymentStatus;
      payment_record_source: PaymentRecordSource;
      release_channel: ReleaseChannel;
      release_status: ReleaseStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
