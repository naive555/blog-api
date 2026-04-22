import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BlogService } from '../blog/blog.service';
import { ECommentStatus } from '../utility/common.enum';
import { CommentQueryDto } from './dto/comment-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from './comment.entity';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly blogService: BlogService,
  ) {}

  async findAll(query: CommentQueryDto): Promise<Comment[]> {
    this.logger.log({ message: { function: this.findAll.name, data: query } });

    try {
      return await this.commentRepository.find({
        where: {
          ...(query.status && { status: query.status }),
          ...(query.blogId && { blogId: query.blogId }),
        },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error({
        message: {
          function: this.findAll.name,
          error: (error as Error).message,
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async create(
    blogId: string,
    commentData: CreateCommentDto,
  ): Promise<Comment> {
    this.logger.log({
      message: { function: this.create.name, data: { blogId } },
    });

    await this.blogService.findById(blogId);

    try {
      const comment = this.commentRepository.create({
        ...commentData,
        blogId,
        status: ECommentStatus.PENDING,
      });

      return await this.commentRepository.save(comment);
    } catch (error) {
      this.logger.error({
        message: {
          function: this.create.name,
          error: (error as Error).message,
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async approve(id: string): Promise<void> {
    this.logger.log({ message: { function: this.approve.name, data: { id } } });
    await this.updateStatus(id, ECommentStatus.APPROVED);
  }

  async reject(id: string): Promise<void> {
    this.logger.log({ message: { function: this.reject.name, data: { id } } });
    await this.updateStatus(id, ECommentStatus.REJECTED);
  }

  private async findById(id: string): Promise<Comment> {
    const comment = await this.commentRepository.findOneBy({ id });
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  private async updateStatus(
    id: string,
    status: ECommentStatus,
  ): Promise<void> {
    await this.findById(id);

    try {
      await this.commentRepository.update({ id }, { status });
    } catch (error) {
      this.logger.error({
        message: {
          function: this.updateStatus.name,
          error: (error as Error).message,
        },
      });
      throw new InternalServerErrorException();
    }
  }
}
