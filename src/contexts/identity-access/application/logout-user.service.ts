// JWT is stateless — the client discards the token on logout.
export class LogoutUserService {
  async execute(_token: string): Promise<void> {}
}
