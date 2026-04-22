import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlogModule } from '../blog/blog.module';
import { Comment } from './comment.entity';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
  imports: [TypeOrmModule.forFeature([Comment]), BlogModule],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
