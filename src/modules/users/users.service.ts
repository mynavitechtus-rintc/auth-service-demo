import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/providers/prisma/prisma.service';

interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  // Separate from findByEmail so that a failed login (email not found, or
  // wrong password) never triggers the extra roles/permissions join — that
  // join is only needed to mint a token on the success path. Keeping the
  // failure paths to a single, identically-shaped query avoids leaking
  // whether an email is registered via response-time differences.
  async findRolesWithPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { permissions: true } } },
    });
    return user?.roles ?? [];
  }

  async create(data: CreateUserData) {
    return this.prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        roles: { connect: { name: 'USER' } },
      },
      include: { roles: true },
    });
  }
}
