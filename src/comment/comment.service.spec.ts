import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BlogService } from '../blog/blog.service';
import { ECommentStatus } from '../utility/common.enum';
import { Comment } from './comment.entity';
import { CommentService } from './comment.service';

const mockComment: Comment = {
  id: 'uuid-comment-1',
  content: 'Great post!',
  authorName: 'John Doe',
  status: ECommentStatus.PENDING,
  blogId: 'uuid-blog-1',
  blog: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CommentService', () => {
  let service: CommentService;
  let repo: jest.Mocked<Repository<Comment>>;
  let blogService: jest.Mocked<BlogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: getRepositoryToken(Comment),
          useValue: {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: BlogService,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
    repo = module.get(getRepositoryToken(Comment));
    blogService = module.get(BlogService);
  });

  describe('create', () => {
    it('throws NotFoundException when blog does not exist', async () => {
      blogService.findById.mockRejectedValue(new NotFoundException());

      await expect(
        service.create('nonexistent-blog', {
          content: 'Test',
          authorName: 'Jane',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a pending comment', async () => {
      blogService.findById.mockResolvedValue(undefined);
      repo.create.mockReturnValue(mockComment);
      repo.save.mockResolvedValue(mockComment);

      const result = await service.create('uuid-blog-1', {
        content: 'Great post!',
        authorName: 'John Doe',
      });

      expect(result.status).toBe(ECommentStatus.PENDING);
    });
  });

  describe('approve', () => {
    it('throws NotFoundException when comment does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.approve('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates status to approved', async () => {
      repo.findOneBy.mockResolvedValue(mockComment);
      repo.update.mockResolvedValue(undefined);

      await service.approve(mockComment.id);

      expect(repo.update).toHaveBeenCalledWith(
        { id: mockComment.id },
        { status: ECommentStatus.APPROVED },
      );
    });
  });

  describe('reject', () => {
    it('updates status to rejected', async () => {
      repo.findOneBy.mockResolvedValue(mockComment);
      repo.update.mockResolvedValue(undefined);

      await service.reject(mockComment.id);

      expect(repo.update).toHaveBeenCalledWith(
        { id: mockComment.id },
        { status: ECommentStatus.REJECTED },
      );
    });
  });
});
