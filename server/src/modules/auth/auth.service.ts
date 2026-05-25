import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from '../admin/admin-user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.adminRepo.findOne({ where: { username } });
    if (!user) throw new UnauthorizedException('用户名或密码错误');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('用户名或密码错误');
    const token = this.jwtService.sign({ id: user.id, username: user.username, role: user.role });
    return { code: 0, data: { token, username: user.username, role: user.role } };
  }

  async initAdmin() {
    const exist = await this.adminRepo.findOne({ where: { username: 'admin' } });
    if (!exist) {
      const hash = await bcrypt.hash('admin123456', 10);
      await this.adminRepo.save({ username: 'admin', password: hash, role: 'super' });
      return '初始管理员已创建: admin / admin123456';
    }
    return '管理员已存在';
  }
}
