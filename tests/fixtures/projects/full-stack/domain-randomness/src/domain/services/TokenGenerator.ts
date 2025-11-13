export class TokenGenerator {
  create(): string {
    return `${Date.now()}-${Math.random()}`;
  }
}
