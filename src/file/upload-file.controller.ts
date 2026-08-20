import {
  //   BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  //   UploadedFile,
  UseGuards,
  //   UseInterceptors,
} from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  //   ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreatePresignedUploadDto,
  QueryFileDto,
  //   TestUploadFile,
} from './dto/file.dto';
import { UploadFileServiceS3 } from './upload-file.service';

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadFileController {
  constructor(private readonly service: UploadFileServiceS3) {}

  //   @Post('test-upload')
  //   @UseInterceptors(FileInterceptor('file'))
  //   @ApiOperation({ summary: 'Upload one file directly to S3 for testing' })
  //   @ApiConsumes('multipart/form-data')
  //   @ApiBody({
  //     schema: {
  //       type: 'object',
  //       required: ['file'],
  //       properties: {
  //         file: { type: 'string', format: 'binary' },
  //       },
  //     },
  //   })
  //   @ApiResponse({ status: 201, description: 'File uploaded to S3' })
  //   @ApiResponse({ status: 400, description: 'File is required' })
  //   testUpload(@UploadedFile() file: TestUploadFile | undefined) {
  //     if (!file) throw new BadRequestException('File is required');
  //     return this.service.testUpload(file);
  //   }

  @Post('presigned-upload-url')
  @ApiOperation({ summary: 'Create a file record and presigned S3 PUT URL' })
  @ApiBody({ type: CreatePresignedUploadDto })
  @ApiResponse({ status: 201, description: 'Presigned upload URL created' })
  @ApiResponse({ status: 404, description: 'Associated entity not found' })
  createPresignedUpload(@Body() dto: CreatePresignedUploadDto) {
    return this.service.createPresignedUpload(dto);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm that a pending upload exists on S3' })
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  @ApiResponse({ status: 200, description: 'File marked ACTIVE' })
  @ApiResponse({ status: 400, description: 'S3 object does not exist' })
  confirm(@Param('id', ParseIntPipe) id: number) {
    return this.service.confirm(id);
  }

  @Get()
  @ApiOperation({ summary: 'List files with pagination and entity filters' })
  @ApiResponse({ status: 200, description: 'Paginated file list' })
  findAll(@Query() query: QueryFileDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file metadata and a one-hour download URL' })
  @ApiResponse({ status: 200, description: 'File and download URL' })
  @ApiResponse({ status: 404, description: 'File not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete the S3 object and soft-delete its record' })
  @ApiResponse({ status: 200, description: 'File deleted' })
  @ApiResponse({ status: 404, description: 'File not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
