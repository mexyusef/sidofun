export const HF_PAPERS_PYTHON_SCRIPT = String.raw`
import json
import sys
from datetime import datetime

from huggingface_hub import HfApi
import huggingface_hub


def iso(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def user_to_dict(user):
    if user is None:
        return None
    return {
        "username": getattr(user, "username", None),
        "fullname": getattr(user, "fullname", None),
        "avatar_url": getattr(user, "avatar_url", None),
        "is_pro": getattr(user, "is_pro", None),
        "orgs": [
            {
                "name": getattr(org, "name", None),
                "fullname": getattr(org, "fullname", None),
            }
            for org in (getattr(user, "orgs", None) or [])
        ],
    }


def organization_to_dict(org):
    if org is None:
        return None
    return {
        "name": getattr(org, "name", None),
        "fullname": getattr(org, "fullname", None),
        "avatar_url": getattr(org, "avatar_url", None),
    }


def author_to_dict(author):
    return {
        "name": getattr(author, "name", None),
        "hidden": getattr(author, "hidden", None),
        "status": getattr(author, "status", None),
        "status_last_changed_at": iso(getattr(author, "status_last_changed_at", None)),
        "user": user_to_dict(getattr(author, "user", None)),
    }


def paper_to_dict(paper):
    return {
        "id": getattr(paper, "id", None),
        "authors": [author_to_dict(author) for author in (getattr(paper, "authors", None) or [])],
        "published_at": iso(getattr(paper, "published_at", None)),
        "title": getattr(paper, "title", None),
        "summary": getattr(paper, "summary", None),
        "upvotes": getattr(paper, "upvotes", None),
        "discussion_id": getattr(paper, "discussion_id", None),
        "source": getattr(paper, "source", None),
        "comments": getattr(paper, "comments", None),
        "submitted_at": iso(getattr(paper, "submitted_at", None)),
        "submitted_by": user_to_dict(getattr(paper, "submitted_by", None)),
        "ai_summary": getattr(paper, "ai_summary", None),
        "ai_keywords": getattr(paper, "ai_keywords", None),
        "organization": organization_to_dict(getattr(paper, "organization", None)),
        "project_page": getattr(paper, "project_page", None),
        "github_repo": getattr(paper, "github_repo", None),
        "github_stars": getattr(paper, "github_stars", None),
    }


def main():
    payload = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    action = payload.get("action")
    token = payload.get("token")
    api = HfApi(token=token)

    if action == "status":
        methods = [name for name in dir(api) if "paper" in name.lower()]
        print(
            json.dumps(
                {
                    "ok": True,
                    "packageVersion": getattr(huggingface_hub, "__version__", None),
                    "methods": methods,
                }
            )
        )
        return

    if action == "search":
        papers = [paper_to_dict(item) for item in api.list_papers(query=payload.get("query"), limit=payload.get("limit"), token=token)]
        print(json.dumps({"ok": True, "papers": papers}))
        return

    if action == "info":
        paper = api.paper_info(payload["paperId"])
        print(json.dumps({"ok": True, "paper": paper_to_dict(paper)}))
        return

    if action == "read":
        markdown = api.read_paper(payload["paperId"])
        print(json.dumps({"ok": True, "id": payload["paperId"], "markdown": markdown}))
        return

    if action == "list_daily":
        papers = [
            paper_to_dict(item)
            for item in api.list_daily_papers(
                date=payload.get("date"),
                week=payload.get("week"),
                month=payload.get("month"),
                submitter=payload.get("submitter"),
                sort=payload.get("sort"),
                limit=payload.get("limit"),
            )
        ]
        print(json.dumps({"ok": True, "papers": papers}))
        return

    raise ValueError(f"Unsupported action: {action}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        sys.exit(1)
`;
