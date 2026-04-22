import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreateBlogImageDto {
  @ApiProperty({ example: 'https://example.com/images/photo.jpg' })
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Set to true to make this the cover image (only one allowed per blog)',
  })
  @IsOptional()
  @IsBoolean()
  isCover?: boolean = false;
}
