export class EnvReporter {
  log(): string {
    return process.env.SENDGRID_KEY ?? "missing";
  }
}
