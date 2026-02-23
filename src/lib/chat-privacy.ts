type Identity = {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

export function canRevealClientIdentity(consultationAcceptedAt: Date | null): boolean {
  return Boolean(consultationAcceptedAt);
}

export function displayClientName(identity: Identity, reveal: boolean): string {
  if (!reveal) return "Client (Anonymous)";
  const fullName = `${identity.firstName ?? ""} ${identity.lastName ?? ""}`.trim();
  return fullName || "Client";
}

export function displayClientPhone(phone: string | null, reveal: boolean): string {
  if (!reveal) return "Hidden until consultation is accepted";
  return phone || "Not provided";
}

export const PROFESSIONAL_DISCLAIMER =
  "Law119 (美国华人119找律师网) is a matching platform only. Communication on this platform does not create an attorney-client relationship. An attorney-client relationship is formed only after a separate written engagement agreement is signed.";
