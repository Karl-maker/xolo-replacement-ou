export interface User {
  id: string;
  name: string;
  email: string | null;
  createdAt: Date;
}

export interface NewUser {
  name: string;
  email: string | null;
}
