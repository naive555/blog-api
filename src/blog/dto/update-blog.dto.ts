import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { EStatus } from '../../utility/common.enum';

export class UpdateBlogDto {
  @ApiPropertyOptional({ example: 'Updated Blog Title' })
  @IsOptional()
  @IsString()
  title?: string;

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
