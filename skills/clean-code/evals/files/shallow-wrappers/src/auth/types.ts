export interface User {
  id: string;
  roles: string[];
}

export interface Org {
  id: string;
  ownerId: string;
}

export interface Session {
  user: User;
  impersonating?: User;
  org: Org;
}
