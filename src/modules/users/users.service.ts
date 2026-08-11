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
