import {
  createFormActionApi,
} from './form-action-api.js';
import {
  createFormReadApi,
} from './form-read-api.js';
import type { FormApiDeps } from './form-types.js';

export function createFormApi(deps: FormApiDeps) {
  const readApi = createFormReadApi(deps);
  const actionApi = createFormActionApi(deps, readApi);
  return {
    ...readApi,
    ...actionApi,
  };
}
