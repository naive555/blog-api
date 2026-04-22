import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Blog } from '../blog/blog.entity';

export const TABLE_BLOG_IMAGE = 'blog_image';

@Entity({ name: TABLE_BLOG_IMAGE })
export class BlogImage {
  @ApiProperty({ example: 'uuid-img-1' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'uuid-blog-1' })
  @Column({ name: 'blog_id' })
  blogId: string;

  @ApiHideProperty()
  @ManyToOne(() => Blog, (blog) => blog.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blog_id' })
  blog: Blog;

  @ApiProperty({ example: 'https://example.com/images/cover.jpg' })
  @Column()
  url: string;

  @ApiProperty({
    example: true,
    description: 'True if this is the cover image',
  })
  @Column({ name: 'is_cover', default: false })
  isCover: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
