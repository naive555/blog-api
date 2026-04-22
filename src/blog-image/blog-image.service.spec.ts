import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BlogService } from '../blog/blog.service';
import { BlogImage } from './blog-image.entity';
import { BlogImageService } from './blog-image.service';

const mockImage: BlogImage = {
  id: 'uuid-img-1',
  blogId: 'uuid-blog-1',
  blog: null,
  url: 'https://example.com/image.jpg',
  isCover: false,
  createdAt: new Date(),
};

describe('BlogImageService', () => {
  let service: BlogImageService;
  let repo: jest.Mocked<Repository<BlogImage>>;
  let blogService: jest.Mocked<BlogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogImageService,
        {
          provide: getRepositoryToken(BlogImage),
          useValue: {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            existsBy: jest.fn(),
            countBy: jest.fn(),
          },
        },
        {
          provide: BlogService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<BlogImageService>(BlogImageService);
    repo = module.get(getRepositoryToken(BlogImage));
    blogService = module.get(BlogService);
  });

  describe('create', () => {
    it('throws ConflictException when adding a second cover', async () => {
      blogService.findById.mockResolvedValue(undefined);
      repo.existsBy.mockResolvedValue(true); // cover already exists

      await expect(
        service.create('uuid-blog-1', {
          url: 'https://example.com/cover2.jpg',
          isCover: true,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when additional images exceed limit', async () => {
      blogService.findById.mockResolvedValue(undefined);
      repo.countBy.mockResolvedValue(6); // already at max

      await expect(
        service.create('uuid-blog-1', {
          url: 'https://example.com/extra.jpg',
          isCover: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('clears existing cover when promoting new cover', async () => {
      blogService.findById.mockResolvedValue(undefined);
      repo.existsBy.mockResolvedValue(false);
      repo.update.mockResolvedValue(undefined);
      repo.create.mockReturnValue(mockImage);
      repo.save.mockResolvedValue(mockImage);

      await service.create('uuid-blog-1', {
        url: 'https://example.com/cover.jpg',
        isCover: true,
      });

      expect(repo.update).toHaveBeenCalledWith(
        { blogId: 'uuid-blog-1', isCover: true },
        { isCover: false },
      );
    });
  });

  describe('update', () => {
    it('throws NotFoundException when image does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { isCover: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('clears previous cover when promoting a new one', async () => {
      repo.findOneBy.mockResolvedValue({ ...mockImage, isCover: false });
      repo.update.mockResolvedValue(undefined);

      await service.update(mockImage.id, { isCover: true });

      expect(repo.update).toHaveBeenNthCalledWith(
        1,
        { blogId: mockImage.blogId, isCover: true },
        { isCover: false },
      );
    });
  });

  describe('delete', () => {
    it('throws NotFoundException when image does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes an existing image', async () => {
      repo.findOneBy.mockResolvedValue(mockImage);
      repo.delete.mockResolvedValue(undefined);

      await service.delete(mockImage.id);

      expect(repo.delete).toHaveBeenCalledWith(mockImage.id);
    });
  });
});
