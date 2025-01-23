// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import fs from 'fs'
import path from 'path'
import AWS from 'aws-sdk'
import Store from 's3-blob-store'
import BlobService from 'feathers-blob'
import multer from 'multer'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand, S3Client, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3'
import { BadRequest } from '@feathersjs/errors'
import dauria from 'dauria'

const customerFileNameRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.([0-9a-z]+)$/i;
const generatedObjRegex = /^[0-9a-fA-F]{24}_generated\.(:?OBJ|BREP|FCSTD)$/;
const generatedThumbnailRegex = /^[0-9a-fA-F]{24}_thumbnail\.PNG$/;
const copiedVersionThumbnailRegex = /^[0-9a-fA-F]{24}_[0-9a-fA-F]{24}_versionthumbnail\.PNG$/;
const exportedFileRegex = /^[0-9a-fA-F]{24}_export\.(?:fcstd|obj|step|stl)$/i;

const isValidFileName = fileName => {
  return [
    customerFileNameRegex, generatedObjRegex, generatedThumbnailRegex, copiedVersionThumbnailRegex, exportedFileRegex
  ].some(regex => regex.test(fileName))
}

class UploadService {
  constructor(options, blobService, s3Client) {
    this.options = options;
    this.blobService = blobService;
    this.s3Client = s3Client;
    this.useS3 = options.app.get('useS3'); // Flag to toggle S3 usage
    this.appUrl = `http://${options.app.get('host')}:${options.app.get('port')}`
  }

  getLocalFilePath(fileName) {
    return path.join(path.resolve('uploads'), fileName);
  }

  getAppUrl(params) {
    // Get base URL from request, fallback to configured host/port if not available
    if (params?.headers?.host) {
      const protocol = params.headers['x-forwarded-proto'] || 'http';
      return `${protocol}://${params.headers.host}`;
    }
    return `http://${this.options.app.get('host')}:${this.options.app.get('port')}`;
  }

  getPublicUrl(fileName, bucket, params) {
    if (this.useS3) {
      return `https://${this.options.app.get('awsClientModelBucket')}.s3.amazonaws.com/${fileName}`;
    }

    return `${this.getAppUrl(params)}/upload/download/${encodeURIComponent(fileName)}`;
  }

