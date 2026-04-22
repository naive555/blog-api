import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { BlogImage } from '../blog-image/blog-image.entity';
import { Comment } from '../comment/comment.entity';
import { User } from '../user/user.entity';
import { EStatus } from '../utility/common.enum';

export const TABLE_BLOG = 'blog';

@Entity({ name: TABLE_BLOG })
export class Blog {
  @ApiProperty({ example: 'uuid-1234' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'My First Blog Post' })
  @Column()
  title: string;

  @ApiProperty({ example: 'my-first-blog-post' })
  @Column({ unique: true })
  slug: string;

  @ApiProperty({ example: 'This is the full content of the blog post.' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ example: 42 })
  @Column({ default: 0, name: 'view_count' })
  viewCount: number;

  @ApiProperty({ enum: EStatus, example: EStatus.ENABLED })
  @Column({ type: 'smallint', default: EStatus.ENABLED })
  status: EStatus;

  @ApiProperty({ example: 'uuid-author' })
  @Column({ name: 'author_id' })
  authorId: string;

  @ApiHideProperty()
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @ApiHideProperty()
  @OneToMany(() => BlogImage, (image) => image.blog)
  images: BlogImage[];

  @ApiHideProperty()
  @OneToMany(() => Comment, (comment) => comment.blog)
  comments: Comment[];

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
