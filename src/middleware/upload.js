const multer = require('multer');
const { logger } = require('./errorHandler');
const imageProcessingService = require('../services/ImageProcessingService');

// Configure multer for memory storage (no temp files)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  try {
    // Validate file using image processing service
    const validation = imageProcessingService.validateImageFile({
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    });

    if (!validation.isValid) {
      logger.warn('File upload rejected:', {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        errors: validation.errors,
        requestId: req.requestId,
      });

      return cb(new Error(`File validation failed: ${validation.errors.join(', ')}`), false);
    }

    logger.info('File upload accepted:', {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      requestId: req.requestId,
    });

    cb(null, true);
  } catch (error) {
    logger.error('File filter error:', {
      error: error.message,
      filename: file.originalname,
      requestId: req.requestId,
    });
    cb(error, false);
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10, // Maximum 10 files per request
  },
});

// Middleware for single file upload
const uploadSingle = (fieldName = 'image') => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);

    uploadMiddleware(req, res, (error) => {
      if (error) {
        logger.error('File upload error:', {
          error: error.message,
          requestId: req.requestId,
          userId: req.auth?.userId,
        });

        // Handle specific multer errors
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'File size exceeds 5MB limit',
              requestId: req.requestId,
            },
          });
        }

        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(413).json({
            error: {
              code: 'TOO_MANY_FILES',
              message: 'Too many files uploaded',
              requestId: req.requestId,
            },
          });
        }

        if (error.message.includes('File validation failed')) {
          return res.status(415).json({
            error: {
              code: 'INVALID_FILE_TYPE',
              message: error.message,
              requestId: req.requestId,
            },
          });
        }

        return res.status(400).json({
          error: {
            code: 'UPLOAD_ERROR',
            message: 'File upload failed',
            requestId: req.requestId,
          },
        });
      }

      next();
    });
  };
};

// Middleware for multiple file upload
const uploadMultiple = (fieldName = 'images', maxCount = 10) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.array(fieldName, maxCount);

    uploadMiddleware(req, res, (error) => {
      if (error) {
        logger.error('Multiple file upload error:', {
          error: error.message,
          requestId: req.requestId,
          userId: req.auth?.userId,
        });

        // Handle specific multer errors
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'One or more files exceed 5MB limit',
              requestId: req.requestId,
            },
          });
        }

        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(413).json({
            error: {
              code: 'TOO_MANY_FILES',
              message: `Maximum ${maxCount} files allowed`,
              requestId: req.requestId,
            },
          });
        }

        if (error.message.includes('File validation failed')) {
          return res.status(415).json({
            error: {
              code: 'INVALID_FILE_TYPE',
              message: error.message,
              requestId: req.requestId,
            },
          });
        }

        return res.status(400).json({
          error: {
            code: 'UPLOAD_ERROR',
            message: 'File upload failed',
            requestId: req.requestId,
          },
        });
      }

      next();
    });
  };
};

// Middleware to validate uploaded files
const validateUploadedFiles = (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_FILES_UPLOADED',
          message: 'No files were uploaded',
          requestId: req.requestId,
        },
      });
    }

    // Additional validation for each file
    for (const file of files) {
      const validation = imageProcessingService.validateImageFile({
        mimetype: file.mimetype,
        originalname: file.originalname,
        size: file.size,
      });

      if (!validation.isValid) {
        return res.status(415).json({
          error: {
            code: 'INVALID_FILE',
            message: `File ${file.originalname}: ${validation.errors.join(', ')}`,
            requestId: req.requestId,
          },
        });
      }
    }

    logger.info('All uploaded files validated successfully', {
      fileCount: files.length,
      requestId: req.requestId,
      userId: req.auth?.userId,
    });

    next();
  } catch (error) {
    logger.error('File validation error:', {
      error: error.message,
      requestId: req.requestId,
    });

    res.status(500).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'File validation failed',
        requestId: req.requestId,
      },
    });
  }
};

// Middleware to get upload limits and supported formats
const getUploadInfo = (req, res) => {
  try {
    const supportedFormats = imageProcessingService.getSupportedFormats();

    res.json({
      data: {
        maxFileSize: supportedFormats.maxSize,
        maxFiles: 10,
        supportedFormats: supportedFormats.formats,
        supportedMimeTypes: supportedFormats.mimeTypes,
        maxFileSizeMB: Math.round(supportedFormats.maxSize / 1024 / 1024),
      },
    });
  } catch (error) {
    logger.error('Failed to get upload info:', {
      error: error.message,
      requestId: req.requestId,
    });

    res.status(500).json({
      error: {
        code: 'UPLOAD_INFO_ERROR',
        message: 'Failed to get upload information',
        requestId: req.requestId,
      },
    });
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  validateUploadedFiles,
  getUploadInfo,
};
