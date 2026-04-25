import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';

import { IAuthPayload } from '../auth/auth.interface';
import { EStatus } from '../utility/common.enum';
import { BlogQueryDto } from './dto/blog-query.dto';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { Blog } from './blog.entity';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    @InjectRepository(Blog)
    private readonly blogRepository: Repository<Blog>,
  ) {}

  async findAll(query: BlogQueryDto): Promise<{ data: Blog[]; total: number }> {
    this.logger.log({ message: { function: this.findAll.name, data: query } });

    try {
      const { search, page = 1, limit = 10 } = query;
      const skip = (page - 1) * limit;

      const [data, total] = await this.blogRepository.findAndCount({
        where: {
          status: Not(EStatus.DELETED),
          ...(search && { title: ILike(`%${search}%`) }),
        },
        relations: { images: true },
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          content: true,
          images: true,
          viewCount: true,
          authorId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return { data, total };
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

  async findBySlug(slug: string): Promise<Blog> {
    this.logger.log({
      message: { function: this.findBySlug.name, data: { slug } },
    });

    try {
      const blog = await this.blogRepository.findOne({
        where: { slug, status: Not(EStatus.DELETED) },
        relations: { comments: true, images: true },
      });

      if (!blog) throw new NotFoundException('Blog not found');

      await this.blogRepository.increment({ id: blog.id }, 'viewCount', 1);
      blog.viewCount += 1;

      return blog;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error({
        message: {
          function: this.findBySlug.name,
          error: (error as Error).message,
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async findById(id: string): Promise<Blog> {
    this.logger.log({
      message: { function: this.findById.name, data: { id } },
    });

    try {
      const blog = await this.blogRepository.findOneBy({
        id,
        status: Not(EStatus.DELETED),
      });
      if (!blog) throw new NotFoundException('Blog not found');
      return blog;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error({
        message: {
          function: this.findById.name,
          error: (error as Error).message,
        },
      });
      throw new InternalServerErrorException();
    }
  }

  async create(blogData: CreateBlogDto, author: IAuthPayload): Promise<Blog> {
    this.logger.log({
      message: { function: this.create.name, data: { title: blogData.title } },
    });

    const slug = this.generateSlug(blogData.title);
    await this.validateUniqueSlug(slug);

    try {
      const blog = this.blogRepository.create({
        ...blogData,
        slug,
        authorId: author.sub,
      });

      return await this.blogRepository.save(blog);
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

  async update(id: string, blogData: UpdateBlogDto): Promise<void> {
    this.logger.log({ message: { function: this.update.name, data: { id } } });

    await this.findById(id);

    const updateData: Partial<Blog> = { ...blogData };
    if (blogData.slug) {
      await this.validateUniqueSlug(blogData.slug, id);
      updateData.slug = blogData.slug;
    } else if (blogData.title) {
      const generatedSlug = this.generateSlug(blogData.title);
      await this.validateUniqueSlug(generatedSlug, id);
      updateData.slug = generatedSlug;
    }

    try {
      await this.blogRepository.update(id, updateData);
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
      await this.blogRepository.update({ id }, { status: EStatus.DELETED });
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

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private async validateUniqueSlug(
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const exists = await this.blogRepository.exists({
      where: {
        slug,
        status: Not(EStatus.DELETED),
        ...(excludeId && { id: Not(excludeId) }),
      },
    });

    if (exists)
      throw new ConflictException('A blog with this title already exists');
  }
}
