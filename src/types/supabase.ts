export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          balance: number
          currency: string
          color: string
          archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id?: string
          name: string
          type: string
          balance?: number
          currency?: string
          color?: string
          archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          kind: 'expense' | 'income'
          icon: string
          color: string
          sort_order: number
          subcategories: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id?: string
          name: string
          kind: 'expense' | 'income'
          icon?: string
          color?: string
          sort_order?: number
          subcategories?: Json
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          month: string
          limit_amount: number
          rollover: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id?: string
          category_id: string
          month: string
          limit_amount?: number
          rollover?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>
      }
      goals: {
        Row: {
          id: string
          user_id: string
          name: string
          target_amount: number
          current_amount: number
          deadline: string | null
          color: string
          icon: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id?: string
          name: string
          target_amount?: number
          current_amount?: number
          deadline?: string | null
          color?: string
          icon?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['goals']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: 'expense' | 'income' | 'transfer'
          amount: number
          account_id: string
          to_account_id: string | null
          category_id: string | null
          subcategory_id: string | null
          note: string
          date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id?: string
          type: 'expense' | 'income' | 'transfer'
          amount?: number
          account_id: string
          to_account_id?: string | null
          category_id?: string | null
          subcategory_id?: string | null
          note?: string
          date: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      recurring: {
        Row: {
          id: string
          user_id: string
          type: 'expense' | 'income'
          amount: number
          account_id: string
          category_id: string
          note: string
          day_of_month: number
          last_posted_month: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id?: string
          type: 'expense' | 'income'
          amount?: number
          account_id: string
          category_id: string
          note?: string
          day_of_month?: number
          last_posted_month?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['recurring']['Insert']>
      }
      debts: {
        Row: {
          id: string
          user_id: string
          type: 'lent' | 'borrowed'
          person_name: string
          amount: number
          paid_amount: number
          status: 'active' | 'settled'
          due_date: string | null
          note: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id?: string
          type: 'lent' | 'borrowed'
          person_name: string
          amount?: number
          paid_amount?: number
          status?: 'active' | 'settled'
          due_date?: string | null
          note?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['debts']['Insert']>
      }
      cloud_backups: {
        Row: {
          id: string
          user_id: string
          version: number
          payload: Json
          client_timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          version?: number
          payload: Json
          client_timestamp?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['cloud_backups']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

export interface SyncStats {
  pulled: number
  pushed: number
  syncedAt: string
}
