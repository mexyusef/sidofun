import {
  createXSiteApi,
} from './x-site.js';
import {
  findButtonByLabelNeedles,
  findClickableElementByText,
  readMetricNumber,
  sleep,
} from './interaction-helpers.js';
import {
  focusElement,
} from './dom-helpers.js';

function setElementValue(_element: Element, _value: string) {
  throw new Error('X read API does not support element mutation');
}

function pressKey(_element: Element | undefined, _key: string) {
  throw new Error('X read API does not support keyboard input');
}

export function createXReadApi() {
  const xSiteApi = createXSiteApi({
    sleep,
    focusElement,
    setElementValue,
    pressKey,
    readMetricNumber,
    findClickableElementByText,
    findButtonByLabelNeedles,
  });

  return {
    collectXSearchPosts: (limit = 10) => xSiteApi.collectXSearchPosts(limit),
    collectXTimelinePosts: (timelineType: 'for-you' | 'following', limit = 10) =>
      xSiteApi.collectXTimelinePosts(timelineType, limit),
    collectXNotifications: (limit = 10) => xSiteApi.collectXNotifications(limit),
    collectXProfile: (limit = 5) => xSiteApi.collectXProfile(limit),
    collectXThread: (limit = 10, postUrl?: string) => xSiteApi.collectXThread(limit, postUrl),
    collectSingleXPost: (postUrl?: string) => xSiteApi.collectSingleXPost(postUrl),
  };
}