  async getSignedFileUrl(fileName, bucket, expiresIn, params) {
    if (!this.useS3) {
      return `${this.getAppUrl(params)}/upload/download/${fileName}`;
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: fileName,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getFileContent(bucketName, fileName) {
    if (!this.useS3) {
      const filePath = this.getLocalFilePath(fileName);
      if (!fs.existsSync(filePath)) {
        throw new BadRequest('File not found!');
      }
      return fs.readFileSync(filePath, 'utf-8');
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    });
    const { Body } = await this.s3Client.send(command)
    const chunks = [];
    for await (const chunk of Body) {
      chunks.push(chunk);
    }
    const fileContent = Buffer.concat(chunks).toString('utf-8');
    return fileContent
  }

  async checkFileExists(bucketName, fileName) {
    if (!this.useS3) {
      return fs.existsSync(this.getLocalFilePath(fileName));
    }

    try {
      const params = {
        Bucket: bucketName,
        Key: fileName
      };

      const command = new HeadObjectCommand(params);
      await this.s3Client.send(command);

      // The file exists
      return true;
    } catch (error) {
      if (error.$metadata.httpStatusCode === 404) {
        // The file does not exist
        return false;
      } else {
        // Handle other errors
        throw error;
      }
    }
  }

  async get(id, _params) {
    id = decodeURIComponent(id);
    const bucketName = this.options.app.get('awsClientModelBucket');
    const isFileExist = await this.checkFileExists(bucketName, id);

    let url = '';
    if (isFileExist) {
      if (_params.query?.fileContent === 'true') {
        return this.getFileContent(bucketName, id);
      }
      if (id.includes('public/')) {
        url = this.getPublicUrl(id, bucketName, _params);
      } else {
        url = await this.getSignedFileUrl(id, bucketName, 3600, _params);
      }
    }
    return { url: url };
  }

  async create(data, params) {
    if (!isValidFileName(data['id'])) {
      throw new BadRequest('Filename not valid!')
    }

    if (customerFileNameRegex.test(data['id'])) {
      const bucketName = this.options.app.get('awsClientModelBucket');
      const isFileExist = await this.checkFileExists(bucketName, data['id']);
      if (isFileExist) {
        throw new BadRequest('File already exists!');
      }
    }

    // Upload all thumbnails to public folder
    if (generatedThumbnailRegex.test(data['id'])) {
      data.id = `public/${data.id}`;
    }

    if (this.useS3) {
      return await this.blobService.create(data, params);
    } else {
      const filePath = this.getLocalFilePath(data.id);
      const buffer = dauria.parseDataURI(data.uri).buffer;
      fs.writeFileSync(filePath, buffer);
      return { id: data.id, size: buffer.length };
    }
  }

  async remove(id, _params) {
    if (this.useS3) {
      return await this.blobService.remove(id, _params);
    } else {
      const filePath = this.getLocalFilePath(id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { id };
      }
      throw new BadRequest('File not found!');
    }
  }

  async copy(sourceKey, destinationKey, _params) {
    const bucketName = this.options.app.get('awsClientModelBucket');
    const isDestinationFileExist = await this.checkFileExists(bucketName, destinationKey);
    if (isDestinationFileExist) {
      throw new BadRequest(`File (${destinationKey}) already exists!`);
    }

    const isSourceFileExist = await this.checkFileExists(bucketName, sourceKey);
    if (!isSourceFileExist) {
      throw new BadRequest(`File (${sourceKey}) does not exist!`);
    }

    if (this.useS3) {
      // Create a copy operation using the CopyObjectCommand
      const copyCommand = new CopyObjectCommand({
        CopySource: `/${bucketName}/${sourceKey}`,
        Bucket: bucketName,
        Key: destinationKey,
      });

      return await this.s3Client.send(copyCommand);
    } else {
      const sourceFilePath = this.getLocalFilePath(sourceKey);
      const destinationFilePath = this.getLocalFilePath(destinationKey);

      if (!fs.existsSync(sourceFilePath)) {
        throw new BadRequest(`Source file (${sourceKey}) does not exist!`);
      }

      fs.copyFileSync(sourceFilePath, destinationFilePath);
      return { sourceKey, destinationKey };
    }
  }

  async upsert(sourceKey, destinationKey, _params) {
    const bucketName = this.options.app.get('awsClientModelBucket');
    const isSourceFileExist = await this.checkFileExists(bucketName, sourceKey);
    if (!isSourceFileExist) {
      throw new BadRequest(`File (${sourceKey}) does not exist!`);
    }

    // const isDestinationFileExist = await this.checkFileExists(bucketName, destinationKey);
    // if (isDestinationFileExist) {
    // }

    if (this.useS3) {
      // Create a copy operation using the CopyObjectCommand
      const copyCommand = new CopyObjectCommand({
        CopySource: `/${bucketName}/${sourceKey}`,
        Bucket: bucketName,
        Key: destinationKey,
      });

      return await this.s3Client.send(copyCommand);
    } else {
      const sourceFilePath = this.getLocalFilePath(sourceKey);
      const destinationFilePath = this.getLocalFilePath(destinationKey);

      if (!fs.existsSync(sourceFilePath)) {
        throw new BadRequest(`Source file (${sourceKey}) does not exist!`);
      }

      fs.copyFileSync(sourceFilePath, destinationFilePath);
      return { sourceKey, destinationKey };
    }
  }
}

const getOptions = (app) => {
  return { app }
}

export const getUploadService = function(app){

  const credentials = {
    accessKeyId: app.get('awsAccessKeyId'),
    secretAccessKey: app.get('awsSecretAccessKey'),
  }

  let blobStore, blobUploadService, s3Client;
  if (app.get('useS3')) {
    const s3 = new AWS.S3(credentials);

    blobStore = Store({
      client: s3,
      bucket: app.get('awsClientModelBucket')
    });

    blobUploadService = BlobService({
      Model: blobStore,
      returnUri: false,
    });

    s3Client = new S3Client({
      credentials: credentials,
      region: app.get('awsRegion')
    });
  }

  return new UploadService(getOptions(app), blobUploadService, s3Client);
}


export const multipartMiddleware = multer();
