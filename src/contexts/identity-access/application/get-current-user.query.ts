import { unauthorized } from '../../../shared/http/http-error.js';
import type { UserRepository } from '../domain/repositories/user-repository.js';
import { JwtService } from '../domain/services/jwt-service.js';
import { toPublicUser, type PublicUser } from '../domain/user.js';

export class GetCurrentUserQuery {
  constructor(
    private readonly users: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(token: string): Promise<PublicUser> {
    const { userId } = this.jwtService.verify(token);

    const user = await this.users.findById(userId);
    if (!user || !user.isActive) {
      throw unauthorized('Invalid or expired session');
    }

    return toPublicUser(user);
  }
}
