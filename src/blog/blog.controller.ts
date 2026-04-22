import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
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

import { GetAuthPayload } from '../auth/auth.decorator';
import { IAuthPayload } from '../auth/auth.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Blog } from './blog.entity';
import { BlogService } from './blog.service';
import { BlogQueryDto } from './dto/blog-query.dto';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // --- Public endpoints ---

  @ApiOperation({ summary: 'List blogs with search and pagination' })
  @ApiOkResponse({ description: 'Returns paginated blog list' })
  @Get()
  findAll(@Query() query: BlogQueryDto) {
    return this.blogService.findAll(query);
  }

  @ApiOperation({ summary: 'Get blog detail by slug (increments view count)' })
  @ApiOkResponse({ type: Blog })
  @ApiNotFoundResponse({ description: 'Blog not found' })
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  // --- Admin endpoints (JWT required) ---

  @ApiOperation({ summary: '[Admin] Create a new blog post' })
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: Blog })
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: CreateBlogDto, @GetAuthPayload() author: IAuthPayload) {
    return this.blogService.create(body, author);
  }

  @ApiOperation({ summary: '[Admin] Update a blog post' })
  @ApiBearerAuth()
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Blog not found' })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateBlogDto) {
    return this.blogService.update(id, body);
  }

  @ApiOperation({ summary: '[Admin] Soft-delete a blog post' })
  @ApiBearerAuth()
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Blog not found' })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogService.delete(id);
  }
}
