import { Injectable } from '@nestjs/common';
import { CreateAnalyticDto } from './dto/create-analytic.dto';
import { UpdateAnalyticDto } from './dto/update-analytic.dto';

@Injectable()
export class AnalyticService {
  create(createAnalyticDto: CreateAnalyticDto) {
    return 'This action adds a new analytic';
  }

  findAll() {
    return `This action returns all analytic`;
  }

  findOne(id: number) {
    return `This action returns a #${id} analytic`;
  }

  update(id: number, updateAnalyticDto: UpdateAnalyticDto) {
    return `This action updates a #${id} analytic`;
  }

  remove(id: number) {
    return `This action removes a #${id} analytic`;
  }
}
