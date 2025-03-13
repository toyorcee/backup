import { randomBytes } from "crypto";

export const generateInvitationToken = (): string => {
  return randomBytes(32).toString("hex");
};

export const generateResetToken = (): string => {
  return randomBytes(32).toString("hex");
};
