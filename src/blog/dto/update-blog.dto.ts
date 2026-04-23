import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

import { EStatus } from '../../utility/common.enum';

export class UpdateBlogDto {
  @ApiPropertyOptional({ example: 'Updated Blog Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'updated-blog-title' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'Updated content for the blog post.' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;

  @ApiPropertyOptional({ enum: EStatus, example: EStatus.ENABLED })
  @IsOptional()
  @IsEnum(EStatus)
  status?: EStatus;
}
