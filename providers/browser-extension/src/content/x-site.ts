import {
  createXMessageApi,
} from './x-message-api.js';
import {
  createXPostApi,
} from './x-post-api.js';
import {
  createXProfileApi,
} from './x-profile-api.js';
import type { XSiteDeps } from './x-types.js';

export function createXSiteApi(deps: XSiteDeps) {
  const postApi = createXPostApi(deps);
  const messageApi = createXMessageApi(deps);
  const profileApi = createXProfileApi(deps, postApi);

  return {
    ...postApi,
    ...messageApi,
    ...profileApi,
  };
}
