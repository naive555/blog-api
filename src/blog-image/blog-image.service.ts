import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BlogService } from '../blog/blog.service';
import { MAX_BLOG_ADDITIONAL_IMAGES } from '../utility/common.constant';
import { CreateBlogImageDto } from './dto/create-blog-image.dto';
import { UpdateBlogImageDto } from './dto/update-blog-image.dto';
import { BlogImage } from './blog-image.entity';

@Injectable()
export class BlogImageService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    @InjectRepository(BlogImage)
    private readonly blogImageRepository: Repository<BlogImage>,
    private readonly blogService: BlogService,
  ) {}

  async findByBlog(blogId: string): Promise<BlogImage[]> {
    this.logger.log({
      message: { function: this.findByBlog.name, data: { blogId } },
    });

    try {
      return await this.blogImageRepository.find({
        where: { blogId },
        order: { isCover: 'DESC', createdAt: 'ASC' },
      });
    } catch (error) {
      this.logger.error({
        message: {
          function: this.findByBlog.name,
          error: (error as Error).message,
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async create(blogId: string, dto: CreateBlogImageDto): Promise<BlogImage> {
    this.logger.log({
      message: { function: this.create.name, data: { blogId } },
    });

    await this.blogService.findById(blogId);
    await this.validateImageConstraints(blogId, dto.isCover);

    try {
      if (dto.isCover) {
        await this.clearCover(blogId);
      }

      const image = this.blogImageRepository.create({ ...dto, blogId });
      return await this.blogImageRepository.save(image);
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

  async update(id: string, dto: UpdateBlogImageDto): Promise<void> {
    this.logger.log({ message: { function: this.update.name, data: { id } } });

    const image = await this.findById(id);

    try {
      if (dto.isCover === true && !image.isCover) {
        await this.clearCover(image.blogId);
      }

      await this.blogImageRepository.update(id, dto);
    } catch (error) {
      this.logger.error({
        message: {
          function: this.update.name,
          error: (error as Error).message,
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async delete(id: string): Promise<void> {
    this.logger.log({ message: { function: this.delete.name, data: { id } } });

    await this.findById(id);

    try {
      await this.blogImageRepository.delete(id);
    } catch (error) {
      this.logger.error({
        message: {
          function: this.delete.name,
          error: (error as Error).message,
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async findById(id: string): Promise<BlogImage> {
    const image = await this.blogImageRepository.findOneBy({ id });
    if (!image) throw new NotFoundException('Blog image not found');
    return image;
  }

  private async validateImageConstraints(
    blogId: string,
    isCover: boolean,
  ): Promise<void> {
    if (isCover) {
      const coverExists = await this.blogImageRepository.existsBy({
        blogId,
        isCover: true,
      });
      if (coverExists) {
        throw new ConflictException(
          'A cover image already exists. Update the existing cover or delete it first.',
        );
      }
    } else {
      const additionalCount = await this.blogImageRepository.countBy({
        blogId,
        isCover: false,
      });
      if (additionalCount >= MAX_BLOG_ADDITIONAL_IMAGES) {
        throw new BadRequestException(
          `A blog can have at most ${MAX_BLOG_ADDITIONAL_IMAGES} additional images.`,
        );
      }
    }
  }

  private async clearCover(blogId: string): Promise<void> {
    await this.blogImageRepository.update(
      { blogId, isCover: true },
      { isCover: false },
    );
  }
}
