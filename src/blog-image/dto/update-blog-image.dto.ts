import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUrl } from 'class-validator';

export class UpdateBlogImageDto {
  @ApiPropertyOptional({ example: 'https://example.com/images/updated.jpg' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Promote this image to cover (automatically demotes the current cover)',
  })
  @IsOptional()
  @IsBoolean()
  isCover?: boolean;
}
