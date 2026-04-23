import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'เนื้อหาดีมาก เต็ม 10 หักหมด' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @Matches(/^[\u0E00-\u0E7F0-9\s]+$/, {
    message: 'content must contain only Thai characters and numbers',
  })
  content: string;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  authorName: string;
}
