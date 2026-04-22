import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlogModule } from '../blog/blog.module';
import { BlogImage } from './blog-image.entity';
import { BlogImageController } from './blog-image.controller';
import { BlogImageService } from './blog-image.service';

@Module({
  imports: [TypeOrmModule.forFeature([BlogImage]), BlogModule],
  controllers: [BlogImageController],
  providers: [BlogImageService],
})
export class BlogImageModule {}
