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
import crypto from 'crypto'
import { isSiteAdministrator } from '../hooks/administration.js'

const customerFileNameRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.([0-9a-z_]+)$/i;
const generatedObjRegex = /^[0-9a-fA-F]{24}_generated\.(:?OBJ|BREP|FCSTD)$/;
const generatedThumbnailRegex = /^[0-9a-fA-F]{24}_thumbnail\.PNG$/;
const copiedVersionThumbnailRegex = /^[0-9a-fA-F]{24}_[0-9a-fA-F]{24}_versionthumbnail\.PNG$/;
const exportedFileRegex = /^[0-9a-fA-F]{24}_export\.(?:fcstd|obj|step|stl)$/i;
const brandingLogoRegex = /^public\/branding\/(?:logo|favicon)\.([0-9a-z]+)$/i;
const defaultModelThumbnailRegex = /^public\/default-model_thumbnail\.PNG$/;

const isValidFileName = (fileName, isAdmin = false) => {
  const regexes = [
    customerFileNameRegex, generatedObjRegex, generatedThumbnailRegex, copiedVersionThumbnailRegex, exportedFileRegex
  ];

  // Allow branding logo and default model thumbnail regex for admin users only
  if (isAdmin) {
    regexes.push(brandingLogoRegex, defaultModelThumbnailRegex);
  }

  return regexes.some(regex => regex.test(fileName))
}

// Resolves `fileName` inside the `root` directory. Returns null if the result would escape `root`
// (e.g. via `../` segments or an absolute path), so client-supplied names can't reach other files.
// See GHSA-c92p-76pm-5vfq for details.
export const resolveInsideDirectory = (root, fileName) => {
  if (typeof fileName !== 'string' || fileName.length === 0 || fileName.includes('\0')) {
    return null;
  }
  const resolvedRoot = path.resolve(root);
  const filePath = path.resolve(resolvedRoot, fileName);
  if (!filePath.startsWith(resolvedRoot + path.sep)) {
    return null;
  }
  return filePath;
}

class UploadService {
  constructor(options, blobService, s3Client) {
    this.options = options;
    this.blobService = blobService;
    this.s3Client = s3Client;
    this.useS3 = options.app.get('useS3'); // Flag to toggle S3 usage
    this.appUrl = options.app.get('backendUrl').replace(/\/$/, '');
    this.localSignedUrlSecret = options.app.get('localSignedUrlSecret') || crypto.randomBytes(32).toString('hex');
  }

  getLocalFilePath(fileName) {
    const filePath = resolveInsideDirectory('uploads', fileName);
    if (!filePath) {
      throw new BadRequest('Invalid file name!');
    }
    return filePath;
  }

  getPublicUrl(fileName, bucket) {
    if (this.useS3) {
      return `https://${this.options.app.get('awsClientModelBucket')}.s3.amazonaws.com/${fileName}`;
    }

    return `${this.appUrl}/upload/download/${encodeURIComponent(fileName)}`;
  }

  getPublicBrandingUrl(fileName, bucket) {
    if (this.useS3) {
      return `https://${this.options.app.get('awsClientModelBucket')}.s3.amazonaws.com/${fileName}`;
    }

    return `${this.appUrl}/${fileName}`;
  }

  generateLocalSignedUrl(fileName, expiresIn) {
    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    const signature = crypto
      .createHmac('sha512', this.localSignedUrlSecret)
      .update(`${fileName}:${expires}`)
      .digest('hex');

    return `${this.appUrl}/upload/download/${encodeURIComponent(fileName)}?expires=${expires}&signature=${signature}`;
  }

  verifyLocalSignedUrl(fileName, req) {
    const { signature, expires } = req.query;
    if (!signature || !expires) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > expires) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha512', this.localSignedUrlSecret)
      .update(`${fileName}:${expires}`)
      .digest('hex');

    return signature === expectedSignature;
  }

  async getSignedFileUrl(fileName, bucket, expiresIn) {
    if (!this.useS3) {
      return this.generateLocalSignedUrl(fileName, expiresIn);
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
      if (id.includes('public/branding/')) {
        url = this.getPublicBrandingUrl(id, bucketName);
      } else if (id.includes('public/')) {
        url = this.getPublicUrl(id, bucketName);
      } else {
        url = await this.getSignedFileUrl(id, bucketName, 3600);
      }
    }
    return { url: url };
  }

  async create(data, params) {
    const [isAdmin, reason] = await isSiteAdministrator(params, this.options.app);
    if (!isValidFileName(data['id'], isAdmin)) {
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
