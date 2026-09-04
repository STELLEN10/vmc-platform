export type AppRole = "admin" | "staff" | "driver";
export type DriverStatus = "active" | "inactive" | "suspended";
export type BikeStatus = "available" | "assigned" | "maintenance" | "inactive";

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
    };
    Views: Record<string, never>;
    Functions: {
      current_app_role: { Args: Record<string, never>; Returns: AppRole | null };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_management: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      app_role: AppRole;
      bike_status: BikeStatus;
      driver_status: DriverStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
