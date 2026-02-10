import nconf from 'nconf';
import { authWithHeaders } from '../../middlewares/auth';
import {
  BadRequest,
  NotAuthorized,
} from '../../libs/errors';
import { apiError } from '../../libs/apiError';
import {
  listMediaObjects,
  createUploadUrl,
  getMediaConfig,
  getMediaPublicUrl,
} from '../../libs/media';

const api = {};

function ensureMediaEnabled () {
  const { bucket, publicBaseUrl } = getMediaConfig();
  if (!bucket || !publicBaseUrl) {
    throw new NotAuthorized(apiError('notAuthorized'));
  }
}

api.listMedia = {
  method: 'GET',
  url: '/media/tasks',
  middlewares: [authWithHeaders()],
  async handler (req, res) {
    ensureMediaEnabled();
    const { objects } = await listMediaObjects();
    const items = objects.map(obj => ({
      key: obj.key,
      url: getMediaPublicUrl(obj.key),
      size: obj.size,
      lastModified: obj.lastModified,
    }));
    res.respond(200, items);
  },
};

api.signUpload = {
  method: 'POST',
  url: '/media/tasks/sign-upload',
  middlewares: [authWithHeaders()],
  async handler (req, res) {
    ensureMediaEnabled();
    req.checkBody('filename', apiError('missingFilename')).notEmpty();
    req.checkBody('contentType', apiError('missingContentType')).notEmpty();
    req.checkBody('size', apiError('missingSize')).notEmpty().isNumeric();

    const validationErrors = req.validationErrors();
    if (validationErrors) throw validationErrors;

    const { filename, contentType } = req.body;
    const size = Number(req.body.size);
    const {
      prefix,
      maxSizeBytes,
      allowList,
    } = getMediaConfig();

    if (size > maxSizeBytes) throw new BadRequest(apiError('fileSizeTooLarge'));
    if (!allowList.includes(contentType)) throw new BadRequest(apiError('invalidContentType'));

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${prefix}${Date.now()}-${safeName}`;
    const uploadUrl = await createUploadUrl({ key, contentType });

    if (!uploadUrl) throw new BadRequest(apiError('errorCreatingUploadUrl'));

    res.respond(200, {
      uploadUrl,
      key,
      publicUrl: getMediaPublicUrl(key),
    });
  },
};

export default api;
