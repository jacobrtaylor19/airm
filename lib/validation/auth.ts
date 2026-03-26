import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required").max(100),
  password: z.string().min(1, "Password is required").max(200),
});

export const setupSchema = z.object({
  username: z.string().min(1, "Username is required").max(100),
  displayName: z.string().min(1, "Display name is required").max(200),
  password: z.string().min(1, "Password is required").max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(200),
  newPassword: z.string().min(1, "New password is required").max(200),
});
