"""
Custom exceptions for Sidofun Desktop Python client.
"""


class SidofunDesktopError(Exception):
    """Base exception for all Sidofun Desktop errors."""
    pass


class ProcessError(SidofunDesktopError):
    """Raised when the Bun subprocess fails to start or dies unexpectedly."""
    pass


class ParseError(SidofunDesktopError):
    """Raised when request/response parsing fails."""
    pass


class InvalidActionError(SidofunDesktopError):
    """Raised when an invalid action is requested."""
    pass


class InvalidParamsError(SidofunDesktopError):
    """Raised when invalid parameters are provided."""
    pass


class ActionFailedError(SidofunDesktopError):
    """Raised when an action execution fails."""
    pass


class SessionNotFoundError(SidofunDesktopError):
    """Raised when a CMD session is not found."""
    pass


class SpawnFailedError(SidofunDesktopError):
    """Raised when CMD spawn fails."""
    pass


class ExecFailedError(SidofunDesktopError):
    """Raised when CMD command execution fails."""
    pass


class TypeFailedError(SidofunDesktopError):
    """Raised when CMD type fails."""
    pass


class PressFailedError(SidofunDesktopError):
    """Raised when CMD key press fails."""
    pass


class ScreenshotFailedError(SidofunDesktopError):
    """Raised when screenshot capture fails."""
    pass


class BreakFailedError(SidofunDesktopError):
    """Raised when CMD break signal fails."""
    pass


class CloseFailedError(SidofunDesktopError):
    """Raised when CMD close fails."""
    pass


class TimeoutError(SidofunDesktopError):
    """Raised when an operation times out."""
    pass


class InternalError(SidofunDesktopError):
    """Raised when an internal server error occurs."""
    pass


# Error code mapping
ERROR_CODE_MAP = {
    'PARSE_ERROR': ParseError,
    'INVALID_ACTION': InvalidActionError,
    'INVALID_PARAMS': InvalidParamsError,
    'ACTION_FAILED': ActionFailedError,
    'SPAWN_FAILED': SpawnFailedError,
    'SESSION_NOT_FOUND': SessionNotFoundError,
    'EXEC_FAILED': ExecFailedError,
    'TYPE_FAILED': TypeFailedError,
    'PRESS_FAILED': PressFailedError,
    'SCREENSHOT_FAILED': ScreenshotFailedError,
    'BREAK_FAILED': BreakFailedError,
    'CLOSE_FAILED': CloseFailedError,
    'TIMEOUT': TimeoutError,
    'INTERNAL_ERROR': InternalError,
}


def raise_error_from_response(error: dict) -> None:
    """
    Raise an appropriate exception based on error response.

    Args:
        error: Error dict with 'code', 'message', and optional 'details'

    Raises:
        Appropriate SidofunDesktopError subclass
    """
    code = error.get('code', 'INTERNAL_ERROR')
    message = error.get('message', 'Unknown error')
    details = error.get('details')

    exception_class = ERROR_CODE_MAP.get(code, SidofunDesktopError)

    if details:
        raise exception_class(f"{message}: {details}")
    else:
        raise exception_class(message)
