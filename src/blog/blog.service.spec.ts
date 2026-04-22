import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EStatus } from '../utility/common.enum';
import { Blog } from './blog.entity';
import { BlogService } from './blog.service';

const mockBlog: Blog = {
  id: 'uuid-1',
  title: 'Test Blog',
  slug: 'test-blog',
  content: 'Test content here.',
  viewCount: 0,
  status: EStatus.ENABLED,
  authorId: 'uuid-author',
  author: null,
  comments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('BlogService', () => {
  let service: BlogService;
  let repo: jest.Mocked<Repository<Blog>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        {
          provide: getRepositoryToken(Blog),
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            increment: jest.fn(),
            exists: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
    repo = module.get(getRepositoryToken(Blog));
  });

  describe('findAll', () => {
    it('returns paginated blog list', async () => {
      repo.findAndCount.mockResolvedValue([[mockBlog], 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({ data: [mockBlog], total: 1 });
      expect(repo.findAndCount).toHaveBeenCalledTimes(1);
    });
  });

  describe('findBySlug', () => {
    it('throws NotFoundException when blog does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('increments view count and returns blog', async () => {
      repo.findOne.mockResolvedValue({ ...mockBlog });
      repo.increment.mockResolvedValue(undefined);

      const result = await service.findBySlug('test-blog');

      expect(repo.increment).toHaveBeenCalledWith(
        { id: mockBlog.id },
        'viewCount',
        1,
      );
      expect(result.viewCount).toBe(1);
    });
  });

  describe('create', () => {
    it('throws ConflictException when slug already exists', async () => {
      repo.exists.mockResolvedValue(true);

      await expect(
        service.create(
          { title: 'Test Blog', content: 'Content here.' },
          { sub: 'uuid-author', username: 'admin' },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('creates and returns a blog', async () => {
      repo.exists.mockResolvedValue(false);
      repo.create.mockReturnValue(mockBlog);
      repo.save.mockResolvedValue(mockBlog);

      const result = await service.create(
        { title: 'Test Blog', content: 'Content here.' },
        { sub: 'uuid-author', username: 'admin' },
      );

      expect(result).toEqual(mockBlog);
    });
  });

  describe('delete', () => {
    it('throws NotFoundException when blog does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('soft-deletes a blog', async () => {
      repo.findOneBy.mockResolvedValue(mockBlog);
      repo.update.mockResolvedValue(undefined);

      await service.delete(mockBlog.id);

      expect(repo.update).toHaveBeenCalledWith(
        { id: mockBlog.id },
        { status: EStatus.DELETED },
      );
    });
  });
});
