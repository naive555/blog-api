import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Blog } from '../blog/blog.entity';
import { ECommentStatus } from '../utility/common.enum';

export const TABLE_COMMENT = 'comment';

@Entity({ name: TABLE_COMMENT })
export class Comment {
  @ApiProperty({ example: 'uuid-5678' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Great post, very informative!' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ example: 'John Doe' })
  @Column({ name: 'author_name' })
  authorName: string;

  @ApiProperty({ enum: ECommentStatus, example: ECommentStatus.PENDING })
  @Column({ type: 'varchar', default: ECommentStatus.PENDING })
  status: ECommentStatus;

  @ApiProperty({ example: 'uuid-1234' })
  @Column({ name: 'blog_id' })
  blogId: string;

  @ApiHideProperty()
  @ManyToOne(() => Blog, (blog) => blog.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blog_id' })
  blog: Blog;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
