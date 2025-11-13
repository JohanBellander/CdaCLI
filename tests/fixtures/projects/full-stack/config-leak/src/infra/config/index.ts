export function getSendGridKey(): string {
  return process.env.SENDGRID_KEY ?? "";
}
