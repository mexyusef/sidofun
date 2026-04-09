param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$PytestArgs
)

$ErrorActionPreference = "Stop"
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD = "1"

if (-not $PytestArgs -or $PytestArgs.Count -eq 0) {
    $PytestArgs = @("python/tests")
}

python -m pytest @PytestArgs
