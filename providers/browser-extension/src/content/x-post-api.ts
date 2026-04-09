import type { XSiteDeps } from './x-types.js';
import { normalizeXUrl } from './x-types.js';

export function createXPostApi(deps: XSiteDeps) {
  function collectXSearchPosts(limit = 10) {
    const articles = Array.from(document.querySelectorAll('article[data-testid="tweet"]')).slice(0, limit);
    return articles.map((article, index) => {
      const permalink = article.querySelector<HTMLAnchorElement>('a[href*="/status/"]');
      const time = article.querySelector<HTMLTimeElement>('time');
      const handleLink = Array.from(article.querySelectorAll<HTMLAnchorElement>('a[href^="/"]'))
        .find((link) => /^\/[A-Za-z0-9_]{1,15}$/.test(new URL(link.href, location.origin).pathname));
      const authorHandle = handleLink?.pathname?.replace(/^\//, '');
      const authorName = handleLink?.textContent?.trim()
        || article.querySelector<HTMLElement>('[data-testid="User-Name"] span')?.textContent?.trim()
        || undefined;
      const text = Array.from(article.querySelectorAll<HTMLElement>('[data-testid="tweetText"]'))
        .map((node) => node.innerText.trim())
        .filter(Boolean)
        .join('\n\n');
      const metricElements = Array.from(article.querySelectorAll<HTMLElement>('[role="group"] [data-testid]'));
      const readMetric = (testId: string) => {
        const target = metricElements.find((node) => node.dataset.testid === testId);
        return deps.readMetricNumber(target?.textContent?.trim());
      };
      const viewMetric = Array.from(article.querySelectorAll<HTMLElement>('a[aria-label*="View"], a[href*="/analytics"] span'))
        .map((node) => node.textContent?.trim())
        .find((value) => Boolean(value));

      return {
        id: permalink?.href || `tweet_${index}`,
        url: permalink?.href,
        authorName,
        authorHandle,
        text,
        timestamp: time?.dateTime,
        replyCount: readMetric('reply'),
        repostCount: readMetric('retweet'),
        likeCount: readMetric('like'),
        viewCount: viewMetric
      };
    }).filter((entry) => entry.text.length > 0 || entry.url);
  }

  async function collectXTimelinePosts(timelineType: 'for-you' | 'following', limit = 10) {
    if (timelineType === 'following') {
      const followingTab = deps.findClickableElementByText('Following');
      if (!followingTab) {
        throw new Error('X Following timeline tab was not found');
      }
      deps.focusElement(followingTab);
      followingTab.click();
      await deps.sleep(1200);
    }
    return collectXSearchPosts(limit);
  }

  function findXComposer() {
    return document.querySelector(
      'div[data-testid="tweetTextarea_0"][contenteditable="true"], div[role="textbox"][data-testid="tweetTextarea_0"], div[contenteditable="true"][aria-label*="Post"], div[contenteditable="true"][aria-label*="What is happening"], [data-testid="tweetTextarea_0"]'
    );
  }

  function sendXPost(text: string) {
    const composer = findXComposer();
    if (!composer) {
      throw new Error('X post composer was not found');
    }
    deps.setElementValue(composer, text);
    const submitButton = document.querySelector<HTMLElement>(
      '[data-testid="tweetButtonInline"], [data-testid="tweetButton"], button[aria-label="Post"], button[aria-label*="Post"]'
    );
    if (!submitButton || submitButton.hasAttribute('disabled')) {
      throw new Error('X post submit button was not available');
    }
    submitButton.click();
  }

  function findXPostArticle(postUrl?: string) {
    const normalizedUrl = normalizeXUrl(postUrl);
    const articles = Array.from(document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]'));
    if (!normalizedUrl) {
      return articles[0];
    }
    return articles.find((article) =>
      Array.from(article.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]'))
        .some((anchor) => normalizeXUrl(anchor.href) === normalizedUrl)
    ) ?? articles[0];
  }

  function collectSingleXPost(postUrl?: string) {
    const article = findXPostArticle(postUrl);
    if (!article) {
      return undefined;
    }
    return collectXSearchPosts(20).find((entry) => !postUrl || normalizeXUrl(entry.url) === normalizeXUrl(postUrl))
      ?? collectXSearchPosts(1)[0];
  }

  function findXReplyComposer() {
    return document.querySelector(
      '[data-testid="tweetTextarea_0"][contenteditable="true"], [data-testid="tweetTextarea_1"][contenteditable="true"], div[role="textbox"][contenteditable="true"], div[data-testid="tweetTextarea_0"], div[data-testid="tweetTextarea_1"]'
    );
  }

  function sendXReply(text: string, postUrl?: string) {
    const article = findXPostArticle(postUrl);
    if (!article) {
      throw new Error('X target post was not found for reply');
    }
    const replyButton = article.querySelector<HTMLElement>('[data-testid="reply"], button[aria-label*="Reply"]');
    if (replyButton) {
      deps.focusElement(replyButton);
      replyButton.click();
    }
    const composer = findXReplyComposer() ?? findXComposer();
    if (!composer) {
      throw new Error('X reply composer was not found');
    }
    deps.setElementValue(composer, text);
    const submitButton = document.querySelector<HTMLElement>(
      '[data-testid="tweetButton"], [data-testid="tweetButtonInline"], button[aria-label="Reply"], button[aria-label*="Reply"], button[aria-label="Post"], button[aria-label*="Post"]'
    );
    if (!submitButton || submitButton.hasAttribute('disabled')) {
      throw new Error('X reply submit button was not available');
    }
    submitButton.click();
  }

  function likeXPost(postUrl?: string) {
    const article = findXPostArticle(postUrl);
    if (!article) {
      throw new Error('X target post was not found for like');
    }
    const button = article.querySelector<HTMLElement>('[data-testid="like"], button[aria-label*="Like"]');
    if (!button) {
      throw new Error('X like button was not found');
    }
    deps.focusElement(button);
    button.click();
  }

  async function repostXPost(postUrl?: string) {
    const article = findXPostArticle(postUrl);
    if (!article) {
      throw new Error('X target post was not found for repost');
    }
    const button = article.querySelector<HTMLElement>('[data-testid="retweet"], button[aria-label*="Repost"], button[aria-label*="Retweet"]');
    if (!button) {
      throw new Error('X repost button was not found');
    }
    deps.focusElement(button);
    button.click();
    await deps.sleep(250);
    const confirmButton = document.querySelector<HTMLElement>(
      '[data-testid="retweetConfirm"], [data-testid="repostConfirm"], [role="menuitem"][data-testid="retweetConfirm"], [role="menuitem"]'
    ) ?? deps.findButtonByLabelNeedles(['repost', 'retweet']);
    if (!confirmButton) {
      throw new Error('X repost confirmation control was not found');
    }
    deps.focusElement(confirmButton);
    confirmButton.click();
  }

  function collectXThread(limit = 10, postUrl?: string) {
    const normalized = normalizeXUrl(postUrl);
    const posts = collectXSearchPosts(Math.max(1, limit));
    if (!normalized) {
      return posts;
    }
    const rootIndex = posts.findIndex((post) => normalizeXUrl(post.url) === normalized);
    if (rootIndex <= 0) {
      return posts;
    }
    return [posts[rootIndex]!, ...posts.slice(0, rootIndex), ...posts.slice(rootIndex + 1)];
  }

  return {
    collectXSearchPosts,
    collectXTimelinePosts,
    sendXPost,
    collectSingleXPost,
    sendXReply,
    likeXPost,
    repostXPost,
    collectXThread,
  };
}
