export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
export type FeatureEnvironment = "development" | "preview" | "production";
export type MaintenanceCategory =
  | "engine"
  | "brakes"
  | "tyres"
  | "electrical"
  | "battery"
  | "lights"
  | "chain"
  | "suspension"
  | "body"
  | "oil_service"
  | "other";
export type MaintenanceSeverity = "low" | "medium" | "high" | "critical";
export type MaintenanceStatus =
  | "submitted"
  | "under_review"
  | "scheduled"
  | "in_progress"
  | "awaiting_parts"
  | "resolved"
  | "cancelled";
export type EmergencyType =
  | "accident"
  | "bike_breakdown"
  | "safety_issue"
  | "medical_emergency"
  | "other";
export type EmergencySeverity = "medium" | "high" | "critical";
export type EmergencyStatus =
  | "open"
  | "acknowledged"
  | "responding"
  | "resolved"
  | "cancelled";
export type ServiceType =
  | "standard_service"
  | "first_service_1000km"
  | "scheduled_service_3000km"
  | "major_service_6000km"
  | "oil_change"
  | "brake_tyre_inspection"
  | "other";
export type ServiceStatus =
  | "requested"
  | "confirmed"
  | "rescheduled"
  | "completed"
  | "cancelled"
  | "no_show";
export type PartStatus = "in_stock" | "low_stock" | "out_of_stock" | "discontinued";
export type InventoryMovementType =
  | "opening_balance"
  | "adjustment"
  | "received"
  | "used"
  | "returned";

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
          current_mileage_km: number;
          next_service_due_km: number | null;
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
          current_mileage_km?: number;
          next_service_due_km?: number | null;
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
          current_mileage_km?: number;
          next_service_due_km?: number | null;
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
          type: string;
          driver_profile_id: string | null;
          title: string;
          body: string;
          is_read: boolean;
          created_at: string;
          read_at: string | null;
          read_by: string | null;
          severity: string | null;
          action_url: string | null;
          related_entity_type: string | null;
          related_entity_id: string | null;
        };
        Insert: {
          id?: string;
          type: string;
          driver_profile_id?: string | null;
          title: string;
          body: string;
          is_read?: boolean;
          created_at?: string;
          read_at?: string | null;
          read_by?: string | null;
          severity?: string | null;
          action_url?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
        };
        Update: {
          is_read?: boolean;
          read_at?: string | null;
          read_by?: string | null;
          severity?: string | null;
          action_url?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          key: string;
          value: Json;
          category: string;
          description: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          category?: string;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          category?: string;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_profile_id: string;
          channel: "in_app" | "whatsapp" | "email" | "sms" | "push";
          type: string;
          title: string;
          body: string;
          status: "unread" | "read" | "archived";
          related_entity_type: string | null;
          related_entity_id: string | null;
          created_at: string;
          updated_at: string;
          read_at?: string | null;
        };
        Insert: {
          id?: string;
          recipient_profile_id: string;
          channel?: "in_app" | "whatsapp" | "email" | "sms" | "push";
          type: string;
          title: string;
          body: string;
          status?: "unread" | "read" | "archived";
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          created_at?: string;
          updated_at?: string;
          read_at?: string | null;
        };
        Update: {
          status?: "unread" | "read" | "archived";
          updated_at?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };
      notification_deliveries: {
        Row: {
          id: string;
          notification_id: string;
          channel: string;
          status: "scheduled" | "sent" | "failed" | "cancelled";
          scheduled_for: string;
          sent_at: string | null;
          failed_at: string | null;
          error_message: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          notification_id: string;
          channel: string;
          status?: "scheduled" | "sent" | "failed" | "cancelled";
          scheduled_for?: string;
          sent_at?: string | null;
          failed_at?: string | null;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "scheduled" | "sent" | "failed" | "cancelled";
          sent_at?: string | null;
          failed_at?: string | null;
          error_message?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_settings: {
        Row: {
          id: string;
          business_timezone: string;
          service_interval_km: number;
          free_service_allowance: number;
          low_stock_threshold: number;
          emergency_standby_phone: string;
          emergency_standby_hours: string;
          payment_grace_period_days: number;
          auto_reminders_enabled: boolean;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_timezone?: string;
          service_interval_km?: number;
          free_service_allowance?: number;
          low_stock_threshold?: number;
          emergency_standby_phone?: string;
          emergency_standby_hours?: string;
          payment_grace_period_days?: number;
          auto_reminders_enabled?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          business_timezone?: string;
          service_interval_km?: number;
          free_service_allowance?: number;
          low_stock_threshold?: number;
          emergency_standby_phone?: string;
          emergency_standby_hours?: string;
          payment_grace_period_days?: number;
          auto_reminders_enabled?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
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
          created_by?: string | null;
          activated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          version?: string;
          channel?: ReleaseChannel;
          status?: ReleaseStatus;
          release_notes?: string | null;
          created_by?: string | null;
          activated_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      release_features: {
        Row: {
          release_id: string;
          feature_flag_id: string;
          created_at: string;
        };
        Insert: {
          release_id: string;
          feature_flag_id: string;
          created_at?: string;
        };
        Update: {
          release_id?: string;
          feature_flag_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      feature_flag_environments: {
        Row: {
          feature_flag_id: string;
          environment: FeatureEnvironment;
          enabled: boolean;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          feature_flag_id: string;
          environment: FeatureEnvironment;
          enabled?: boolean;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          feature_flag_id?: string;
          environment?: FeatureEnvironment;
          enabled?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      feature_flag_assignments: {
        Row: {
          id: string;
          feature_flag_id: string;
          profile_id: string | null;
          role: AppRole | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          feature_flag_id: string;
          profile_id?: string | null;
          role?: AppRole | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          feature_flag_id?: string;
          profile_id?: string | null;
          role?: AppRole | null;
          created_by?: string | null;
          created_at?: string;
        };
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
          old_values: Json | null;
          new_values: Json | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json;
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
          document_storage_path: string | null;
          document_file_name: string | null;
          document_uploaded_at: string | null;
          document_file_size_bytes: number | null;
          document_mime_type: string | null;
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
          document_storage_path?: string | null;
          document_file_name?: string | null;
          document_uploaded_at?: string | null;
          document_file_size_bytes?: number | null;
          document_mime_type?: string | null;
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
          document_storage_path?: string | null;
          document_file_name?: string | null;
          document_uploaded_at?: string | null;
          document_file_size_bytes?: number | null;
          document_mime_type?: string | null;
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
      parts: {
        Row: {
          id: string;
          name: string;
          sku: string | null;
          part_number: string | null;
          category: string;
          description: string | null;
          compatible_model: string | null;
          unit_price: number | null;
          stock_quantity: number;
          minimum_stock_level: number;
          supplier: string | null;
          status: PartStatus;
          storage_location: string | null;
          image_storage_path: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sku?: string | null;
          part_number?: string | null;
          category?: string;
          description?: string | null;
          compatible_model?: string | null;
          unit_price?: number | null;
          stock_quantity?: number;
          minimum_stock_level?: number;
          supplier?: string | null;
          status?: PartStatus;
          storage_location?: string | null;
          image_storage_path?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          sku?: string | null;
          part_number?: string | null;
          category?: string;
          description?: string | null;
          compatible_model?: string | null;
          unit_price?: number | null;
          stock_quantity?: number;
          minimum_stock_level?: number;
          supplier?: string | null;
          status?: PartStatus;
          storage_location?: string | null;
          image_storage_path?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory_movements: {
        Row: {
          id: string;
          part_id: string;
          movement_type: InventoryMovementType;
          quantity_delta: number;
          reason: string | null;
          performed_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          part_id: string;
          movement_type: InventoryMovementType;
          quantity_delta: number;
          reason?: string | null;
          performed_by: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      maintenance_requests: {
        Row: {
          id: string;
          driver_id: string;
          bike_id: string;
          category: MaintenanceCategory;
          title: string;
          description: string;
          severity: MaintenanceSeverity;
          status: MaintenanceStatus;
          management_notes: string | null;
          submitted_at: string;
          scheduled_for: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          bike_id: string;
          category: MaintenanceCategory;
          title: string;
          description: string;
          severity?: MaintenanceSeverity;
          status?: MaintenanceStatus;
          management_notes?: string | null;
          submitted_at?: string;
          scheduled_for?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category?: MaintenanceCategory;
          title?: string;
          description?: string;
          severity?: MaintenanceSeverity;
          status?: MaintenanceStatus;
          management_notes?: string | null;
          scheduled_for?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      maintenance_attachments: {
        Row: {
          id: string;
          maintenance_request_id: string;
          storage_bucket: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size_bytes: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          maintenance_request_id: string;
          storage_bucket?: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size_bytes: number;
          created_by: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      emergency_reports: {
        Row: {
          id: string;
          driver_id: string;
          bike_id: string;
          emergency_type: EmergencyType;
          description: string;
          severity: EmergencySeverity;
          location_description: string | null;
          status: EmergencyStatus;
          management_notes: string | null;
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          bike_id: string;
          emergency_type: EmergencyType;
          description: string;
          severity?: EmergencySeverity;
          location_description?: string | null;
          status?: EmergencyStatus;
          management_notes?: string | null;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          emergency_type?: EmergencyType;
          description?: string;
          severity?: EmergencySeverity;
          location_description?: string | null;
          status?: EmergencyStatus;
          management_notes?: string | null;
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      emergency_attachments: {
        Row: {
          id: string;
          emergency_report_id: string;
          storage_bucket: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size_bytes: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          emergency_report_id: string;
          storage_bucket?: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          file_size_bytes: number;
          created_by: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      service_requests: {
        Row: {
          id: string;
          driver_id: string;
          bike_id: string;
          service_type: ServiceType;
          preferred_date: string;
          preferred_time: string;
          odometer_reading_km: number | null;
          driver_notes: string | null;
          status: ServiceStatus;
          confirmed_date: string | null;
          confirmed_time: string | null;
          management_notes: string | null;
          completed_at: string | null;
          completed_by: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          bike_id: string;
          service_type?: ServiceType;
          preferred_date: string;
          preferred_time: string;
          odometer_reading_km?: number | null;
          driver_notes?: string | null;
          status?: ServiceStatus;
          confirmed_date?: string | null;
          confirmed_time?: string | null;
          management_notes?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          service_type?: ServiceType;
          preferred_date?: string;
          preferred_time?: string;
          odometer_reading_km?: number | null;
          driver_notes?: string | null;
          status?: ServiceStatus;
          confirmed_date?: string | null;
          confirmed_time?: string | null;
          management_notes?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          updated_at?: string;
        };
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
      transition_maintenance_request: {
        Args: {
          p_request_id: string;
          p_status: string;
          p_management_notes?: string | null;
          p_scheduled_for?: string | null;
        };
        Returns: undefined;
      };
      transition_emergency_report: {
        Args: {
          p_emergency_id: string;
          p_status: string;
          p_management_notes?: string | null;
        };
        Returns: undefined;
      };
      transition_service_request: {
        Args: {
          p_request_id: string;
          p_status: string;
          p_confirmed_date?: string | null;
          p_confirmed_time?: string | null;
          p_management_notes?: string | null;
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
      mark_notification_as_read: {
        Args: { p_notification_id: string };
        Returns: undefined;
      };
      mark_all_notifications_as_read: {
        Args: Record<string, never>;
        Returns: number;
      };
      mark_management_notification_as_read: {
        Args: { p_notification_id: string };
        Returns: undefined;
      };
      mark_all_management_notifications_as_read: {
        Args: Record<string, never>;
        Returns: number;
      };
      dispatch_payment_reminders: {
        Args: Record<string, never>;
        Returns: {
          processed_count: number;
          upcoming_count: number;
          due_count: number;
          overdue_count: number;
        }[];
      };
      log_audit_event: {
        Args: {
          p_action: string;
          p_entity_type: string;
          p_entity_id?: string | null;
          p_old_values?: Json | null;
          p_new_values?: Json | null;
          p_metadata?: Json;
        };
        Returns: string;
      };
      update_business_settings: {
        Args: {
          p_business_timezone: string;
          p_service_interval_km: number;
          p_free_service_allowance: number;
          p_low_stock_threshold: number;
          p_emergency_standby_phone: string;
          p_emergency_standby_hours: string;
          p_payment_grace_period_days: number;
          p_auto_reminders_enabled: boolean;
        };
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
