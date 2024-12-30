export interface Message {
    id?: number;
    queue_id: number;
    content: any;
    state?: string;
    priority?: number;
    group_id?: string;
    created_at?: Date;
    updated_at?: Date;
    ready_at?: Date;
    attempts?: number;
    max_attempts?: number;
    delay_after_processing?: number;
  }
  
  export interface Queue {
    id?: number;
    name: string;
    config?: any;
    created_at?: Date;
    updated_at?: Date;
  }

  export enum MessageStatus {
    pending = 'pending',
    in_progress = 'in_progress',
    delayed = 'delayed',
    dead_letter = 'dead_letter'
  }

  export const MAX_NUMBER_OF_ROWS = 110;