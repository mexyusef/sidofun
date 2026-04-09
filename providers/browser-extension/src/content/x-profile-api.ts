import type { XSiteDeps } from './x-types.js';

interface XPostApiLike {
  collectXSearchPosts: (limit?: number) => any[];
}

export function createXProfileApi(deps: XSiteDeps, postApi: XPostApiLike) {
  function collectXProfile(limit = 5) {
    const header = document.querySelector<HTMLElement>('main [data-testid="UserName"], main section [data-testid="UserName"]')
      ?? document.querySelector<HTMLElement>('main header');
    const name = header?.querySelector<HTMLElement>('span')?.innerText?.trim()
      || document.querySelector<HTMLElement>('main h2')?.innerText?.trim()
      || undefined;
    const handleNode = Array.from(document.querySelectorAll<HTMLElement>('main a, main span'))
      .find((node) => node.innerText.trim().startsWith('@'));
    const handle = handleNode?.innerText.trim().replace(/^@/, '') || undefined;
    const bio = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="UserDescription"], main div'))
      .map((node) => node.innerText.trim())
      .find((text) => Boolean(text) && !text.startsWith('@') && text.length > 10);
    const followLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href$="/followers"], a[href$="/verified_followers"], a[href$="/following"]'));
    const followerLink = followLinks.find((link) => /followers/.test(link.href) && !/verified_followers/.test(link.href));
    const followingLink = followLinks.find((link) => /following/.test(link.href));
    const followerCount = deps.readMetricNumber(followerLink?.innerText.split('\n')[0]?.trim() || followerLink?.textContent?.trim());
    const followingCount = deps.readMetricNumber(followingLink?.innerText.split('\n')[0]?.trim() || followingLink?.textContent?.trim());
    const verified = Boolean(document.querySelector('[data-testid="icon-verified"], svg[aria-label*="Verified"]'));

    return {
      handle,
      url: location.href,
      name,
      bio: bio || undefined,
      followerCount,
      followingCount,
      verified,
      posts: postApi.collectXSearchPosts(Math.max(1, limit))
    };
  }

  function collectXNotifications(limit = 10) {
    return postApi.collectXSearchPosts(Math.max(1, limit));
  }

  function followXProfile() {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], a'));
    const followButton = buttons.find((node) => {
      const label = [
        node.innerText,
        node.getAttribute('aria-label'),
        node.getAttribute('title'),
        node.getAttribute('data-testid')
      ].filter(Boolean).join(' ').trim().toLowerCase();
      return label.includes('follow')
        && !label.includes('following')
        && !label.includes('unfollow')
        && !label.includes('followed');
    });
    if (!followButton) {
      const alreadyFollowing = buttons.find((node) => {
        const label = [
          node.innerText,
          node.getAttribute('aria-label'),
          node.getAttribute('title'),
          node.getAttribute('data-testid')
        ].filter(Boolean).join(' ').trim().toLowerCase();
        return label.includes('following') || label.includes('unfollow') || label.includes('followed');
      });
      return {
        followed: false,
        alreadyFollowing: Boolean(alreadyFollowing),
        buttonLabel: alreadyFollowing?.innerText?.trim() || alreadyFollowing?.getAttribute('aria-label') || undefined
      };
    }
    deps.focusElement(followButton);
    followButton.click();
    return {
      followed: true,
      alreadyFollowing: false,
      buttonLabel: followButton.innerText?.trim() || followButton.getAttribute('aria-label') || undefined
    };
  }

  return {
    collectXProfile,
    collectXNotifications,
    followXProfile,
  };
}
