import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BlogImage } from './blog-image.entity';
import { BlogImageService } from './blog-image.service';
import { CreateBlogImageDto } from './dto/create-blog-image.dto';
import { UpdateBlogImageDto } from './dto/update-blog-image.dto';

@ApiTags('blog-image')
@Controller()
export class BlogImageController {
  constructor(private readonly blogImageService: BlogImageService) {}

  // --- Public endpoint ---

  @ApiOperation({ summary: 'List all images for a blog' })
  @ApiOkResponse({ type: [BlogImage] })
  @ApiNotFoundResponse({ description: 'Blog not found' })
  @Get('blog/:blogId/image')
  findByBlog(@Param('blogId', ParseUUIDPipe) blogId: string) {
    return this.blogImageService.findByBlog(blogId);
  }

  // --- Admin endpoints (JWT required) ---

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '[Admin] Add an image to a blog (max 1 cover + 6 additional)',
  })
  @ApiCreatedResponse({ type: BlogImage })
  @ApiNotFoundResponse({ description: 'Blog not found' })
  @Post('blog/:blogId/image')
  create(
    @Param('blogId', ParseUUIDPipe) blogId: string,
    @Body() body: CreateBlogImageDto,
  ) {
    return this.blogImageService.create(blogId, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '[Admin] Update an image (replace URL or promote to cover)',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Blog image not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('blog-image/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateBlogImageDto,
  ) {
    return this.blogImageService.update(id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[Admin] Delete an image' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Blog image not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('blog-image/:id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogImageService.delete(id);
  }
}
