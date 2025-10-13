export enum Status {
  FREE = 'FREE',
  BUSY = 'BUSY',
  UNSET = 'UNSET',
}

export enum Scope {
  PRIVATE = 'PRIVATE',
  COMMUNITY = 'COMMUNITY',
  PUBLIC = 'PUBLIC',
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  status: Status;
  community: string;
  // Relationship closeness to the current user; used for share filtering
  relationScope: Scope;
  message?: string;
  availableFrom?: string;
  // ISO string of last login time
  lastLoginAt?: string;
}
