import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

import { ECommentStatus } from '../../utility/common.enum';

export class CommentQueryDto {
  @ApiPropertyOptional({
    enum: ECommentStatus,
    example: ECommentStatus.PENDING,
    description: 'Filter by approval status',
  })
  @IsOptional()
  @IsEnum(ECommentStatus)
  status?: ECommentStatus;

  @ApiPropertyOptional({
    example: 'uuid-blog-id',
    description: 'Filter by blog',
  })
  @IsOptional()
  @IsUUID()
  blogId?: string;
}
