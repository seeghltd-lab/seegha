import { memoryStorage } from 'multer';
import * as path from 'path';

// All files go to memory (buffer) and are uploaded to Cloudinary by the controller.

const imageFilter = (_req: any, file: any, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (/\.(jpeg|jpg|png|gif|webp)$/.test(ext)) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const employeeCombinedFilter = (_req: any, file: any, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isImageField = ['profileImg', 'idCardImage'].includes(file.fieldname);
  const isDocField = ['cvDocument', 'supportingDocument'].includes(file.fieldname);

  if (isImageField) {
    /\.(jpeg|jpg|png|gif|webp)$/.test(ext)
      ? cb(null, true)
      : cb(new Error('Only image files are allowed for this field'), false);
  } else if (isDocField) {
    /\.(pdf|doc|docx)$/.test(ext)
      ? cb(null, true)
      : cb(new Error('Only PDF or Word documents are allowed for this field'), false);
  } else {
    cb(null, true);
  }
};

// Profile image only (employee self-update)
export const EmployeeUploadConfig = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
};

// All employee files: profileImg + idCardImage (images) + cvDocument + supportingDocument (docs)
export const EmployeeCombinedUploadConfig = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: employeeCombinedFilter,
};
